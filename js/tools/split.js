/* ==========================================================================
   split.js — Split PDF by page ranges / every N pages / extract one
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');
  const optionsEl = document.getElementById('options');

  optionsEl.innerHTML = `
    <div class="grid grid-2">
      <div class="field">
        <label>Split mode</label>
        <select id="mode">
          <option value="ranges">By page ranges (e.g. 1-3, 5, 7-9)</option>
          <option value="everyN">Every N pages</option>
          <option value="single">Extract a single page</option>
        </select>
      </div>
      <div class="field" id="rangesField">
        <label>Page ranges</label>
        <input type="text" id="ranges" placeholder="1-3, 5, 7-9" value="1-3" />
      </div>
      <div class="field" id="everyNField" style="display:none;">
        <label>Pages per file</label>
        <input type="number" id="everyN" min="1" max="999" value="1" />
      </div>
      <div class="field" id="singleField" style="display:none;">
        <label>Page number</label>
        <input type="number" id="singlePage" min="1" value="1" />
      </div>
    </div>
    <div class="field">
      <label>Output filename prefix</label>
      <input type="text" id="outName" value="split" />
    </div>
  `;

  const mode = document.getElementById('mode');
  const rangesField = document.getElementById('rangesField');
  const everyNField = document.getElementById('everyNField');
  const singleField = document.getElementById('singleField');
  const updateMode = () => {
    rangesField.style.display = mode.value === 'ranges' ? '' : 'none';
    everyNField.style.display = mode.value === 'everyN' ? '' : 'none';
    singleField.style.display = mode.value === 'single' ? '' : 'none';
  };
  mode.addEventListener('change', updateMode);

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Splitting…';
    document.getElementById('result').classList.remove('active');
    try {
      const { PDFDocument } = await window.loadPdfLib();
      const JSZip = await window.loadJSZip();
      const buf = await window.readFileBuffer(currentFile);
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const zip = new JSZip();
      const groups = computeGroups(total, mode.value);

      for (let i = 0; i < groups.length; i++) {
        window.setProgress('#progress', (i / groups.length) * 100, `Group ${i + 1}/${groups.length}…`);
        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(src, groups[i].pages.map(p => p - 1));
        pages.forEach(p => newDoc.addPage(p));
        const bytes = await newDoc.save();
        zip.file(`${document.getElementById('outName').value || 'split'}_${groups[i].label}.pdf`, bytes);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      window.setProgress('#progress', 100, 'Done');
      window.showResult('#result', `
        <h4>✅ Split complete</h4>
        <div class="result-meta">${groups.length} file(s) created from ${total} pages</div>
        <button class="btn btn-primary" id="dlBtn">⬇ Download all (ZIP)</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(zipBlob, `${document.getElementById('outName').value || 'split'}.zip`);
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✂️ Split PDF';
    }
  });

  function computeGroups(total, m) {
    if (m === 'ranges') {
      const txt = document.getElementById('ranges').value;
      const groups = [];
      txt.split(/[,;\s]+/).forEach((token, idx) => {
        if (!token) return;
        const [a, b] = token.split('-').map(x => parseInt(x, 10));
        if (!a) return;
        const start = a, end = b || a;
        const arr = [];
        for (let i = start; i <= Math.min(end, total); i++) arr.push(i);
        if (arr.length) groups.push({ label: arr.length === 1 ? `p${arr[0]}` : `p${arr[0]}-${arr[arr.length-1]}`, pages: arr });
      });
      return groups.length ? groups : [{ label: 'all', pages: Array.from({length: total}, (_,i)=>i+1) }];
    }
    if (m === 'everyN') {
      const n = Math.max(1, parseInt(document.getElementById('everyN').value, 10) || 1);
      const groups = [];
      for (let i = 0; i < total; i += n) {
        const arr = []; for (let j = i; j < Math.min(i + n, total); j++) arr.push(j + 1);
        groups.push({ label: `p${arr[0]}-${arr[arr.length-1]}`, pages: arr });
      }
      return groups;
    }
    // single
    const p = Math.max(1, Math.min(total, parseInt(document.getElementById('singlePage').value, 10) || 1));
    return [{ label: `p${p}`, pages: [p] }];
  }
})();