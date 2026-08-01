/* ==========================================================================
   pdf-to-image.js — Render every page to PNG/JPG/WebP
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="grid grid-2">
      <div class="field">
        <label>Image format</label>
        <select id="fmt">
          <option value="png">PNG (lossless)</option>
          <option value="jpeg" selected>JPG (smaller)</option>
          <option value="webp">WebP (modern)</option>
        </select>
      </div>
      <div class="field">
        <label>Resolution (DPI scale)</label>
        <select id="dpi">
          <option value="1">Standard (1x)</option>
          <option value="1.5" selected>High (1.5x)</option>
          <option value="2">Very high (2x)</option>
          <option value="3">Print quality (3x)</option>
        </select>
      </div>
      <div class="field" id="qualityField">
        <label>JPEG quality (1-100)</label>
        <input type="number" id="quality" min="10" max="100" value="85" />
      </div>
      <div class="field">
        <label>Pages</label>
        <select id="pages">
          <option value="all" selected>All pages</option>
          <option value="custom">Custom range (e.g. 1-3,5)</option>
        </select>
      </div>
      <div class="field" id="rangeField" style="display:none; grid-column:1/-1;">
        <label>Page range</label>
        <input type="text" id="range" placeholder="1-3, 5, 7-9" value="1-3" />
      </div>
    </div>
  `;

  const fmtSel = document.getElementById('fmt');
  const qualityField = document.getElementById('qualityField');
  const pagesSel = document.getElementById('pages');
  const rangeField = document.getElementById('rangeField');

  fmtSel.addEventListener('change', () => {
    qualityField.style.display = fmtSel.value === 'jpeg' ? '' : 'none';
  });
  pagesSel.addEventListener('change', () => {
    rangeField.style.display = pagesSel.value === 'custom' ? '' : 'none';
  });

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '🖼️ Convert to Images';

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Converting…';
    document.getElementById('result').classList.remove('active');
    try {
      const pdfjs = await window.loadPdfJs();
      const JSZip = await window.loadJSZip();
      const fmt = fmtSel.value;
      const mime = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = (parseInt(document.getElementById('quality').value, 10) || 85) / 100;
      const scale = parseFloat(document.getElementById('dpi').value) || 1.5;
      const buf = await window.readFileBuffer(currentFile);
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const pages = pagesSel.value === 'custom'
        ? parseRange(document.getElementById('range').value, doc.numPages)
        : Array.from({length: doc.numPages}, (_, i) => i + 1);

      const zip = new JSZip();
      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      const previews = [];

      for (let i = 0; i < pages.length; i++) {
        const pn = pages[i];
        window.setProgress('#progress', (i / pages.length) * 100, `Page ${pn}/${doc.numPages}…`);
        const page = await doc.getPage(pn);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await new Promise(res => canvas.toBlob(res, mime, quality));
        zip.file(`${baseName}_p${String(pn).padStart(3,'0')}.${fmt}`, blob);
        if (previews.length < 8) {
          const url = URL.createObjectURL(blob);
          previews.push({ url, pn });
        }
      }
      window.setProgress('#progress', 100, 'Done');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      window.showResult('#result', `
        <h4>✅ Converted ${pages.length} page(s)</h4>
        <div class="result-meta">${window.fmtSize(zipBlob.size)} · ${fmt.toUpperCase()} @ ${scale}x</div>
        <button class="btn btn-primary" id="dlBtn">⬇ Download ZIP</button>
        <div class="preview-grid" style="margin-top:18px;">
          ${previews.map(p => `<div class="thumb"><img src="${p.url}" alt="page ${p.pn}"/></div>`).join('')}
        </div>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(zipBlob, `${baseName}_images.zip`);
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🖼️ Convert to Images';
    }
  });

  function parseRange(str, max) {
    const out = [];
    str.split(/[,;\s]+/).forEach(t => {
      if (!t) return;
      const [a, b] = t.split('-').map(x => parseInt(x, 10));
      if (!a) return;
      const e = b || a;
      for (let i = a; i <= Math.min(e, max); i++) if (!out.includes(i)) out.push(i);
    });
    return out.length ? out : [1];
  }
})();