/* PDF Toolkit AI — main.js
   Theme toggle, language switcher, shared tool helpers, SW registration. */
(function () {
  'use strict';

  // ---- Sticky language preference ----
  // Persist in a COOKIE (primary). localStorage alone was the root cause of the
  // "English flips back to Chinese on refresh" bug: Safari / Firefox (and strict
  // anti-tracking / private modes) can block or silently drop localStorage writes,
  // so the 'en' choice never stuck and the page fell back to its default language.
  // Cookies survive those restrictions, so the choice now persists across browsers,
  // refreshes and most privacy settings. localStorage is kept as a mirror for parity.
  var LANG_KEY = 'pdftoolkit.lang';
  var getLangPref = function () {
    try {
      var cookies = document.cookie ? document.cookie.split('; ') : [];
      for (var i = 0; i < cookies.length; i++) {
        var parts = cookies[i].split('=');
        if (parts[0] === LANG_KEY) return decodeURIComponent(parts[1] || '');
      }
    } catch (e) {}
    try { var ls = localStorage.getItem(LANG_KEY); if (ls) return ls; } catch (e) {}
    return null;
  };
  var setLangPref = function (v) {
    try {
      document.cookie = LANG_KEY + '=' + encodeURIComponent(v) +
        '; path=/; max-age=31536000; samesite=lax';
    } catch (e) {}
    try { localStorage.setItem(LANG_KEY, v); } catch (e) {}
  };
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

  // ============================================================
  // Site search (navbar) — injected on every page; no HTML edits.
  // ============================================================
  (function () {
    var navInner = document.querySelector('.nav-inner');
    if (!navInner) return;
    var isZh = pathIsZh(location.pathname);

    var IDX = [
      { ic:'🗜️', u:'tools/compress.html',
        e:{t:'Compress PDF', k:'compress shrink reduce size smaller 100kb optimize', d:'Make a PDF smaller, keep quality'},
        z:{t:'压缩 PDF', k:'压缩 缩小 减小 体积 100kb 优化', d:'减小 PDF 体积，保持清晰度'} },
      { ic:'🔗', u:'tools/merge.html',
        e:{t:'Merge PDF', k:'merge combine join concatenate multiple files', d:'Combine several PDFs into one'},
        z:{t:'合并 PDF', k:'合并 拼接 结合 多个文件', d:'把多个 PDF 合并成一个'} },
      { ic:'✂️', u:'tools/split.html',
        e:{t:'Split PDF', k:'split cut extract pages separate divide', d:'Split a PDF into separate files'},
        z:{t:'拆分 PDF', k:'拆分 分割 提取 页面 分开', d:'把一个 PDF 拆成多个文件'} },
      { ic:'🔄', u:'tools/rotate-pdf.html',
        e:{t:'Rotate PDF', k:'rotate turn flip orientation degrees page', d:'Rotate PDF pages'},
        z:{t:'旋转 PDF', k:'旋转 翻转 方向 角度 页面', d:'旋转 PDF 页面'} },
      { ic:'🗑️', u:'tools/remove-pages.html',
        e:{t:'Remove Pages', k:'delete remove pages extract drop', d:'Delete unwanted pages from a PDF'},
        z:{t:'删除页面', k:'删除 移除 页面 提取', d:'从 PDF 中删除不需要的页面'} },
      { ic:'🧽', u:'tools/remove-watermark.html',
        e:{t:'Remove Watermark', k:'watermark remove delete clean', d:'Strip watermarks from a PDF'},
        z:{t:'去除水印', k:'水印 去除 删除 清理', d:'清除 PDF 上的水印'} },
      { ic:'🔏', u:'tools/remove-metadata.html',
        e:{t:'Remove Metadata', k:'metadata remove properties info privacy', d:'Strip hidden metadata for privacy'},
        z:{t:'移除元数据', k:'元数据 属性 信息 隐私 去除', d:'清除隐藏元数据，保护隐私'} },
      { ic:'📝', u:'tools/pdf-to-word.html',
        e:{t:'PDF to Word', k:'word doc docx convert office document', d:'Turn a PDF into an editable Word file'},
        z:{t:'PDF 转 Word', k:'word 文档 docx 转换 可编辑', d:'把 PDF 转成可编辑的 Word'} },
      { ic:'📊', u:'tools/pdf-to-excel.html',
        e:{t:'PDF to Excel', k:'excel xlsx spreadsheet csv table convert', d:'Extract tables into Excel'},
        z:{t:'PDF 转 Excel', k:'excel 表格 xlsx csv 转换', d:'把表格提取到 Excel'} },
      { ic:'🖼️', u:'tools/pdf-to-image.html',
        e:{t:'PDF to Image', k:'image jpg png photo picture convert export', d:'Save PDF pages as JPG/PNG'},
        z:{t:'PDF 转图片', k:'图片 jpg png 照片 导出 转换', d:'把 PDF 页面存成 JPG/PNG'} },
      { ic:'👁️', u:'tools/ocr.html',
        e:{t:'PDF OCR', k:'ocr text recognize scan image extract words', d:'Turn scanned PDFs into searchable text'},
        z:{t:'PDF 文字识别', k:'ocr 文字 识别 扫描 提取', d:'把扫描件变成可搜索文字'} },
      { ic:'🤖', u:'tools/ai-summary.html',
        e:{t:'AI Summary', k:'summary ai summarize condense key points', d:'Get an instant AI summary of any PDF'},
        z:{t:'AI 摘要', k:'摘要 总结 ai 要点 概括', d:'一键生成 PDF 的 AI 摘要'} },
      { ic:'💬', u:'tools/chat-with-pdf.html',
        e:{t:'Chat with PDF', k:'chat ask question talk qa answer', d:'Ask questions about your PDF'},
        z:{t:'与 PDF 对话', k:'对话 提问 问答 询问', d:'向 PDF 提问，立即得到答案'} },
      { ic:'🧾', u:'tools/invoice-pdf.html',
        e:{t:'Invoice Generator', k:'invoice bill receipt generator create business', d:'Create a professional invoice'},
        z:{t:'发票生成器', k:'发票 账单 收据 生成 商务', d:'生成专业的发票'} },
      { ic:'📋', u:'tools/resume-pdf.html',
        e:{t:'Resume Builder', k:'resume cv builder template job', d:'Build a clean resume PDF'},
        z:{t:'简历制作', k:'简历 cv 模板 求职 生成', d:'制作简洁的简历 PDF'} },
      { ic:'📸', u:'tools/extract-images.html',
        e:{t:'Extract Images', k:'extract images pictures photos pull out', d:'Pull all images out of a PDF'},
        z:{t:'提取图片', k:'提取 图片 照片 导出', d:'从 PDF 中提取所有图片'} },
      { ic:'📤', u:'convert-pdf.html',
        e:{t:'Convert PDF (category)', k:'convert category hub', d:'All PDF conversion tools'},
        z:{t:'转换 PDF（分类）', k:'转换 分类 合集', d:'所有 PDF 转换工具'} },
      { ic:'✏️', u:'edit-pdf.html',
        e:{t:'Edit PDF (category)', k:'edit category hub', d:'All PDF editing tools'},
        z:{t:'编辑 PDF（分类）', k:'编辑 分类 合集', d:'所有 PDF 编辑工具'} },
      { ic:'⚡', u:'ai-pdf-tools.html',
        e:{t:'AI PDF Tools (category)', k:'ai category hub', d:'AI-powered PDF tools'},
        z:{t:'AI PDF 工具（分类）', k:'人工智能 分类 合集', d:'AI 驱动的 PDF 工具'} },
      { ic:'💼', u:'business-pdf-tools.html',
        e:{t:'Business PDF (category)', k:'business invoice resume category', d:'Business document tools'},
        z:{t:'商务 PDF（分类）', k:'商务 发票 简历 分类', d:'商务文档工具'} },
      { ic:'📰', u:'blog.html',
        e:{t:'Blog & Guides', k:'blog article guide tutorial help', d:'Tips, guides and how-tos'},
        z:{t:'博客与指南', k:'博客 文章 指南 教程 帮助', d:'技巧、指南与教程'} }
    ];

    var placeholder = isZh ? '搜索工具…' : 'Search tools…';
    var aria = isZh ? '搜索工具' : 'Search tools';
    var title = isZh ? '搜索工具（⌘K）' : 'Search tools (⌘K)';
    var kbdHint = (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '')) ? '⌘K' : 'Ctrl K';

    // Floating top-right widget (collapsed by default).
    var box = document.createElement('div');
    box.className = 'nav-search nav-search--collapsed';
    box.innerHTML =
      '<button type="button" class="nav-search__pill" aria-label="' + aria + '" aria-expanded="false" title="' + title + '">' +
        '<svg class="nav-search__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
        '<span class="nav-search__pill-label">' + (isZh ? '搜索' : 'Search') + '</span>' +
        '<kbd class="nav-search__kbd" aria-hidden="true">' + kbdHint + '</kbd>' +
      '</button>' +
      '<div class="nav-search__panel" aria-label="' + aria + '" hidden>' +
        '<div class="nav-search__panelHead">' +
          '<svg class="nav-search__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input type="text" class="nav-search__input" placeholder="' + placeholder + '" autocomplete="off" spellcheck="false" aria-label="' + aria + '" />' +
          '<button type="button" class="nav-search__clear" aria-label="Clear" hidden>×</button>' +
        '</div>' +
        '<div class="nav-search__results"></div>' +
        '<div class="nav-search__hint">' + (isZh ? '↑↓ 选择 · Enter 打开 · Esc 关闭' : '↑↓ navigate · Enter open · Esc close') + '</div>' +
      '</div>';

    // Anchor to <body> so the floating widget sits in the viewport top-right
    // regardless of where it would otherwise land in the DOM tree.
    document.body.appendChild(box);

    var pill = box.querySelector('.nav-search__pill');
    var input = box.querySelector('.nav-search__input');
    var clearBtn = box.querySelector('.nav-search__clear');
    var resultsBox = box.querySelector('.nav-search__results');
    var active = -1;
    var results = [];
    var isOpen = false;

    var absUrl = function (u) { return location.origin + (isZh ? '/zh/' : '/') + u; };

    function score(item, q) {
      var e = item.e, z = item.z;
      var hay = (e.t + ' ' + e.k + ' ' + e.d + ' ' + z.t + ' ' + z.k + ' ' + z.d).toLowerCase();
      if (hay.indexOf(q) === -1) return -1;
      var tl = (isZh ? z.t : e.t).toLowerCase();
      if (tl.indexOf(q) === 0) return 3;
      if (tl.indexOf(q) !== -1) return 2;
      if ((isZh ? z.k : e.k).toLowerCase().indexOf(q) !== -1) return 1;
      return 0;
    }

    function bindItems() {
      var items = panel.querySelectorAll('.nav-search__item');
      for (var i = 0; i < items.length; i++) {
        (function (el) {
          el.addEventListener('click', function (ev) {
            ev.preventDefault();
            var idx = +el.getAttribute('data-i');
            if (results[idx]) window.location.assign(absUrl(results[idx].item.u));
          });
          el.addEventListener('mousemove', function () { setActive(+el.getAttribute('data-i')); });
        })(items[i]);
      }
    }

    function setActive(i) {
      var items = resultsBox.querySelectorAll('.nav-search__item');
      if (i < -1) i = items.length - 1;
      if (i >= items.length) i = -1;
      active = i;
      for (var k = 0; k < items.length; k++) items[k].classList.toggle('is-active', k === i);
    }

    function openPanel() {
      if (isOpen) { input.focus(); return; }
      isOpen = true;
      box.classList.remove('nav-search--collapsed');
      box.classList.add('nav-search--open');
      pill.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      // Defer focus to next frame so the transition can start smoothly.
      setTimeout(function () { input.focus(); }, 10);
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      box.classList.remove('nav-search--open');
      box.classList.add('nav-search--collapsed');
      pill.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      active = -1;
      results = [];
      input.value = '';
      clearBtn.hidden = true;
      resultsBox.innerHTML = '';
    }

    function render(q) {
      var ql = q.toLowerCase();
      results = [];
      for (var i = 0; i < IDX.length; i++) {
        var s = score(IDX[i], ql);
        if (s >= 0) results.push({ item: IDX[i], s: s });
      }
      results.sort(function (a, b) { return b.s - a.s; });
      results = results.slice(0, 8);
      active = -1;
      if (!results.length) {
        resultsBox.innerHTML = '<div class="nav-search__empty">' + (isZh ? '没有找到匹配的工具' : 'No matching tools found') + '</div>';
        return;
      }
      var html = '';
      for (var j = 0; j < results.length; j++) {
        var it = results[j].item;
        var name = isZh ? it.z.t : it.e.t;
        var desc = isZh ? it.z.d : it.e.d;
        html += '<a class="nav-search__item" role="option" data-i="' + j + '" href="' + absUrl(it.u) + '">' +
                  '<span class="emoji">' + it.ic + '</span>' +
                  '<span class="meta"><span class="t">' + name + '</span><span class="d">' + desc + '</span></span>' +
                '</a>';
      }
      resultsBox.innerHTML = html;
      bindItems();
    }

    // ---- Wire up controls ----
    pill.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) closePanel(); else openPanel();
    });

    input.addEventListener('input', function () {
      var v = input.value.trim();
      clearBtn.hidden = !v;
      if (!v) { resultsBox.innerHTML = ''; active = -1; return; }
      render(v);
    });
    input.addEventListener('focus', function () { if (input.value.trim()) render(input.value.trim()); });
    clearBtn.addEventListener('click', function () { input.value = ''; clearBtn.hidden = true; resultsBox.innerHTML = ''; input.focus(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') {
        if (active >= 0 && results[active]) { e.preventDefault(); window.location.assign(absUrl(results[active].item.u)); }
      } else if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
    });

    // Click outside the widget closes the panel.
    document.addEventListener('click', function (e) { if (isOpen && !box.contains(e.target)) closePanel(); });

    // Global keyboard shortcuts: Cmd/Ctrl+K and "/" expand & focus the panel.
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openPanel();
        return;
      }
      if (e.key === '/' && !['INPUT','TEXTAREA'].includes((document.activeElement && document.activeElement.tagName) || '')) {
        var ce = document.activeElement;
        if (ce && ce.isContentEditable) return;
        e.preventDefault();
        openPanel();
      }
    });
  })();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
