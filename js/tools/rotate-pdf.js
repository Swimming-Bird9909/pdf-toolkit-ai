/* ==========================================================================
   rotate-pdf.js — Rotate PDF pages losslessly using pdf-lib
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');
  const customWrap = document.getElementById('customPagesWrap');

  // Show/hide custom pages input based on scope selection
  document.querySelectorAll('input[name="scope"]').forEach(r => {
    r.addEventListener('change', () => {
      customWrap.style.display = r.value === 'custom' && r.checked ? 'block' : 'none';
    });
  });

  function parsePages(spec, total) {
    // Parse "1, 3, 5-7" into [1, 3, 5, 6, 7]
    const out = new Set();
    const parts = spec.split(/[,\s]+/).filter(Boolean);
    for (const p of parts) {
      if (p.includes('-')) {
        const [a, b] = p.split('-').map(s => parseInt(s.trim(), 10));
        if (isNaN(a) || isNaN(b)) continue;
        const lo = Math.max(1, Math.min(a, b));
        const hi = Math.min(total, Math.max(a, b));
        for (let i = lo; i <= hi; i++) out.add(i);
      } else {
        const n = parseInt(p, 10);
        if (!isNaN(n) && n >= 1 && n <= total) out.add(n);
      }
    }
    return [...out].sort((a, b) => a - b);
  }

  window.initDropzone('#dz', async (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Rotating…';
    document.getElementById('result').classList.remove('active');
    try {
      const { PDFDocument } = await window.loadPdfLib();
      const buf = await window.readFileBuffer(currentFile);
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();

      const angle = parseInt(document.querySelector('input[name="angle"]:checked').value, 10);
      const scope = document.querySelector('input[name="scope"]:checked').value;

      let pagesToRotate;
      if (scope === 'all') {
        pagesToRotate = Array.from({ length: total }, (_, i) => i + 1);
      } else {
        const spec = document.getElementById('customPages').value.trim();
        if (!spec) {
          alert('Please enter which pages to rotate (e.g., 1, 3, 5-7).');
          btn.disabled = false;
          btn.innerHTML = 'Rotate PDF';
          return;
        }
        pagesToRotate = parsePages(spec, total);
        if (pagesToRotate.length === 0) {
          alert('No valid page numbers found. Use format: 1, 3, 5-7');
          btn.disabled = false;
          btn.innerHTML = 'Rotate PDF';
          return;
        }
      }

      window.setProgress('#progress', 50, 'Rotating pages…');
      // pdf-lib rotations: 0, 90, 180, 270
      // The angle we collect is "clockwise" — pdf-lib uses counter-clockwise internally
      // Map: 90 cw = 270 in pdf-lib, 180 cw = 180, 270 cw = 90
      const pdfLibAngle = angle === 90 ? 270 : angle === 270 ? 90 : 180;

      for (const pageNum of pagesToRotate) {
        const page = src.getPage(pageNum - 1);
        const current = page.getRotation().angle;
        page.setRotation((current + pdfLibAngle) % 360);
      }

      window.setProgress('#progress', 85, 'Saving…');
      const bytes = await src.save();
      window.setProgress('#progress', 100, 'Done');
      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      window.showResult('#result', `
        <h4>✅ Rotated ${pagesToRotate.length} page(s) by ${angle}°</h4>
        <div class="result-meta">${window.fmtSize(bytes.byteLength)} (was ${window.fmtSize(buf.byteLength)})</div>
        <p class="soft" style="font-size:13px;">Lossless rotation — text and image quality preserved byte-for-byte.</p>
        <button class="btn btn-primary" id="dlBtn">⬇ Download</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(bytes, baseName + '_rotated.pdf', 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Rotate PDF';
    }
  });
})();
