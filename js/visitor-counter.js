/**
 * Visitor Counter — 自包含访问量统计模块
 * 使用 api.counterapi.dev 免费计数服务
 * 防刷：sessionStorage 标记同一会话只递增一次
 */
(function () {
  'use strict';

  var NAMESPACE = 'wezzik-com';
  var API_BASE = 'https://api.counterapi.dev/v1/' + NAMESPACE;
  var SESSION_KEY = 'wezzik_vc_session';

  /* ---------- 工具函数 ---------- */

  function getTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return 'daily-' + y + '-' + m + '-' + day;
  }

  function formatNumber(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US');
  }

  function animateValue(el, target) {
    if (target == null || isNaN(target)) {
      el.textContent = '—';
      return;
    }
    var duration = 1200;
    var start = 0;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = formatNumber(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatNumber(target);
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------- 注入统计容器 ---------- */

  function injectContainer() {
    var footer = document.querySelector('.footer');
    if (!footer) return false;

    // 避免重复注入
    if (document.getElementById('visitorStats')) return true;

    var container = footer.querySelector('.container');
    if (!container) return false;

    var stats = document.createElement('div');
    stats.id = 'visitorStats';
    stats.className = 'visitor-stats';
    stats.innerHTML =
      '<div class="stat-item">' +
        '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>' +
        '<span class="stat-label">Total Visits</span>' +
        '<span class="stat-value" id="vcTotal">—</span>' +
      '</div>' +
      '<div class="stat-divider"></div>' +
      '<div class="stat-item">' +
        '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' +
        '<span class="stat-label">Today</span>' +
        '<span class="stat-value" id="vcToday">—</span>' +
      '</div>';

    // 插入到 footer-bottom 之前
    var footerBottom = container.querySelector('.footer-bottom');
    if (footerBottom) {
      container.insertBefore(stats, footerBottom);
    } else {
      container.appendChild(stats);
    }
    return true;
  }

  /* ---------- 计数逻辑 ---------- */

  /**
   * 只读获取计数（带尾斜杠避免 301）。
   * counterapi.dev 服务波动大，单次请求可能在 4s~30s+ 之间。
   * 策略：12s 超时后自动重试一次（间隔 2s），覆盖瞬时抖动。
   */
  function fetchReadOnly(key) {
    var url = API_BASE + '/' + key + '/';
    var TIMEOUT_MS = 12000;
    var RETRY_DELAY_MS = 2000;

    function attempt() {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = null;

      if (controller) {
        timer = setTimeout(function () {
          try { controller.abort(); } catch (e) {}
        }, TIMEOUT_MS);
      }

      var opts = { method: 'GET' };
      if (controller) opts.signal = controller.signal;

      return fetch(url, opts)
        .then(function (r) {
          if (timer) { clearTimeout(timer); timer = null; }
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (data) {
          return (data && typeof data.count === 'number') ? data.count : null;
        })
        .catch(function () {
          if (timer) { clearTimeout(timer); timer = null; }
          return null;
        });
    }

    // 首次失败 → 等 2s → 重试一次。再失败就返回 null（显示 —）
    return attempt().then(function (count) {
      if (count !== null) return count;
      return new Promise(function (resolve) {
        setTimeout(function () { attempt().then(resolve); }, RETRY_DELAY_MS);
      });
    });
  }

  /**
   * fire-and-forget 递增计数。
   * counterapi.dev 的 /up 端点极慢（30s+），不能等它返回再渲染。
   * 用 no-cors + keepalive 发出请求即可，服务器会处理递增，浏览器不等响应。
   */
  function incrementBackground(key) {
    var url = API_BASE + '/' + key + '/up';
    try {
      fetch(url, { mode: 'no-cors', keepalive: true }).catch(function () {});
    } catch (e) { /* 静默失败 */ }
  }

  /* ---------- 初始化 ---------- */

  function init() {
    if (!injectContainer()) return;

    var alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) { /* sessionStorage 不可用时也正常工作 */ }

    var todayKey = getTodayKey();

    // 新会话：fire-and-forget 递增（不等返回，不阻塞渲染）
    if (!alreadyCounted) {
      incrementBackground('total');
      incrementBackground(todayKey);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
    }

    // 独立渲染：用只读接口获取计数（~8s），两个互不阻塞
    fetchReadOnly('total').then(function (count) {
      var el = document.getElementById('vcTotal');
      if (el) animateValue(el, count);
    });
    fetchReadOnly(todayKey).then(function (count) {
      var el = document.getElementById('vcToday');
      if (el) animateValue(el, count);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
