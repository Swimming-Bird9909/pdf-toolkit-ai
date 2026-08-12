/* PDF Toolkit AI — main.js
   Theme toggle, language switcher, shared tool helpers, SW registration. */
(function () {
  'use strict';

  // ---- Sticky language preference ----
  var LANG_KEY = 'pdftoolkit.lang';
  var getLangPref = function () { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } };
  var setLangPref = function (v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} };
  var pathIsZh = function (p) { return p.indexOf('/zh/') === 0 || p === '/zh'; };
  var pathToLang = function (path, lang) {
    if (lang === 'zh') {
      if (path === '/' || path === '/index.html') return '/zh/';
      if (path.indexOf('/zh/') === 0) return path;
      return '/zh' + path;
    }
    if (path.indexOf('/zh/') === 0) {
      var p = path.slice(3);
      return (p === '' || p === '/') ? '/' : p;
    }
    return path;
  };
  var counterpartFor = function (path) {
    return pathIsZh(path) ? pathToLang(path, 'en') : pathToLang(path, 'zh');
  };

  // IIFE redirect: if a stored pref doesn't match current page, redirect.
  // Run BEFORE any DOM ops so we don't flash the wrong language.
  (function () {
    var pref = getLangPref();
    if (!pref) return;
    var cur = pathIsZh(location.pathname) ? 'zh' : 'en';
    if (pref !== cur) {
      var target = pathToLang(location.pathname, pref);
      if (target && target !== location.pathname) location.replace(target);
    }
  })();

  // ---- Theme ----
  var THEME_KEY = 'pdftoolkit.theme';
  var root = document.documentElement;
  var safeGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var safeSet = function (k, v) { try { return localStorage.setItem(k, v); } catch (e) {} };
  var savedTheme = safeGet(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    root.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', function () {
      var next = (root.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      safeSet(THEME_KEY, next);
      themeBtn.textContent = next === 'light' ? '🌙' : '☀️';
    });
  }

  // ---- Cookie banner (deferred show so it doesn't block first paint) ----
  var COOKIE_KEY = 'pdftoolkit.cookie';
  if (!safeGet(COOKIE_KEY)) {
    var banner = document.getElementById('cookieBanner');
    if (banner) {
      setTimeout(function () { banner.classList.add('show'); }, 1000);
      var acceptBtn = document.getElementById('cookieAccept');
      if (acceptBtn) acceptBtn.addEventListener('click', function () {
        safeSet(COOKIE_KEY, '1');
        banner.classList.remove('show');
      });
    }
  }

  // ---- Language switcher (two-option pill: 中 | EN) ----
  if (!document.getElementById('langSwitch')) {
    var path = location.pathname;
    var isZh = pathIsZh(path);
    var counterpart = counterpartFor(path);

    var wrap = document.createElement('div');
    wrap.id = 'langSwitch';
    wrap.className = 'lang-switch' + (isZh ? ' lang-switch--zh' : ' lang-switch--en');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language switcher');

    var makeOpt = function (label, opts) {
      if (opts.active) {
        var span = document.createElement('span');
        span.className = 'lang-switch__opt lang-switch__opt--active';
        span.setAttribute('aria-current', 'true');
        span.textContent = label;
        return span;
      }
      var a = document.createElement('a');
      a.className = 'lang-switch__opt lang-switch__opt--alt';
      a.href = counterpart;
      a.setAttribute('hreflang', opts.hreflang);
      a.setAttribute('title', opts.title);
      a.textContent = label;
      // preventDefault + explicit navigation: bulletproof against any
      // service-worker / iframe / href-resolution edge cases.
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setLangPref(opts.hreflang);
        // Visual update immediately so the click feels responsive
        wrap.classList.toggle('lang-switch--loading');
        window.location.assign(counterpart);
      });
      return a;
    };

    if (isZh) {
      wrap.appendChild(makeOpt('中',  { active: true,  hreflang: 'zh' }));
      wrap.appendChild(makeOpt('EN', { active: false, hreflang: 'en', title: 'Switch to English' }));
    } else {
      wrap.appendChild(makeOpt('中',  { active: false, hreflang: 'zh', title: '切换到中文' }));
      wrap.appendChild(makeOpt('EN', { active: true,  hreflang: 'en' }));
    }

    var cta = document.querySelector('.nav-cta');
    if (cta) cta.insertBefore(wrap, cta.firstChild);
    else document.body.appendChild(wrap);

    // SEO: pair with the alternate-language version
    var altLang = isZh ? 'en' : 'zh';
    if (!document.querySelector('link[rel="alternate"][hreflang="' + altLang + '"]')) {
      var alt = document.createElement('link');
      alt.rel = 'alternate';
      alt.hreflang = altLang;
      alt.href = location.origin + counterpart;
      document.head.appendChild(alt);
    }
  }

  // ============================================================
  // Shared tool helpers (window.* so tool pages can use them).
  // ============================================================

  window.fmtSize = function (bytes) {
    if (!bytes && bytes !== 0) return '—';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (bytes >= 1024 && i < u.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(bytes < 10 && i > 0 ? 1 : 0) + ' ' + u[i];
  };

  window.downloadBlob = function (data, filename, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  window.readFileBuffer = function (file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  };

  window.initDropzone = function (selector, cb) {
    var dz = document.querySelector(selector);
    if (!dz) return;
    var input = dz.querySelector('input[type="file"]');
    var prevent = function (e) { e.preventDefault(); e.stopPropagation(); };
    var add = dz.classList, rem = dz.classList;
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { prevent(e); add.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { prevent(e); rem.remove('dragover'); });
    });
    dz.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) cb(files);
    });
    if (input) input.addEventListener('change', function (e) {
      if (e.target.files && e.target.files.length) cb(e.target.files);
    });
  };

  window.renderFileList = function (selector, files, opts) {
    var c = document.querySelector(selector);
    if (!c) return;
    opts = opts || {};
    c.innerHTML = '';
    Array.from(files).forEach(function (f, i) {
      var row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML =
        '<span>📄</span>' +
        '<span class="name">' + f.name + '</span>' +
        '<span class="size">' + window.fmtSize(f.size) + '</span>' +
        '<button class="x" data-i="' + i + '" title="Remove">×</button>';
      row.querySelector('.x').addEventListener('click', function () {
        if (opts.onRemove) opts.onRemove(i); else location.reload();
      });
      c.appendChild(row);
    });
  };

  window.setProgress = function (selector, pct, label) {
    var wrap = document.querySelector(selector);
    if (!wrap) return;
    wrap.classList.add('active');
    var bar = wrap.querySelector('.progress-bar');
    var lab = wrap.querySelector('.progress-label .pct');
    if (typeof pct === 'number' && Number.isFinite(pct)) {
      pct = Math.max(0, Math.min(100, pct));
      if (bar) bar.style.width = pct + '%';
      if (lab) lab.textContent = Math.round(pct) + '%';
    }
    var ltxt = wrap.querySelector('.progress-label .txt');
    if (ltxt && label) ltxt.textContent = label;
  };

  window.showResult = function (selector, html) {
    var r = document.querySelector(selector);
    if (!r) return;
    r.innerHTML = html;
    r.classList.add('active');
  };

  // Library loaders (cached promise so multiple callers don't double-load)
  var libCache = {};
  function loadLib(globalName, src) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (libCache[src]) return libCache[src];
    libCache[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = function () { resolve(window[globalName]); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return libCache[src];
  }
  window.loadPdfJs = function () {
    return loadLib('pdfjsLib',
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js').then(function (lib) {
        if (lib) lib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        return lib;
      });
  };
  window.loadPdfLib = function () { return loadLib('PDFLib',
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'); };
  window.loadFontkit = function () { return loadLib('fontkit',
    'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'); };
  window.loadJSZip = function () { return loadLib('JSZip',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'); };
  window.loadTesseract = function () { return loadLib('Tesseract',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js'); };

  // ---- Service Worker (PWA) ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
