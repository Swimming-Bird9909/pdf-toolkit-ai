/* ==========================================================================
   remove-pages.js — Visual page picker, keep or delete pages
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  let pdfjsDoc = null;
  let thumbs = [];
  let keepSet = new Set();
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="field">
      <label>Action</label>
      <select id="action">
        <option value="keep" selected>Keep selected pages</option>
        <option value="remove">Remove selected pages</option>
      </select>
    </div>
    <p class="soft" style="font-size:13px;">💡 Click thumbnails to toggle. Selection highlighted in brand color.</p>
  `;

  window.initDropzone('#dz', async (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
    await renderThumbs();
  });

  async function renderThumbs() {
    const pdfjs = await window.loadPdfJs();
    const buf = await window.readFileBuffer(currentFile);
    pdfjsDoc = await pdfjs.getDocument({ data: buf }).promise;
    thumbs = [];
    keepSet = new Set(Array.from({ length: pdfjsDoc.numPages }, (_, i) => i + 1));
    const grid = document.createElement('div');
    grid.className = 'preview-grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const vp = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      const wrap = document.createElement('div');
      wrap.className = 'thumb';
      wrap.style.position = 'relative';
      wrap.style.cursor = 'pointer';
      wrap.style.border = '2px solid var(--brand)';
      wrap.innerHTML = `
        <div style="position:absolute;top:4px;left:4px;background:var(--brand);color:#fff;font-size:11px;padding:2px 7px;border-radius:6px;font-weight:600;">p${i}</div>
      `;
      wrap.appendChild(canvas);
      wrap.addEventListener('click', () => {
        if (keepSet.has(i)) keepSet.delete(i); else keepSet.add(i);
        wrap.style.border = keepSet.has(i) ? '2px solid var(--brand)' : '2px solid var(--border)';
        wrap.style.opacity = keepSet.has(i) ? '1' : '0.4';
      });
      grid.appendChild(wrap);
      thumbs.push(wrap);
    }
    const fileList = document.getElementById('fileList');
    fileList.appendChild(grid);
  }

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '🗑️ Save modified PDF';

  btn.addEventListener('click', async () => {
    if (!currentFile || !pdfjsDoc) return;
    const action = document.getElementById('action').value;
    const total = pdfjsDoc.numPages;
    let toKeep;
    if (action === 'keep') toKeep = [...keepSet].sort((a, b) => a - b);
    else toKeep = Array.from({ length: total }, (_, i) => i + 1).filter(p => !keepSet.has(p));

    if (toKeep.length === 0) {
      alert('You must keep at least one page.');
      return;
    }
    if (toKeep.length === total) {
      alert('Nothing to change — all pages selected.');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Saving…';
    document.getElementById('result').classList.remove('active');
    try {
      const { PDFDocument } = await window.loadPdfLib();
      const buf = await window.readFileBuffer(currentFile);
      const src = await PDFDocument.load(buf);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, toKeep.map(p => p - 1));
      pages.forEach(p => out.addPage(p));
      const bytes = await out.save();
      window.setProgress('#progress', 100, 'Done');
      window.showResult('#result', `
        <h4>✅ Saved ${out.getPageCount()} pages</h4>
        <div class="result-meta">${window.fmtSize(bytes.byteLength)} (was ${window.fmtSize(buf.byteLength)})</div>
        <button class="btn btn-primary" id="dlBtn">⬇ Download</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(bytes, currentFile.name.replace(/\.pdf$/i, '') + '_modified.pdf', 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🗑️ Save modified PDF';
    }
  });
})();