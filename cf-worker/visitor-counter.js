/**
 * Visitor Counter — Cloudflare Worker + KV
 * 部署到 vc.wezzik.com 子域名，提供给前端 PDF Toolkit AI 使用
 *
 * 路由：
 *   GET /total             → { count: N }        读总数
 *   GET /total/up          → { count: N }        递增总数
 *   GET /daily/YYYY-MM-DD  → { count: N }        读某日计数
 *   GET /daily/YYYY-MM-DD/up → { count: N }      递增某日计数
 *
 * KV 命名空间绑定：VC_KV
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    };

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // 解析路由
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    let key = null;
    let doIncr = false;

    // /total[/up]
    let m = path.match(/^\/total(?:\/(up))?$/);
    if (m) {
      key = 'total';
      doIncr = !!m[1];
    }

    // /daily/YYYY-MM-DD[/up]
    if (!key) {
      m = path.match(/^\/daily\/(\d{4}-\d{2}-\d{2})(?:\/(up))?$/);
      if (m) {
        key = 'daily:' + m[1];
        doIncr = !!m[2];
      }
    }

    if (!key) {
      return json({ error: 'Not found', path, hint: 'Try /total, /total/up, /daily/2026-08-08, /daily/2026-08-08/up' }, 404, corsHeaders);
    }

    // 读写 KV
    try {
      if (doIncr) {
        // 注意：CF KV 的 read-modify-write 在强并发下可能丢更新，
        // 但对个人站访问量统计这种精度要求完全够用。
        const current = parseInt(await env.VC_KV.get(key), 10);
        const next = (Number.isFinite(current) ? current : 0) + 1;
        await env.VC_KV.put(key, String(next));
        return json({ count: next }, 200, corsHeaders);
      } else {
        const v = parseInt(await env.VC_KV.get(key), 10);
        return json({ count: Number.isFinite(v) ? v : 0 }, 200, corsHeaders);
      }
    } catch (err) {
      return json({ error: err.message || 'KV error' }, 500, corsHeaders);
    }
  },
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
