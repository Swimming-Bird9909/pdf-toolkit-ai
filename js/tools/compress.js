/* ==========================================================================
   compress.js — Compress PDF to target size
   Strategy: render each page with pdf.js → embed as JPEG in new pdf-lib PDF.
   Iterate scale/quality until target size met.
   ========================================================================== */

(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnCompress');
  const btnReset = document.getElementById('btnReset');
  const presetSel = document.getElementById('preset');
  const customField = document.getElementById('customField');
  const customSize = document.getElementById('customSize');
  const outName = document.getElementById('outName');

  if (presetSel) presetSel.addEventListener('change', () => {
    customField.style.display = presetSel.value === 'custom' ? '' : 'none';
  });

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  if (btnReset) btnReset.addEventListener('click', () => location.reload());

  if (btn) btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Compressing…';
    document.getElementById('result').classList.remove('active');

    try {
      const targetKb = getTargetKb();
      const arrayBuf = await window.readFileBuffer(currentFile);
      const result = await compressToTarget(arrayBuf, targetKb);
      const filename = (outName.value || 'compressed.pdf').trim();

      const ratio = (1 - result.bytes.byteLength / arrayBuf.byteLength) * 100;
      window.setProgress('#progress', 100, 'Done');

      // Visual: 3 states
      //   ✅ hit       — size ≤ target × 1.05 (or lossless mode)
      //   ⚠️ close     — target × 1.05 < size ≤ target × 1.5
      //   ❌ not-hit   — size > target × 1.5 (kept our quality floor)
      let statusHtml;
      if (result.mode === 'lossless') {
        statusHtml = `
          <h4 style="color:var(--success)">✅ Smart pack (lossless)</h4>
          <div class="result-meta">
            Original: <strong>${window.fmtSize(arrayBuf.byteLength)}</strong> →
            Compressed: <strong>${window.fmtSize(result.bytes.byteLength)}</strong>
            (${ratio > 0 ? '↓' : '↑'} ${Math.abs(ratio).toFixed(1)}%)
          </div>
          <p class="soft" style="margin-top:.5rem">
            ✅ Vector text, fonts and original images preserved byte-for-byte.
            Only metadata and packaging were rewritten.
            <br/>Render quality: <strong>identical to original</strong>.
          </p>`;
      } else if (result.hit) {
        statusHtml = `
          <h4 style="color:var(--success)">✅ Compressed successfully</h4>
          <div class="result-meta">
            Original: <strong>${window.fmtSize(arrayBuf.byteLength)}</strong> →
            Compressed: <strong>${window.fmtSize(result.bytes.byteLength)}</strong>
            (${ratio > 0 ? '↓' : '↑'} ${Math.abs(ratio).toFixed(1)}%)
          </div>
          <p class="soft" style="margin-top:.5rem">
            Render quality: <strong>${result.dpi} DPI @ ${Math.round(result.quality * 100)}% JPEG</strong>.
            Text edges stay crisp because we never drop below 144 DPI.
          </p>`;
      } else if (result.close) {
        statusHtml = `
          <h4 style="color:#d97706">⚠️ Close to target, kept quality floor</h4>
          <div class="result-meta">
            Original: <strong>${window.fmtSize(arrayBuf.byteLength)}</strong> →
            Compressed: <strong>${window.fmtSize(result.bytes.byteLength)}</strong>
            (${ratio > 0 ? '↓' : '↑'} ${Math.abs(ratio).toFixed(1)}%)
          </div>
          <p class="soft" style="margin-top:.5rem">
            We hit our quality floor (144 DPI @ ${Math.round(result.quality * 100)}% JPEG) before reaching your
            ${targetKb} KB target. Going lower would visibly blur the text.
            <br/><strong>Tips to hit a smaller target:</strong>
            use <a href="split.html">Split PDF</a> to remove image-heavy pages,
            or pick a larger target (${targetKb * 2} KB).
          </p>`;
      } else {
        statusHtml = `
          <h4 style="color:var(--danger)">❌ Target not achievable while keeping text crisp</h4>
          <div class="result-meta">
            Original: <strong>${window.fmtSize(arrayBuf.byteLength)}</strong> →
            Compressed: <strong>${window.fmtSize(result.bytes.byteLength)}</strong>
            (${ratio > 0 ? '↓' : '↑'} ${Math.abs(ratio).toFixed(1)}%)
          </div>
          <p class="soft" style="margin-top:.5rem">
            Even at our quality floor (144 DPI @ ${Math.round(result.quality * 100)}% JPEG), the result is
            <strong>${result.bytes.byteLength / 1024 | 0} KB</strong> — way above your
            <strong>${targetKb} KB</strong> target. Going lower means text would become unreadable.
            <br/><strong>This is normal for PDFs with lots of embedded photos.</strong>
            Try one of these instead:
            <ul style="margin-top:.4rem;padding-left:1.2rem">
              <li>Use <a href="split.html">Split PDF</a> to drop image pages first</li>
              <li>Use <a href="extract-images.html">Extract Images</a> + recompress the photos</li>
              <li>Pick a more realistic target (300 KB / 500 KB / Email-ready)</li>
              <li>Pick <strong>Smart pack (lossless)</strong> — same quality, ~5–15% smaller</li>
            </ul>
          </p>`;
      }

      window.showResult('#result', `
        ${statusHtml}
        <button class="btn btn-primary" id="dlBtn" style="margin-top:.6rem">⬇ Download ${filename}</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(result.bytes, filename, 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `
        <h4 style="color:var(--danger)">❌ Compression failed</h4>
        <p class="soft">${err.message || err}</p>
      `);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🗜️ Compress PDF';
    }
  });

  function getTargetKb() {
    const p = presetSel.value;
    if (p === 'custom') return Math.max(20, parseInt(customSize.value, 10) || 200);
    return { email: 300, '100kb': 100, '200kb': 200, '500kb': 500, lossless: 0 }[p] || 100;
  }

  /**
   * Compress the PDF.
   *
   * Strategy (quality-first, never below 144 DPI):
   *  1. Lossless pass (pdf-lib repack, useObjectStreams: false, strip metadata).
   *     For a text-heavy PDF this often already beats small targets because the
   *     source has redundant objects, embedded thumbnails, XMP, etc.
   *  2. If lossless isn't enough, fall through to lossy raster — but at a
   *     *quality floor of 144 DPI @ 0.75 JPEG* (the lowest we will ever go).
   *     Lowering the scale below 1.0× (i.e. rendering at 72 DPI or below) is
   *     what makes text look "soft" — so we never do that.
   *  3. If even the floor doesn't hit target, we return the floor result with
   *     a `hit: false` flag so the UI can warn the user instead of silently
   *     shipping a blurry file.
   */
  async function compressToTarget(arrayBuf, targetKb) {
    const { PDFDocument } = await window.loadPdfLib();

    // ── Step 1: try lossless ───────────────────────────────────────────────
    window.setProgress('#progress', 5, 'Trying lossless pass…');
    const losslessBytes = await pdfLibLossless(arrayBuf, PDFDocument);
    window.setProgress('#progress', 12, `Lossless: ${window.fmtSize(losslessBytes.byteLength)}`);

    // "Reduce size, no quality loss" → stop here, return the repacked PDF.
    if (targetKb === 0) {
      return { bytes: losslessBytes, mode: 'lossless', dpi: 0, quality: 1, hit: true, close: false };
    }

    // If lossless already meets target → done, best possible quality.
    if (losslessBytes.byteLength / 1024 <= targetKb) {
      return { bytes: losslessBytes, mode: 'lossless', dpi: 0, quality: 1, hit: true, close: false };
    }

    // ── Step 2: lossy raster, but only at quality-safe plans ──────────────
    // Each plan: scale (multiplied by RENDER_BASE inside renderAndRebuild)
    // × JPEG quality. DPI is derived as scale × RENDER_BASE × 72.
    // We never drop below 1.0× (which is 144 DPI with RENDER_BASE=2.0).
    const plans = [
      { scale: 1.50, q: 0.92, label: '216 DPI @ 92%' },
      { scale: 1.50, q: 0.85, label: '216 DPI @ 85%' },
      { scale: 1.25, q: 0.88, label: '180 DPI @ 88%' },
      { scale: 1.00, q: 0.85, label: '144 DPI @ 85%' },
      { scale: 1.00, q: 0.80, label: '144 DPI @ 80%' },
      { scale: 1.00, q: 0.75, label: '144 DPI @ 75%' }   // quality floor
    ];
    const RENDER_BASE = 2.0; // 1.0× = 144 DPI

    const pdfjs = await window.loadPdfJs();
    let bestBytes = losslessBytes;
    let bestPlan = plans[plans.length - 1];
    let lastPlan = bestPlan;

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const dpi = Math.round(plan.scale * RENDER_BASE * 72);
      window.setProgress('#progress',
        15 + (i / plans.length) * 80,
        `Plan ${i + 1}/${plans.length} — ${plan.label}…`);
      const bytes = await renderAndRebuild(arrayBuf, pdfjs, PDFDocument, plan.scale, plan.q);
      lastPlan = { ...plan, dpi };
      window.setProgress('#progress',
        15 + ((i + 0.7) / plans.length) * 80,
        `${window.fmtSize(bytes.byteLength)} @ ${plan.label}`);
      if (bytes.byteLength < bestBytes.byteLength) {
        bestBytes = bytes;
        bestPlan = lastPlan;
      }
      if (bytes.byteLength / 1024 <= targetKb) {
        return { bytes, mode: 'raster', dpi, quality: plan.q, hit: true, close: false };
      }
    }

    // ── Step 3: didn't hit target — return the floor + flag for UI warning ─
    const finalKb = bestBytes.byteLength / 1024;
    const close = finalKb <= targetKb * 1.5;
    return {
      bytes: bestBytes,
      mode: 'raster',
      dpi: bestPlan.dpi,
      quality: bestPlan.q,
      hit: false,
      close
    };
  }

  // Pure pdf-lib pass: re-saves the PDF and strips metadata. NO re-rasterization.
  // All original text, fonts, vector strokes and image data are preserved
  // byte-for-byte — that's what "no quality loss" means in this preset.
  //
  // CRITICAL: useObjectStreams MUST be false.
  // Object streams pack multiple objects into one zlib-compressed stream, which
  // forces cross-reference entries to point into the middle of compressed data.
  // Some PDF readers (browser built-ins, Quick Look, certain mobile viewers)
  // lose font subset hinting instructions when they have to seek into a deflated
  // stream — the text still renders, but anti-aliasing is coarser and the page
  // looks "soft" compared to the original. Disabling object streams keeps every
  // object on its own (slightly bigger file, but bit-identical visual output).
  async function pdfLibLossless(arrayBuf, PDFDocument) {
    const doc = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
    try {
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setProducer('');
      doc.setCreator('');
    } catch (_) { /* metadata fields optional */ }
    return await doc.save({
      useObjectStreams: false,
      addDefaultPage: false,
      objectsPerTick: Infinity
    });
  }

  async function renderAndRebuild(arrayBuf, pdfjs, PDFDocument, scale, quality) {
    // Always render at 2x the requested downsample scale (= 144 DPI for
    // scale=1.0). The old code rendered at 72 DPI which made text fuzzy even
    // before JPEG kicked in.
    const RENDER_BASE = 2.0;
    // pdf.js transfers the ArrayBuffer to its worker (detaching it on the main
    // thread), so we MUST pass a fresh copy each call when reusing the buffer
    // across multiple compression plans.
    const loadingTask = pdfjs.getDocument({ data: arrayBuf.slice(0) });
    const srcDoc = await loadingTask.promise;
    const outDoc = await PDFDocument.create();

    for (let p = 1; p <= srcDoc.numPages; p++) {
      const page = await srcDoc.getPage(p);
      const baseVp = page.getViewport({ scale: 1 });
      const renderVp = page.getViewport({ scale: scale * RENDER_BASE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderVp.width));
      canvas.height = Math.max(1, Math.floor(renderVp.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderVp }).promise;

      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
      const buf = await blob.arrayBuffer();
      const img = await outDoc.embedJpg(new Uint8Array(buf));
      const newPage = outDoc.addPage([baseVp.width, baseVp.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });
      window.setProgress('#progress', undefined, `Page ${p}/${srcDoc.numPages}`);
    }
    const saved = await outDoc.save({ useObjectStreams: false });
    try { await srcDoc.cleanup(); } catch (_) {}
    try { await srcDoc.destroy(); } catch (_) {}
    return saved;
  }
})();