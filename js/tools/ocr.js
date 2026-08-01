/* ==========================================================================
   ocr.js — Extract text from scanned PDFs via Tesseract.js
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');
  const eta = document.getElementById('eta');

  // Approx seconds per page at scale=2 (144 DPI) for high-quality on-device OCR.
  // Real-world numbers from a mid-range laptop; faster on desktop, slower on mobile.
  const SECONDS_PER_PAGE = {
    eng: 3.5, spa: 4, fra: 4, deu: 4, por: 4, rus: 5,
    chi_sim: 9, chi_tra: 9.5, jpn: 11, kor: 10,
    ara: 8, hin: 9
  };
  const SECONDS_INIT = 3; // tesseract.js worker boot per lang model

  function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r.toString().padStart(2, '0')}s`;
  }

  document.getElementById('options').innerHTML = `
    <div class="grid grid-2">
      <div class="field">
        <label>Language</label>
        <select id="lang">
          <option value="eng">English</option>
          <option value="chi_sim">Chinese (Simplified)</option>
          <option value="chi_tra">Chinese (Traditional)</option>
          <option value="spa">Spanish</option>
          <option value="fra">French</option>
          <option value="deu">German</option>
          <option value="jpn">Japanese</option>
          <option value="kor">Korean</option>
          <option value="ara">Arabic</option>
          <option value="hin">Hindi</option>
          <option value="por">Portuguese</option>
          <option value="rus">Russian</option>
        </select>
      </div>
      <div class="field">
        <label>Output format</label>
        <select id="out">
          <option value="txt">Plain text (.txt)</option>
          <option value="searchable" selected>Searchable PDF (.pdf) — image + text layer</option>
        </select>
        <p class="soft" style="margin-top:6px;font-size:12px;line-height:1.5;">Searchable PDF includes the original page as an image with an invisible text overlay — selectable &amp; searchable in any PDF reader. First run downloads a CJK font (~18 MB, cached).</p>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Page range (optional)</label>
        <input type="text" id="range" placeholder="e.g. 1-3, 5 (leave empty for all)" />
      </div>
    </div>
  `;

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '🔍 Run OCR';

  /* ---------- ETA controller ---------- */
  function makeEta() {
    let timer = null;
    let expectedEndMs = 0;
    let startStamp = 0;
    let lastWholeMs = 0;
    let mode = 'estimating';
    let pagesTotal = 0;
    let pagesDone = 0;

    function render() {
      if (mode === 'estimating') {
        eta.textContent = '⏱ Estimating…';
        eta.className = 'eta-badge is-working';
        return;
      }
      if (mode === 'done') {
        eta.textContent = `✅ Done in ${formatDuration(lastWholeMs)}`;
        eta.className = 'eta-badge is-done';
        return;
      }
      const now = Date.now();
      const remain = Math.max(0, expectedEndMs - now);
      const over = expectedEndMs - now < -1000;
      eta.textContent = `⏱ ~${formatDuration(remain)} left${over ? ` · ${formatDuration(now - expectedEndMs)} over` : ''}`;
      eta.className = over ? 'eta-badge is-overrun' : 'eta-badge is-working';
    }

    function start(totalPages, perPageSec) {
      pagesTotal = totalPages;
      pagesDone = 0;
      startStamp = Date.now();
      mode = 'estimating';
      eta.hidden = false;
      eta.className = 'eta-badge is-working';
      eta.textContent = '⏱ Estimating…';
      // After we have at least one real signal, switch to live countdown.
      setTimeout(() => {
        if (mode === 'estimating') {
          const estSec = SECONDS_INIT + pagesTotal * perPageSec;
          expectedEndMs = Date.now() + estSec * 1000;
          mode = 'working';
          render();
          if (timer) clearInterval(timer);
          timer = setInterval(render, 1000);
        }
      }, 700);
    }

    function recordPage() {
      pagesDone++;
      if (mode === 'estimating') mode = 'working';
      // Rolling-average estimate based on actual work observed so far.
      const pagesLeft = Math.max(0, pagesTotal - pagesDone);
      const elapsed = Date.now() - startStamp;
      const avgPerPage = pagesDone > 0 ? elapsed / pagesDone : 0;
      expectedEndMs = Date.now() + avgPerPage * pagesLeft;
      render();
    }

    function done() {
      if (timer) { clearInterval(timer); timer = null; }
      lastWholeMs = Date.now() - startStamp;
      mode = 'done';
      render();
      setTimeout(() => { eta.hidden = true; }, 9000);
    }

    function hide() {
      if (timer) { clearInterval(timer); timer = null; }
      eta.hidden = true;
      eta.className = 'eta-badge';
    }

    return { start, recordPage, done, hide };
  }
  const etaCtrl = makeEta();

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Loading OCR engine…';
    document.getElementById('result').classList.remove('active');
    const lang = document.getElementById('lang').value;
    const perPageSec = SECONDS_PER_PAGE[lang] || 6;
    try {
      const pdfjs = await window.loadPdfJs();
      const buf = await window.readFileBuffer(currentFile);
      const doc = await pdfjs.getDocument({ data: buf }).promise;

      const rangeStr = document.getElementById('range').value;
      const allPages = rangeStr.trim()
        ? parseRange(rangeStr, doc.numPages)
        : Array.from({ length: doc.numPages }, (_, i) => i + 1);

      // Start ETA countdown now that we know the page count.
      etaCtrl.start(allPages.length, perPageSec);

      const Tesseract = await window.loadTesseract();
      const { PDFDocument, rgb } = await window.loadPdfLib();
      // CRITICAL: pdf-lib's embedFont(bytes, ...) requires fontkit to be
      // registered first. Without it, embedFont throws "no fontkit instance
      // was found" and falls back to Helvetica (WinAnsi), which then fails
      // on any CJK / Arabic / Cyrillic character with
      // "WinAnsi cannot encode 'X' (0xHHHH)".
      const fontkit = await window.loadFontkit();

      const outMode = document.getElementById('out').value;
      const isSearchable = outMode === 'searchable';

      // Pre-load Unicode font in parallel with worker init (first-time only).
      const fontPromise = isSearchable ? loadUnicodeFont() : Promise.resolve(null);

      const worker = await Tesseract.createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            window.setProgress('#progress', undefined, `OCR ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      let combinedText = '';
      const outPdf = isSearchable ? await PDFDocument.create() : null;
      const pdfFont = outPdf ? await (async () => {
        // Register fontkit BEFORE embedFont or it will throw.
        outPdf.registerFontkit(fontkit);
        window.setProgress('#progress', undefined, 'Loading CJK font (first run only)…');
        const bytes = await fontPromise;
        try {
          const f = await outPdf.embedFont(bytes, { subset: true });
          // DEBUG: confirm pdfFont is real NotoSansSC, not a Helvetica fallback.
          console.log('[OCR] pdfFont embedded:', f && f.name, 'has encode:', typeof f.encode);
          return f;
        } catch (e) {
          throw new Error('Failed to embed CJK font: ' + (e.message || e) +
            ' — this is almost always a fontkit registration issue.');
        }
      })() : null;

      for (let i = 0; i < allPages.length; i++) {
        const pn = allPages[i];
        window.setProgress('#progress', (i / allPages.length) * 90, `OCR page ${pn}/${doc.numPages}…`);
        const page = await doc.getPage(pn);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const { data } = await worker.recognize(canvas);
        etaCtrl.recordPage();
        combinedText += `\n----- Page ${pn} -----\n${data.text}\n`;
        if (outPdf) {
          const pageW = vp.width / 2;
          const pageH = vp.height / 2;
          const newPage = outPdf.addPage([pageW, pageH]);
          // 1) Original page rendered as image background (so the result PDF
          //    actually shows the scanned content).
          const jpegBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
          const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
          const bgImg = await outPdf.embedJpg(jpegBytes);
          newPage.drawImage(bgImg, { x: 0, y: 0, width: pageW, height: pageH });
          // 2) Transparent text overlay at original line positions — invisible
          //    to the eye but selectable / searchable in any PDF reader.
          const lines = (data && Array.isArray(data.lines)) ? data.lines : [];
          const sx = pageW / canvas.width;
          const sy = pageH / canvas.height;
          for (const line of lines) {
            if (!line || !line.text || !line.bbox) continue;
            const x = line.bbox.x0 * sx;
            const topY = line.bbox.y0 * sy;
            const h = Math.max(1, (line.bbox.y1 - line.bbox.y0) * sy);
            const w = Math.max(8, (line.bbox.x1 - line.bbox.x0) * sx);
            const size = Math.max(4, h * 0.85);
            const y = pageH - topY - h; // pdf y-axis is bottom-up
            try {
              newPage.drawText(line.text, {
                x, y, size,
                font: pdfFont,
                color: rgb(0, 0, 0),
                opacity: 0.001, // invisible, but selectable + indexable
                maxWidth: w
              });
            } catch (e) {
              // Single-character fallback: if the line contains a glyph
              // pdf-lib/fontkit cannot encode, draw the safe characters
              // one at a time. This recovers on mixed CJK + emoji + rare
              // symbols that even NotoSansSC doesn't cover.
              let cursorX = x;
              const chars = Array.from(line.text);
              for (const ch of chars) {
                if (/\s/.test(ch)) { cursorX += size * 0.5; continue; }
                try {
                  newPage.drawText(ch, {
                    x: cursorX, y, size,
                    font: pdfFont,
                    color: rgb(0, 0, 0),
                    opacity: 0.001
                  });
                  cursorX += size * 0.55;
                } catch (_) { /* skip this char */ }
              }
            }
          }
        }
      }
      await worker.terminate();
      try { await doc.cleanup(); } catch (_) {}
      try { await doc.destroy(); } catch (_) {}
      window.setProgress('#progress', 100, 'Done');
      etaCtrl.done();

      if (outMode === 'txt') {
        const blob = new Blob([combinedText], { type: 'text/plain' });
        window.showResult('#result', `
          <h4>✅ OCR complete</h4>
          <div class="result-meta">${allPages.length} page(s) · ${window.fmtSize(blob.size)}</div>
          <button class="btn btn-primary" id="dlBtn">⬇ Download .txt</button>
          <details style="margin-top:14px;"><summary style="cursor:pointer;font-weight:600;">Preview extracted text</summary>
          <pre style="margin-top:10px;padding:14px;background:var(--bg-soft);border-radius:8px;max-height:300px;overflow:auto;font-size:12px;white-space:pre-wrap;">${escapeHtml(combinedText.slice(0, 2000))}${combinedText.length > 2000 ? '…' : ''}</pre></details>
        `);
        document.getElementById('dlBtn').addEventListener('click', () => {
          window.downloadBlob(blob, currentFile.name.replace(/\.pdf$/i, '') + '_ocr.txt', 'text/plain');
        });
      } else {
        const bytes = await outPdf.save();
        window.showResult('#result', `
          <h4>✅ Searchable PDF created</h4>
          <div class="result-meta">${allPages.length} page(s) · ${window.fmtSize(bytes.byteLength)}</div>
          <button class="btn btn-primary" id="dlBtn">⬇ Download searchable.pdf</button>
        `);
        document.getElementById('dlBtn').addEventListener('click', () => {
          window.downloadBlob(bytes, currentFile.name.replace(/\.pdf$/i, '') + '_ocr.pdf', 'application/pdf');
        });
      }
    } catch (err) {
      console.error('[OCR] FAILED:', err);
      if (err && err.stack) console.error('[OCR] stack:', err.stack);
      etaCtrl.hide();
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Run OCR';
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
    return out.length ? out : Array.from({ length: max }, (_, i) => i + 1);
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  /* ---------- Unicode font loader (for Searchable PDF on CJK content) ---------- */
  // pdf-lib's StandardFonts only cover WinAnsi (ASCII + Latin-1), which fails
  // the moment OCR returns a Chinese/Japanese/Korean/Arabic/Hindi character.
  // We load a CJK-capable TTF that is bundled with the site (served from the
  // same origin so it works even when third-party CDNs are blocked) and cache
  // it in window — first run downloads ~17 MB, subsequent runs hit the browser
  // HTTP cache and are instant. pdf-lib's embedFont(bytes, { subset: true })
  // embeds only the glyphs that actually appear, so the resulting PDF stays
  // small (usually under 200 KB even for full-Chinese pages).
  const FONT_URL = '../assets/fonts/NotoSansSC-VF.ttf';
  async function loadUnicodeFont() {
    if (window.__ocrFontCache && window.__ocrFontCache.cjk) {
      return window.__ocrFontCache.cjk;
    }
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 60000);
    let res;
    try {
      res = await fetch(FONT_URL, { cache: 'force-cache', signal: ctrl.signal });
    } catch (e) {
      throw new Error('Could not download the CJK font (' + FONT_URL +
        '). Check that your network allows loading assets from this site. ' +
        '(Original error: ' + (e.message || e) + ')');
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`Font download failed (HTTP ${res.status}) for ${FONT_URL}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    window.__ocrFontCache = window.__ocrFontCache || {};
    window.__ocrFontCache.cjk = bytes;
    return bytes;
  }
})();