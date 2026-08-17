/**
 * Visitor Counter — 自包含访问量统计模块
 * 后端：Cloudflare Workers + KV（部署在 https://vc.wezzik.com）
 * 路由：
 *   GET /total                  读总数
 *   GET /total/up               递增总数
 *   GET /daily/YYYY-MM-DD       读某日
 *   GET /daily/YYYY-MM-DD/up    递增某日
 *
 * 防刷：sessionStorage 标记同一会话只递增一次
 * 降级：网络/服务端异常时显示 "—"，不影响页面其他功能
 */
(function () {
  'use strict';

  var API_BASE = 'https://vc.wezzik.com';
  var SESSION_KEY = 'wezzik_vc_session';

  /* ---------- 工具函数 ---------- */

  function getTodayDate() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatNumber(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US');
  }

  function buildUrl(key, incr) {
    // key: 'total' 或 '2026-08-08'
    var path;
    if (key === 'total') {
      path = '/total' + (incr ? '/up' : '');
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      path = '/daily/' + key + (incr ? '/up' : '');
    } else {
      return null;
    }
    return API_BASE + path;
  }

  function animateValue(el, target) {
    if (target == null || isNaN(target)) {
      el.textContent = '—';
      return;
    }
    var duration = 1200;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
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
   * 策略：10s 超时后自动重试一次（间隔 2s），覆盖瞬时抖动。
   */
  function fetchReadOnly(key) {
    var url = buildUrl(key, false);
    if (!url) return Promise.resolve(null);
    var TIMEOUT_MS = 15000;     // 跨境到 Cloudflare Worker 可能较慢，放宽超时
    var RETRY_DELAY_MS = 2000;
    var MAX_ATTEMPTS = 3;       // 最多重试 3 次，覆盖瞬时抖动

    function attempt() {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = null;

      if (controller) {
        timer = setTimeout(function () {
          try { controller.abort(); } catch (e) {}
        }, TIMEOUT_MS);
      }

      var opts = { method: 'GET', cache: 'no-store' };
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

    // 顺序重试：任一次成功立即返回；全部失败回退 null（由调用方显示 "—"）。
    function run(attemptNo) {
      return attempt().then(function (count) {
        if (count !== null) return count;
        if (attemptNo >= MAX_ATTEMPTS) return null;
        return new Promise(function (resolve) {
          setTimeout(function () { run(attemptNo + 1).then(resolve); }, RETRY_DELAY_MS);
        });
      });
    }

    return run(1);
  }

  /**
   * fire-and-forget 递增计数。
   * 浏览器不等响应，服务器拿到请求就会处理递增。
   * 用 no-cors + keepalive 确保页面关闭后请求也能发出。
   */
  function incrementBackground(key) {
    var url = buildUrl(key, true);
    if (!url) return;
    try {
      fetch(url, { mode: 'no-cors', keepalive: true, cache: 'no-store' }).catch(function () {});
    } catch (e) { /* 静默失败 */ }
  }

  /* ---------- 初始化 ---------- */

  function init() {
    if (!injectContainer()) return;

    var alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) { /* sessionStorage 不可用时也正常工作 */ }

    var today = getTodayDate();

    // 新会话：fire-and-forget 递增（不等返回，不阻塞渲染）
    if (!alreadyCounted) {
      incrementBackground('total');
      incrementBackground(today);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
    }

    // 独立渲染：用只读接口获取计数
    fetchReadOnly('total').then(function (count) {
      var el = document.getElementById('vcTotal');
      if (el) animateValue(el, count);
    });
    fetchReadOnly(today).then(function (count) {
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
