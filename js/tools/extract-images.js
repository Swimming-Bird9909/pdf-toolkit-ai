/* ==========================================================================
   extract-images.js — Pull every image embedded in a PDF
   Strategy: parse PDF raw with pdf.js and pull XObject images.
   Falls back to per-page render if no embedded images found.
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="grid grid-2">
      <div class="field">
        <label>Output format</label>
        <select id="fmt">
          <option value="original" selected>Keep original format</option>
          <option value="png">Convert all to PNG</option>
          <option value="jpeg">Convert all to JPG</option>
        </select>
      </div>
      <div class="field">
        <label>Minimum size (skip tiny logos)</label>
        <select id="minSize">
          <option value="0">No filter</option>
          <option value="50">50×50 px</option>
          <option value="100" selected>100×100 px</option>
          <option value="200">200×200 px</option>
        </select>
      </div>
    </div>
  `;

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '📦 Extract Images';

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Extracting…';
    document.getElementById('result').classList.remove('active');
    try {
      const pdfjs = await window.loadPdfJs();
      const JSZip = await window.loadJSZip();
      const fmt = document.getElementById('fmt').value;
      const minSize = parseInt(document.getElementById('minSize').value, 10) || 0;
      const buf = await window.readFileBuffer(currentFile);
      const doc = await pdfjs.getDocument({ data: buf }).promise;

      const zip = new JSZip();
      let count = 0;
      const previewUrls = [];

      for (let p = 1; p <= doc.numPages; p++) {
        window.setProgress('#progress', (p / doc.numPages) * 90, `Scanning page ${p}/${doc.numPages}…`);
        const page = await doc.getPage(p);
        // Walk operator list to find image objects
        const ops = await page.getOperatorList();
        const commonObjs = page.commonObjs;
        const objs = page.objs;

        const seen = new Set();
        for (let i = 0; i < ops.fnArray.length; i++) {
          const fn = ops.fnArray[i];
          // OPS.paintImageXObject = 85, OPS.paintInlineImageXObject = 86
          if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintInlineImageXObject) continue;
          const imgName = ops.argsArray[i][0];
          if (seen.has(imgName)) continue;
          seen.add(imgName);

          let img;
          try {
            img = await page.objs.get(imgName);
          } catch (e) { continue; }
          if (!img || !img.data) continue;

          // Determine dimensions
          const w = img.width || (img.bitmap && img.bitmap.width);
          const h = img.height || (img.bitmap && img.bitmap.height);
          if (!w || !h) continue;
          if (w < minSize || h < minSize) continue;

          let blob, ext = 'png';
          if (img.kind === 'imagebitmap' || (img.bitmap)) {
            const bm = img.bitmap || img;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(bm, 0, 0);
            blob = await canvasToBlob(canvas, fmt);
          } else {
            // raw RGBA buffer
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(w, h);
            // pdf.js sometimes returns RGB, sometimes RGBA
            if (img.data.length === w * h * 4) {
              imgData.data.set(img.data);
            } else if (img.data.length === w * h * 3) {
              for (let k = 0, j = 0; k < img.data.length; k += 3, j += 4) {
                imgData.data[j] = img.data[k];
                imgData.data[j+1] = img.data[k+1];
                imgData.data[j+2] = img.data[k+2];
                imgData.data[j+3] = 255;
              }
            } else {
              continue;
            }
            ctx.putImageData(imgData, 0, 0);
            blob = await canvasToBlob(canvas, fmt);
          }
          if (!blob) continue;
          ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
          count++;
          zip.file(`image_p${String(p).padStart(3,'0')}_${String(count).padStart(3,'0')}.${ext}`, blob);
          if (previewUrls.length < 12) {
            previewUrls.push(URL.createObjectURL(blob));
          }
        }
      }

      window.setProgress('#progress', 100, 'Done');
      if (count === 0) {
        window.showResult('#result', `
          <h4 style="color:var(--warning)">⚠️ No images found</h4>
          <p class="soft">This PDF may not contain embedded images, or they're below your minimum size filter.</p>
        `);
      } else {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const baseName = currentFile.name.replace(/\.pdf$/i, '');
        window.showResult('#result', `
          <h4>✅ Extracted ${count} image(s)</h4>
          <div class="result-meta">${window.fmtSize(zipBlob.size)}</div>
          <button class="btn btn-primary" id="dlBtn">⬇ Download ZIP</button>
          <div class="preview-grid" style="margin-top:18px;">
            ${previewUrls.map(u => `<div class="thumb"><img src="${u}" alt=""/></div>`).join('')}
          </div>
        `);
        document.getElementById('dlBtn').addEventListener('click', () => {
          window.downloadBlob(zipBlob, `${baseName}_images.zip`);
        });
      }
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '📦 Extract Images';
    }
  });

  async function canvasToBlob(canvas, fmt) {
    if (fmt === 'original') return new Promise(res => canvas.toBlob(res, 'image/png'));
    const mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
    const quality = fmt === 'jpeg' ? 0.92 : undefined;
    return new Promise(res => canvas.toBlob(res, mime, quality));
  }
})();