/* ==========================================================================
   pdf-to-excel.js — Extract PDF text and save as .csv (or .tsv)
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

  async function extractLines() {
    const pdfjs = await window.loadPdfJs();
    const buf = await window.readFileBuffer(currentFile);
    pdfjsDoc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
    const allRows = [];
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const content = await page.getTextContent();
      // Group by y-coordinate into lines (use actual text width from PDF)
      const items = content.items.map(it => ({
        str: it.str,
        x: it.transform[4],
        y: Math.round(it.transform[5]),
        w: (typeof it.width === 'number' && it.width > 0) ? it.width : (it.str.length * 10),
      })).filter(it => it.str.trim());

      // Cluster items into lines
      const sortedByY = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      let curY = null;
      let curLine = [];
      for (const it of sortedByY) {
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

      window.setProgress('#progress', Math.round((i / pdfjsDoc.numPages) * 80), `Extracting page ${i}/${pdfjsDoc.numPages}`);

      const mode = document.querySelector('input[name="mode"]:checked').value;
      if (mode === 'lines') {
        // Each PDF line → ONE row with all text concatenated into a single cell.
        // Smart spacing: insert a space when the visual gap between items is
        // larger than ~30% of the previous item's width, with a 4px floor.
        //   - CJK characters touching/overlapping (gap ≈ 0–5px): no space
        //   - English word boundaries (gap > char width): space added
        //   - Mixed CJK↔English transitions: no spurious space
        // Fixes the previous bug where 8px tolerance split every CJK character
        // into its own column, producing dozens of unusable cells per row.
        for (const line of lines) {
          let text = '';
          let prevEnd = null;
          let prevW = 0;
          for (const it of line) {
            if (prevEnd !== null) {
              const gap = it.x - prevEnd;
              const thresh = Math.max(4, prevW * 0.3);
              if (gap > thresh) text += ' ';
            }
            text += it.str;
            prevEnd = it.x + it.w;
            prevW = it.w;
          }
          const trimmed = text.trim();
          if (trimmed) allRows.push([trimmed]);
        }
      } else {
        // Block grouping: cluster lines into blocks by vertical gap
        const blocks = [];
        let curBlock = [];
        let prevY = null;
        for (const line of lines) {
          const y = line[0].y;
          if (prevY !== null && (prevY - y) > 12) {
            if (curBlock.length) blocks.push(curBlock);
            curBlock = [];
          }
          curBlock.push(line);
          prevY = y;
        }
        if (curBlock.length) blocks.push(curBlock);

        for (const block of blocks) {
          // Determine column anchors via clustering (not fixed bucketing).
          // Cluster x positions that are within 25px of each other; this keeps
          // adjacent CJK characters in the same column instead of treating
          // them as separate anchors (which produced extra phantom columns
          // like "张三" becoming two cells).
          const allX = [];
          for (const line of block) for (const it of line) allX.push(it.x);
          allX.sort((a, b) => a - b);
          const colAnchors = [];
          let clusterStart = allX[0];
          let clusterEnd = allX[0];
          let clusterCount = 1;
          for (let i = 1; i < allX.length; i++) {
            if (allX[i] - clusterEnd <= 25) {
              clusterEnd = allX[i];
              clusterCount++;
            } else {
              colAnchors.push(clusterStart + (clusterEnd - clusterStart) / 2);
              clusterStart = allX[i];
              clusterEnd = allX[i];
              clusterCount = 1;
            }
          }
          colAnchors.push(clusterStart + (clusterEnd - clusterStart) / 2);
          for (const line of block) {
            // Within a column, concatenate items into one cell. Same adaptive
            // spacing logic as "lines" mode (CJK chars touch, English words have gaps).
            const row = colAnchors.map(anchor => {
              const cellItems = line.filter(it => Math.abs(it.x - anchor) < 30)
                                   .sort((a, b) => a.x - b.x);
              if (!cellItems.length) return '';
              let cellText = '';
              let cellPrevEnd = null;
              let cellPrevW = 0;
              for (const it of cellItems) {
                if (cellPrevEnd !== null) {
                  const gap = it.x - cellPrevEnd;
                  const thresh = Math.max(4, cellPrevW * 0.3);
                  if (gap > thresh) cellText += ' ';
                }
                cellText += it.str;
                cellPrevEnd = it.x + it.w;
                cellPrevW = it.w;
              }
              return cellText;
            });
            allRows.push(row);
          }
        }
      }
      // Page separator
      allRows.push([]);
    }
    return allRows.filter(r => r.length && r.some(c => c && c.trim()));
  }

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Converting…';
    document.getElementById('result').classList.remove('active');
    try {
      const fmt = document.querySelector('input[name="format"]:checked').value;
      const rows = await extractLines();
      const delim = fmt === 'tsv' ? '\t' : ',';
      const csv = rowsToCsv(rows, delim);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      window.setProgress('#progress', 100, 'Done');
      window.showResult('#result', `
        <h4>✅ Extracted ${rows.length} rows</h4>
        <div class="result-meta">${window.fmtSize(blob.size)}</div>
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
