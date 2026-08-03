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
      // Group by y-coordinate into lines
      const items = content.items.map(it => ({
        str: it.str,
        x: it.transform[4],
        y: Math.round(it.transform[5]),
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
        // Each line becomes a row; columns derived from x-clustering
        for (const line of lines) {
          if (line.length === 1) {
            allRows.push([line[0].str]);
          } else {
            // Cluster x positions into columns
            const cols = [];
            for (const it of line) {
              const last = cols[cols.length - 1];
              if (last && Math.abs(it.x - last.xMax) < 8) {
                last.items.push(it);
                last.xMax = Math.max(last.xMax, it.x + it.str.length * 4);
              } else {
                cols.push({ xMin: it.x, xMax: it.x + it.str.length * 4, items: [it] });
              }
            }
            cols.forEach(c => c.items.sort((a, b) => a.x - b.x));
            const row = cols.map(c => c.items.map(it => it.str).join(' ').trim());
            allRows.push(row);
          }
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
          // Determine column anchors from the densest line
          const xCount = new Map();
          for (const line of block) {
            for (const it of line) {
              const bucket = Math.round(it.x / 20) * 20;
              xCount.set(bucket, (xCount.get(bucket) || 0) + 1);
            }
          }
          const colAnchors = [...xCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]).sort((a, b) => a - b);
          for (const line of block) {
            const row = colAnchors.map(anchor => {
              const cell = line.find(it => Math.abs(it.x - anchor) < 30);
              return cell ? cell.str : '';
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
