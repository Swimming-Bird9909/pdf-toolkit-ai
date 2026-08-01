/* ==========================================================================
   remove-watermark.js — Two strategies:
     1) Strip real PDF watermark objects (annotation layer) — works for
        watermarks added in Acrobat / Word "Insert Watermark".
     2) Best-effort: re-render each page and offer PNGs for manual cleanup
        (for burned-in watermarks).
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="field">
      <label>Strategy</label>
      <select id="strategy">
        <option value="strip" selected>Strip PDF watermark objects (recommended first try)</option>
        <option value="render">Render pages + optional auto-mask</option>
      </select>
    </div>
    <div id="autoMaskField" class="field" style="display:none;">
      <label>Auto-mask heuristic</label>
      <select id="mask">
        <option value="off" selected>Off (just give me PNGs)</option>
        <option value="corners">Mask text in corners (top-left, top-right, bottom-center)</option>
        <option value="diag">Mask diagonal repeating text (center, low opacity)</option>
      </select>
    </div>
    <div class="field">
      <label>Output filename</label>
      <input type="text" id="outName" value="unwatermarked.pdf" />
    </div>
    <p class="soft" style="font-size:13px;">⚠️ Watermark removal is best-effort. PDFs with burned-in watermarks often require manual editing — use "Render pages" strategy to get PNGs you can clean up in any image editor.</p>
  `;

  const strategySel = document.getElementById('strategy');
  const autoMaskField = document.getElementById('autoMaskField');
  strategySel.addEventListener('change', () => {
    autoMaskField.style.display = strategySel.value === 'render' ? '' : 'none';
  });

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '💧 Remove watermark';

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    const strategy = strategySel.value;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Processing…';
    document.getElementById('result').classList.remove('active');
    try {
      if (strategy === 'strip') await stripWatermark();
      else await renderStrategy();
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '💧 Remove watermark';
    }
  });

  /* === Strategy 1: strip real watermark objects === */
  async function stripWatermark() {
    const { PDFDocument, PDFName, PDFDict, PDFArray } = await window.loadPdfLib();
    const buf = await window.readFileBuffer(currentFile);
    const doc = await PDFDocument.load(buf);
    let removed = 0;

    const ctx = doc.context;
    // 1) Page-level watermarks & annotations (Stamp, Watermark, FreeText annotations)
    doc.getPages().forEach(page => {
      const pageDict = page.node;
      // Remove /Watermark entry
      const watermarkNames = ['Watermark', 'Stamp', 'FreeText'];
      watermarkNames.forEach(name => {
        const n = PDFName.of(name);
        const annots = pageDict.lookup(PDFName.of('Annots'));
        if (annots instanceof PDFArray) {
          for (let i = annots.size - 1; i >= 0; i--) {
            const a = annots.lookup(i);
            if (a instanceof PDFDict) {
              const sub = a.lookup(PDFName.of('Subtype'));
              if (sub && sub.toString().includes(`/${name}`)) {
                annots.remove(i);
                removed++;
              }
            }
          }
        }
        // Also remove top-level /Watermark reference on page
        if (pageDict.has(n)) { pageDict.delete(n); }
      });
      // PieceInfo sometimes holds watermark
      if (pageDict.has(PDFName.of('PieceInfo'))) pageDict.delete(PDFName.of('PieceInfo'));
    });

    // 2) Catalog-level AcroForm / Optional Content / MarkInfo
    const catalog = doc.catalog;
    if (catalog.has(PDFName.of('MarkInfo'))) catalog.delete(PDFName.of('MarkInfo'));
    const acroForm = catalog.lookup(PDFName.of('AcroForm'));
    if (acroForm instanceof PDFDict) {
      if (acroForm.has(PDFName.of('XFA'))) acroForm.delete(PDFName.of('XFA'));
    }

    // 3) Optional Content Groups (Layers) — watermarks often live on a hidden layer
    const oc = catalog.lookup(PDFName.of('OCProperties'));
    if (oc instanceof PDFDict) {
      const ocgs = oc.lookup(PDFName.of('OCGs'));
      if (ocgs instanceof PDFArray) {
        // Mark all OCGs as OFF by default (effectively hiding layers)
        for (let i = 0; i < ocgs.size; i++) {
          const o = ocgs.lookup(i);
          if (o instanceof PDFDict) {
            o.set(PDFName.of('Usage'), PDFDict.empty(ctx));
          }
        }
      }
    }

    const bytes = await doc.save({ useObjectStreams: false });
    const filename = document.getElementById('outName').value || 'unwatermarked.pdf';
    window.setProgress('#progress', 100, 'Done');
    window.showResult('#result', `
      <h4>✅ Watermark objects stripped</h4>
      <div class="result-meta">${removed} annotation(s) removed · ${window.fmtSize(buf.byteLength)} → ${window.fmtSize(bytes.byteLength)}</div>
      <p class="soft mt-2">If watermarks still appear, the watermark was likely <strong>burned into the page content</strong> (rendered as part of the image/text). Switch the strategy above to "Render pages" to get clean PNGs.</p>
      <button class="btn btn-primary mt-2" id="dlBtn">⬇ Download ${filename}</button>
    `);
    document.getElementById('dlBtn').addEventListener('click', () => {
      window.downloadBlob(bytes, filename, 'application/pdf');
    });
  }

  /* === Strategy 2: render + optional heuristic mask === */
  async function renderStrategy() {
    const pdfjs = await window.loadPdfJs();
    const JSZip = await window.loadJSZip();
    const { PDFDocument } = await window.loadPdfLib();
    const mask = document.getElementById('mask').value;
    const buf = await window.readFileBuffer(currentFile);
    const src = await pdfjs.getDocument({ data: buf }).promise;
    const zip = new JSZip();
    const previewUrls = [];
    const cleanedPdf = await PDFDocument.create();

    for (let p = 1; p <= src.numPages; p++) {
      window.setProgress('#progress', (p / src.numPages) * 90, `Page ${p}/${src.numPages}…`);
      const page = await src.getPage(p);
      const baseVp = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // Apply heuristic mask
      if (mask !== 'off') {
        ctx.fillStyle = '#ffffff';
        if (mask === 'corners') {
          // Cover top-left, top-right, bottom-center text bands
          ctx.fillRect(0, 0, vp.width * 0.4, vp.height * 0.08);
          ctx.fillRect(vp.width * 0.6, 0, vp.width * 0.4, vp.height * 0.08);
          ctx.fillRect(vp.width * 0.2, vp.height * 0.92, vp.width * 0.6, vp.height * 0.08);
        } else if (mask === 'diag') {
          // Cover the diagonal band (roughly center)
          ctx.save();
          ctx.translate(vp.width / 2, vp.height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.fillRect(-vp.width, -vp.height * 0.06, vp.width * 2, vp.height * 0.12);
          ctx.restore();
        }
      }

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      zip.file(`page_${String(p).padStart(3,'0')}.png`, blob);
      if (previewUrls.length < 8) previewUrls.push(URL.createObjectURL(blob));

      // Also rebuild a clean PDF from these rendered pages
      const jpgBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      const jpgBuf = await jpgBlob.arrayBuffer();
      const img = await cleanedPdf.embedJpg(new Uint8Array(jpgBuf));
      const newPage = cleanedPdf.addPage([baseVp.width, baseVp.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });
    }
    const cleanedBytes = await cleanedPdf.save();
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    window.setProgress('#progress', 100, 'Done');

    window.showResult('#result', `
      <h4>✅ Rendered ${src.numPages} page(s)</h4>
      <div class="result-meta">PNGs: ${window.fmtSize(zipBlob.size)} · Clean PDF: ${window.fmtSize(cleanedBytes.byteLength)}</div>
      <div class="actions">
        <button class="btn btn-primary" id="dlZip">⬇ Download PNGs (ZIP)</button>
        <button class="btn btn-ghost" id="dlPdf">⬇ Download clean PDF</button>
      </div>
      <div class="preview-grid mt-3">
        ${previewUrls.map(u => `<div class="thumb"><img src="${u}" alt=""/></div>`).join('')}
      </div>
      <p class="soft mt-3" style="font-size:13px;">💡 Open the PNGs in any image editor (Photoshop, GIMP, even Paint) to erase remaining marks, then re-combine into a new PDF.</p>
    `);
    const baseName = currentFile.name.replace(/\.pdf$/i, '');
    document.getElementById('dlZip').addEventListener('click', () => window.downloadBlob(zipBlob, `${baseName}_pages.zip`));
    document.getElementById('dlPdf').addEventListener('click', () => window.downloadBlob(cleanedBytes, `${baseName}_cleaned.pdf`, 'application/pdf'));
  }
})();