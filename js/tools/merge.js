/* ==========================================================================
   merge.js — Merge multiple PDFs, drag to reorder
   ========================================================================== */
(function () {
  'use strict';

  let currentFiles = [];
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="field">
      <label>Output filename</label>
      <input type="text" id="outName" value="merged.pdf" />
    </div>
    <p class="soft" style="font-size:13px;">💡 Drag the ⠿ handle to reorder. No watermark will be added.</p>
  `;

  window.initDropzone('#dz', (files) => {
    currentFiles = Array.from(files).filter(f => /\.pdf$/i.test(f.name));
    renderList();
    btn.disabled = currentFiles.length === 0;
  });

  function renderList() {
    const c = document.getElementById('fileList');
    c.innerHTML = '';
    currentFiles.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.draggable = true;
      row.dataset.i = i;
      row.innerHTML = `
        <span style="cursor:grab;">⠿</span>
        <span class="name">${f.name}</span>
        <span class="size">${window.fmtSize(f.size)}</span>
        <button class="x" data-i="${i}">×</button>
      `;
      row.querySelector('.x').addEventListener('click', (e) => {
        currentFiles.splice(parseInt(e.target.dataset.i, 10), 1);
        renderList();
        btn.disabled = currentFiles.length === 0;
      });
      // drag reorder
      row.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(i)));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to = parseInt(row.dataset.i, 10);
        if (from === to) return;
        const [moved] = currentFiles.splice(from, 1);
        currentFiles.splice(to, 0, moved);
        renderList();
      });
      c.appendChild(row);
    });
  }

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '🧩 Merge PDFs';

  btn.addEventListener('click', async () => {
    if (currentFiles.length === 0) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Merging…';
    document.getElementById('result').classList.remove('active');
    try {
      const { PDFDocument } = await window.loadPdfLib();
      const out = await PDFDocument.create();
      for (let i = 0; i < currentFiles.length; i++) {
        window.setProgress('#progress', (i / currentFiles.length) * 100, `Adding file ${i+1}/${currentFiles.length}…`);
        const buf = await window.readFileBuffer(currentFiles[i]);
        const src = await PDFDocument.load(buf);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(p => out.addPage(p));
      }
      const bytes = await out.save();
      window.setProgress('#progress', 100, 'Done');
      const filename = document.getElementById('outName').value || 'merged.pdf';
      window.showResult('#result', `
        <h4>✅ Merged ${currentFiles.length} file(s)</h4>
        <div class="result-meta">${window.fmtSize(bytes.byteLength)} · ${out.getPageCount()} pages</div>
        <button class="btn btn-primary" id="dlBtn">⬇ Download ${filename}</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(bytes, filename, 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🧩 Merge PDFs';
    }
  });
})();