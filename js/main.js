/* ==========================================================================
   PDF Toolkit AI — main.js
   Theme toggle, cookie banner, small utilities shared by every page.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Sticky language preference ----------
     Once the user picks 中文/EN on any page, every subsequent page (however
     they arrive — internal link, direct URL, external referrer) keeps showing
     in that language. We store the choice in localStorage and (a) redirect on
     load when the current page language differs, and (b) rewrite internal
     links so plain clicks never drop them back to the other language.
     NOTE: assumes every EN page has a /zh/ counterpart (true for this site). */
  var LANG_KEY = 'pdftoolkit.lang';
  function getLangPref() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } }
  function setLangPref(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }
  function pathToLang(path, lang) {
    if (lang === 'zh') {
      if (path === '/' || path === '/index.html') return '/zh/';
      if (path.indexOf('/zh/') === 0) return path;
      return '/zh' + path;
    }
    // to en
    if (path.indexOf('/zh/') === 0) {
      var p = path.slice(3);
      return (p === '' || p === '/') ? '/' : p;
    }
    return path;
  }
  (function () {
    var pref = getLangPref();
    if (!pref) return;
    var isZh = location.pathname.indexOf('/zh/') === 0 || location.pathname === '/zh';
    var cur = isZh ? 'zh' : 'en';
    if (pref !== cur) {
      var target = pathToLang(location.pathname, pref);
      if (target && target !== location.pathname) window.location.replace(target);
    }
  })();

  /* ---------- Theme persistence ---------- */
  const THEME_KEY = 'pdftoolkit.theme';
  const root = document.documentElement;
  const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const saved = safeGet(THEME_KEY);
  if (saved === 'dark' || saved === 'light') {
    root.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = root.getAttribute('data-theme') || 'light';
        const next = cur === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        safeSet(THEME_KEY, next);
        btn.textContent = next === 'light' ? '🌙' : '☀️';
      });
      btn.textContent = (root.getAttribute('data-theme') === 'dark') ? '☀️' : '🌙';
    }
  });

  /* ---------- Cookie banner ---------- */
  const COOKIE_KEY = 'pdftoolkit.cookie';
  document.addEventListener('DOMContentLoaded', () => {
    if (safeGet(COOKIE_KEY)) return;
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;
    setTimeout(() => banner.classList.add('show'), 800);
    const btn = document.getElementById('cookieAccept');
    if (btn) btn.addEventListener('click', () => {
      safeSet(COOKIE_KEY, '1');
      banner.classList.remove('show');
    });
  });

  /* ---------- Helpers (attached to window for tool pages) ---------- */

  /** Format bytes → human string */
  window.fmtSize = function (bytes) {
    if (!bytes && bytes !== 0) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < u.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(bytes < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
  };

  /** Trigger a browser download from a Blob/Uint8Array */
  window.downloadBlob = function (data, filename, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  /** Read a File as ArrayBuffer */
  window.readFileBuffer = function (file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(file);
    });
  };

  /** Initialize a dropzone. cb receives FileList */
  window.initDropzone = function (selector, cb) {
    const dz = document.querySelector(selector);
    if (!dz) return;
    const input = dz.querySelector('input[type="file"]');
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover'].forEach(ev =>
      dz.addEventListener(ev, (e) => { prevent(e); dz.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(ev =>
      dz.addEventListener(ev, (e) => { prevent(e); dz.classList.remove('dragover'); }));
    dz.addEventListener('drop', (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) cb(files);
    });
    if (input) input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) cb(e.target.files);
    });
  };

  /** Render a file list under a dropzone */
  window.renderFileList = function (containerSelector, files, opts = {}) {
    const c = document.querySelector(containerSelector);
    if (!c) return;
    c.innerHTML = '';
    Array.from(files).forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <span>📄</span>
        <span class="name">${f.name}</span>
        <span class="size">${window.fmtSize(f.size)}</span>
        <button class="x" data-i="${i}" title="Remove">×</button>
      `;
      row.querySelector('.x').addEventListener('click', () => {
        opts.onRemove ? opts.onRemove(i) : location.reload();
      });
      c.appendChild(row);
    });
  };

  /** Show progress */
  window.setProgress = function (wrapSelector, pct, label) {
    const wrap = document.querySelector(wrapSelector);
    if (!wrap) return;
    wrap.classList.add('active');
    const bar = wrap.querySelector('.progress-bar');
    const lab = wrap.querySelector('.progress-label .pct');
    // Treat undefined / NaN / non-finite as "leave current value alone" so
    // partial updates (e.g. tesseract logger only setting the label) never
    // blank the bar to NaN%.
    const safe = (typeof pct === 'number' && Number.isFinite(pct))
      ? Math.max(0, Math.min(100, pct))
      : null;
    if (bar && safe !== null) bar.style.width = `${safe}%`;
    if (lab) {
      if (safe !== null) lab.textContent = `${Math.round(safe)}%`;
      // else: keep current percentage text intact
    }
    const ltxt = wrap.querySelector('.progress-label .txt');
    if (ltxt && label) ltxt.textContent = label;
  };

  /** Show success result block */
  window.showResult = function (selector, html) {
    const r = document.querySelector(selector);
    if (!r) return;
    r.innerHTML = html;
    r.classList.add('active');
  };

  /** Render PDF page thumbnails via pdf.js (used by preview-grid) */
  window.renderPdfThumbs = async function (pdfjsDoc, containerSelector, maxPages = 12) {
    const c = document.querySelector(containerSelector);
    if (!c || !pdfjsDoc) return;
    c.innerHTML = '';
    const n = Math.min(pdfjsDoc.numPages, maxPages);
    for (let i = 1; i <= n; i++) {
      const page = await pdfjsDoc.getPage(i);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.appendChild(canvas);
      c.appendChild(thumb);
    }
  };

  /** pdfjsLib loader helper */
  window.loadPdfJs = function () {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  /** pdf-lib loader helper */
  window.loadPdfLib = function () {
    return new Promise((resolve, reject) => {
      if (window.PDFLib) { resolve(window.PDFLib); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      s.onload = () => resolve(window.PDFLib);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  /** @pdf-lib/fontkit loader (REQUIRED for embedding TTF/OTF custom fonts).
   *  Without this, PDFDocument.embedFont(bytes) throws
   *  "no fontkit instance was found" and falls back to Helvetica (WinAnsi),
   *  which then fails on any CJK / Arabic / Cyrillic character. */
  window.loadFontkit = function () {
    return new Promise((resolve, reject) => {
      if (window.fontkit) { resolve(window.fontkit); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';
      s.onload = () => resolve(window.fontkit);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  /** JSZip loader helper */
  window.loadJSZip = function () {
    return new Promise((resolve, reject) => {
      if (window.JSZip) { resolve(window.JSZip); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      s.onload = () => resolve(window.JSZip);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  /** Tesseract.js loader helper */
  window.loadTesseract = function () {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) { resolve(window.Tesseract); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
      s.onload = () => resolve(window.Tesseract);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  /* ---------- Service Worker (PWA) ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  /* ---------- Language switcher (two-option toggle: 中文 | English) ----------
     Renders BOTH options inside one pill so users can always see what's
     available. The currently-active language is shown as a non-clickable
     label with a green active dot; the other option is a real link to the
     counterpart page. Clicking the alt pill sets the sticky preference
     (so future pages auto-redirect to the chosen language).
     NOTE: assumes every EN page has a /zh/ counterpart (true for this site). */
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('langSwitch')) return;
    const path = location.pathname;
    const isZh = path.indexOf('/zh/') === 0 || path === '/zh';
    // Compute the counterpart URL (where the other-language link should point)
    let counterpart;
    if (isZh) {
      counterpart = path.slice(3); // drop "/zh" prefix
      if (counterpart === '' || counterpart === '/') counterpart = '/';
    } else {
      counterpart = (path === '/' || path === '/index.html') ? '/zh/' : '/zh' + path;
    }
    // Build the toggle: [active-label | alt-link]
    const wrap = document.createElement('div');
    wrap.id = 'langSwitch';
    wrap.className = 'lang-switch' + (isZh ? ' lang-switch--zh' : ' lang-switch--en');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language switcher');
    const makeOpt = (label, opts) => {
      if (opts.active) {
        const span = document.createElement('span');
        span.className = 'lang-switch__opt lang-switch__opt--active';
        span.setAttribute('aria-current', 'true');
        span.textContent = label;
        return span;
      } else {
        const a = document.createElement('a');
        a.className = 'lang-switch__opt lang-switch__opt--alt';
        a.href = counterpart;
        a.setAttribute('hreflang', opts.hreflang);
        a.setAttribute('title', opts.title);
        a.textContent = label;
        a.addEventListener('click', () => { setLangPref(opts.hreflang === 'zh' ? 'zh' : 'en'); });
        return a;
      }
    };
    // Compact labels: "中" for Chinese, "EN" for English (user feedback:
    // "中文/English was too wide — just use 中/EN"). The full native names
    // remain in aria-label / title attributes for screen readers.
    if (isZh) {
      wrap.appendChild(makeOpt('中',  { active: true,  hreflang: 'zh' }));
      wrap.appendChild(makeOpt('EN', { active: false, hreflang: 'en', title: 'Switch to English' }));
    } else {
      wrap.appendChild(makeOpt('中',  { active: false, hreflang: 'zh', title: '切换到中文' }));
      wrap.appendChild(makeOpt('EN', { active: true,  hreflang: 'en' }));
    }
    // Inject at the top of the page (inside the nav CTA)
    const cta = document.querySelector('.nav-cta');
    if (cta) cta.insertBefore(wrap, cta.firstChild);
    else document.body.appendChild(wrap);
    // SEO: pair this page with its alternate-language version
    const altLang = isZh ? 'en' : 'zh';
    if (!document.querySelector('link[rel="alternate"][hreflang="' + altLang + '"]')) {
      const alt = document.createElement('link');
      alt.rel = 'alternate';
      alt.hreflang = altLang;
      alt.href = location.origin + counterpart;
      document.head.appendChild(alt);
    }
    // Sticky preference: rewrite internal page links so plain navigation
    // stays in the chosen language (don't touch the switch button, hashes,
    // mailto, external, or asset/static files).
    const pref = getLangPref();
    if (pref) {
      const rewrite = (link) => {
        if (link.id === 'langSwitch') return;
        const href = link.getAttribute('href');
        if (!href) return;
        if (href.charAt(0) === '#' || /^(mailto:|javascript:)/i.test(href) ||
            /^[a-z]+:\/\//i.test(href)) return;
        let abs;
        try { abs = new URL(href, location.href).pathname; } catch (e) { return; }
        // only real HTML pages (skip /assets, /css, /js, static files)
        const isPage = abs === '/' || abs.indexOf('/zh/') === 0 || /\.html$/.test(abs);
        const isAsset = /\.(css|js|json|xml|txt|svg|png|jpe?g|gif|ico|woff2?|ttf|otf|webp|pdf)$/i.test(abs) ||
                        /\/(assets|css|js)\//.test(abs) || abs.indexOf('/manifest') !== -1;
        if (!isPage || isAsset) return;
        const t = pathToLang(abs, pref);
        if (t && t !== abs) link.setAttribute('href', t);
      };
      document.querySelectorAll('a[href]').forEach(rewrite);
    }
  });
})();