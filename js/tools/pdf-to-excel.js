/* ==========================================================================
   pdf-to-excel.js — Extract PDF text and save as .csv (or .tsv)
   Three modes:
     • auto   — detect table vs. flowing text and pick the best strategy
     • lines  — each PDF line → one row, single cell (best for articles / CJK)
     • blocks — group lines into rows + detect columns by x-frequency
                (best for actual tables with aligned columns)
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  let pdfjsDoc = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  window.initDropzone('#dz', async (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());

  /* ---------- CSV helpers ---------- */
  function csvEscape(val, delim) {
    if (val == null) return '';
    const s = String(val);
    if (s.includes(delim) || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }
  function rowsToCsv(rows, delim) {
    return rows.map(row => row.map(c => csvEscape(c, delim)).join(delim)).join('\n');
  }

  /* ---------- Item extraction + line grouping ----------
     Reads pdf.js text items with x/y/width, then groups into lines by y. */
  function readItems(page) {
    return page.getTextContent().then(content => content.items.map(it => {
      const w = (typeof it.width === 'number' && it.width > 0) ? it.width
              : (it.str.length ? it.str.length * (isCjk(it.str.charAt(0)) ? 14 : 7) : 7);
      return {
        str: it.str,
        x: it.transform[4],
        y: Math.round(it.transform[5]),
        w
      };
    }).filter(it => it.str && it.str.trim()));
  }
  // Heuristic: a character is CJK if it's in the CJK Unified Ideographs / Extension blocks
  // (CJK glyphs are roughly twice as wide as Latin glyphs at the same pt size).
  function isCjk(ch) {
    if (!ch) return false;
    const c = ch.codePointAt(0);
    return (c >= 0x4E00 && c <= 0x9FFF)   // CJK Unified Ideographs
        || (c >= 0x3400 && c <= 0x4DBF)   // CJK Extension A
        || (c >= 0x3040 && c <= 0x30FF)   // Hiragana + Katakana
        || (c >= 0xAC00 && c <= 0xD7AF);  // Hangul
  }

  function groupIntoLines(items) {
    // Sort top-to-bottom, then left-to-right within a line
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    let curY = null;
    let curLine = [];
    for (const it of sorted) {
      if (curY !== null && Math.abs(it.y - curY) > 2) {
        curLine.sort((a, b) => a.x - b.x);
        lines.push(curLine);
        curLine = [];
      }
      curLine.push(it);
      curY = it.y;
    }
    if (curLine.length) {
      curLine.sort((a, b) => a.x - b.x);
      lines.push(curLine);
    }
    return lines;
  }

  /* ---------- Smart spacing concat ----------
     Concatenate items in a line/cell. Insert a space when the visual gap
     exceeds ~30 % of the previous item's width (with a 4 px floor).
       - CJK chars touching/overlapping (gap ≈ 0–5 px): no space
       - English word boundaries (gap > char width): space added
       - CJK ↔ English transition: no spurious space */
  function joinWithSmartSpacing(items) {
    let text = '';
    let prevEnd = null;
    let prevW = 0;
    for (const it of items) {
      if (prevEnd !== null) {
        const gap = it.x - prevEnd;
        const thresh = Math.max(4, prevW * 0.3);
        if (gap > thresh) text += ' ';
      }
      text += it.str;
      prevEnd = it.x + it.w;
      prevW = it.w;
    }
    return text.trim();
  }

  /* ---------- Plain text mode ----------
     Each PDF line → one CSV row with the entire line in a single cell.
     Adds an empty row when there's a paragraph break (vertical gap > 1.5 lines). */
  function plainTextMode(lines) {
    const rows = [];
    if (!lines.length) return rows;
    rows.push([joinWithSmartSpacing(lines[0])]);
    for (let i = 1; i < lines.length; i++) {
      const gap = lines[i - 1][0].y - lines[i][0].y;
      // Insert a blank row on paragraph break (taller than 1.5 line heights ≈ > 24 px)
      if (gap > 24) rows.push(['']);
      rows.push([joinWithSmartSpacing(lines[i])]);
    }
    return rows.filter(r => r.some(c => c && c.trim()));
  }

  /* ---------- Block grouping mode ----------
     1. Cluster lines into "blocks" by vertical proximity (> 12 px gap = new block).
     2. For each block, find the dominant x-positions that appear as item starts in
        ≥ 30 % of lines → real column anchors (filters out character-level noise).
     3. Assign each item to the nearest anchor (50 px tolerance).
     4. Concatenate items per cell with smart spacing. */
  function blockMode(lines) {
    if (!lines.length) return [];
    // 1. Cluster lines into blocks
    const blocks = [];
    let cur = [lines[0]];
    for (let i = 1; i < lines.length; i++) {
      const gap = lines[i - 1][0].y - lines[i][0].y;
      if (gap > 12) {
        blocks.push(cur);
        cur = [lines[i]];
      } else {
        cur.push(lines[i]);
      }
    }
    blocks.push(cur);

    const allRows = [];
    for (const block of blocks) {
      if (block.length === 1) {
        // Single-line block — just emit as one cell
        allRows.push([joinWithSmartSpacing(block[0])]);
        continue;
      }
      const anchors = detectColumnAnchors(block);
      if (anchors.length < 2) {
        // No clear column structure — emit each line as one cell (avoid fragmenting)
        for (const line of block) allRows.push([joinWithSmartSpacing(line)]);
        continue;
      }
      for (const line of block) {
        allRows.push(assignToColumns(line, anchors));
      }
    }
    // Drop fully-empty rows, trim trailing empty cells
    return allRows
      .map(r => {
        let end = r.length;
        while (end && !r[end - 1]) end--;
        return r.slice(0, end);
      })
      .filter(r => r.length && r.some(c => c && c.trim()));
  }

  // Find x-positions that appear as item-starts in >= 30 % of block lines.
  // Bucketed to 10 px so character-level jitter doesn't create phantom anchors.
  function detectColumnAnchors(block) {
    const lineCount = block.length;
    // For each line, which 10-px x-buckets contain an item start?
    const bucketLines = new Map(); // bucket -> set of line indices
    for (let i = 0; i < lineCount; i++) {
      const seen = new Set();
      for (const it of block[i]) seen.add(Math.round(it.x / 10) * 10);
      for (const b of seen) {
        if (!bucketLines.has(b)) bucketLines.set(b, []);
        bucketLines.get(b).push(i);
      }
    }
    const threshold = Math.max(2, Math.ceil(lineCount * 0.3));
    const significant = [];
    for (const [bucket, lines] of bucketLines) {
      if (lines.length >= threshold) significant.push(bucket);
    }
    significant.sort((a, b) => a - b);

    // Merge buckets that are within 25 px of each other
    const merged = [];
    for (const x of significant) {
      const last = merged[merged.length - 1];
      if (last != null && x - last <= 25) {
        // keep the one that appears in more lines (already filtered, so either works)
      } else {
        merged.push(x);
      }
    }
    return merged;
  }

  // For a single line, assign each item to the nearest anchor and concatenate.
  function assignToColumns(line, anchors, tolerance = 50) {
    const cells = anchors.map(() => []);
    for (const it of line) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < anchors.length; i++) {
        const d = Math.abs(it.x - anchors[i]);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx !== -1 && bestDist <= tolerance) cells[bestIdx].push(it);
    }
    return cells.map(items => {
      items.sort((a, b) => a.x - b.x);
      return joinWithSmartSpacing(items);
    });
  }

  /* ---------- Auto mode ----------
     Decide table vs. flowing text using simple structural heuristics:
     - Tables: ≥ 2 distinct x-anchors that each appear as an item-start in
       ≥ 30 % of the page's lines.
     - Articles / flowing text: items in each line cluster around 1 anchor
       (the left margin), or x-positions vary too much line-to-line. */
  function looksLikeTable(allPageLines) {
    if (allPageLines.length < 4) return false; // too short to decide
    // Sample the first 80 lines to keep detection fast on long docs.
    const sample = allPageLines.slice(0, 80);
    const lineCount = sample.length;
    // Bucket every item's x to 10 px; count which buckets appear in >= 30 % of lines.
    const bucketLines = new Map();
    for (const line of sample) {
      const seen = new Set();
      for (const it of line) seen.add(Math.round(it.x / 10) * 10);
      for (const b of seen) {
        if (!bucketLines.has(b)) bucketLines.set(b, 0);
        bucketLines.set(b, bucketLines.get(b) + 1);
      }
    }
    const threshold = Math.max(2, Math.ceil(lineCount * 0.3));
    const significant = [...bucketLines.entries()]
      .filter(([_, c]) => c >= threshold)
      .map(([x]) => x)
      .sort((a, b) => a - b);
    // Merge close buckets
    const merged = [];
    for (const x of significant) {
      const last = merged[merged.length - 1];
      if (last == null || x - last > 25) merged.push(x);
    }
    return merged.length >= 2;
  }

  /* ---------- Main extraction ---------- */
  async function extractRows(mode) {
    const pdfjs = await window.loadPdfJs();
    const buf = await window.readFileBuffer(currentFile);
    pdfjsDoc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
    const allRows = [];
    let detectedMode = mode;
    let pageLinesTotal = 0;

    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const items = await readItems(page);
      const lines = groupIntoLines(items);
      pageLinesTotal += lines.length;
      window.setProgress('#progress',
        Math.round((i / pdfjsDoc.numPages) * 80),
        `Extracting page ${i}/${pdfjsDoc.numPages}`);

      if (mode === 'auto' && i === 1) {
        detectedMode = looksLikeTable(lines) ? 'blocks' : 'lines';
      }

      const rows = (mode === 'auto' ? detectedMode : mode) === 'blocks'
        ? blockMode(lines)
        : plainTextMode(lines);
      for (const r of rows) allRows.push(r);
      // Page separator (only between pages, not after the last one)
      if (i < pdfjsDoc.numPages) allRows.push([]);
    }
    // Strip empty page-separator rows at the very end
    while (allRows.length && allRows[allRows.length - 1].length === 0) allRows.pop();

    return { rows: allRows, detectedMode };
  }

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Converting…';
    document.getElementById('result').classList.remove('active');
    try {
      const fmt = document.querySelector('input[name="format"]:checked').value;
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const { rows, detectedMode } = await extractRows(mode);
      const delim = fmt === 'tsv' ? '\t' : ',';
      const csv = rowsToCsv(rows, delim);
      // Prepend BOM so Excel detects UTF-8 correctly for CJK / emoji
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const baseName = currentFile.name.replace(/\.pdf$/i, '');

      // Compute column count for the user-facing summary
      const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
      const modeLabel = mode === 'auto'
        ? (detectedMode === 'blocks' ? 'Auto → Table mode' : 'Auto → Plain text mode')
        : (mode === 'blocks' ? 'Table mode' : 'Plain text mode');

      window.setProgress('#progress', 100, 'Done');
      window.showResult('#result', `
        <h4>✅ Extracted ${rows.length} rows${colCount > 1 ? ` × ${colCount} columns` : ''}</h4>
        <div class="result-meta">${window.fmtSize(blob.size)} · ${modeLabel}</div>
        <p class="soft" style="font-size:13px;">Opens in Excel, Google Sheets, Numbers, and any spreadsheet app. ${fmt === 'csv' ? 'Rename to .xlsx to open in Excel directly.' : 'Tab-separated — better for data with commas.'}</p>
        <button class="btn btn-primary" id="dlBtn">⬇ Download .${fmt}</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(blob, baseName + '.' + fmt, 'text/csv;charset=utf-8');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Convert to Excel';
    }
  });
})();