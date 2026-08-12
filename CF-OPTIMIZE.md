# Cloudflare 后台手动优化清单（wezzik.com）

> 代码层（vercel.json 缓存、IndexNow、坏链）已全部部署完毕。
> 以下 5 项需要在 **Cloudflare Dashboard** 手动点击，AI 无 CF API token 无法代操作。
> 目标：加密率 100%、4xx 错误率 <10%、CF 缓存命中率 13% → 40%+。

---

## 1. SSL/TLS → Full (Strict)

**路径**：Cloudflare 控制台 → 选 `wezzik.com` → 左侧 **SSL/TLS** → **Overview**
**操作**：加密模式选 **Full (Strict)**

- Vercel 自带有效证书，Full (Strict) 不会循环跳转。
- 这确保浏览器↔CF↔Vercel 全程 HTTPS，根治"加密请求率 74%"的问题。

---

## 2. 强制 HTTPS（Always Use HTTPS）

**路径**：SSL/TLS → **Edge Certificates**
**操作**：
- 开启 **Always Use HTTPS**（所有 HTTP 请求 301 跳 HTTPS）
- 开启 **Automatic HTTPS Rewrites**

- 配合 vercel.json 里已有的 HTTP→HTTPS 重定向，双重保险。
- 直接把那 25.7% 的明文流量归零。

---

## 3. Bot Fight Mode（砍 4xx 噪音）

**路径**：Security → **Bots**
**操作**：开启 **Bot Fight Mode**（免费版自带）

- 挑战爬虫/扫描器，它们正是 29% 4xx 错误率的主因（扫 `/wp-admin`、`/.env` 等）。
- 开启后预期 4xx 错误率从 29% 降到 10% 以内。

> 可选：若不想让 GPTBot/ClaudeBot 抓（你 robots.txt 里是 Allow），可在 Bots 里把 "Block AI scraping bots" 打开。建议保持 Allow，利于 AI 搜索收录。

---

## 4. WAF 自定义规则拦截扫描路径

**路径**：Security → **WAF** → **Custom Rules** → Create rule
**操作**：新建一条规则

```
WHEN: (URI Path contains "wp-admin")
   OR (URI Path contains "wp-login")
   OR (URI Path contains "xmlrpc.php")
   OR (URI Path contains ".env")
   OR (URI Path contains "phpmyadmin")
THEN: Block
```

- 这些路径你站点根本不存在，100% 是恶意扫描，直接 Block 不浪费源站带宽。

---

## 5. Cache Rule 缓存 HTML（命中率从 13% 起飞）

**路径**：Caching → **Cache Rules** → Create rule
**操作**：

- **IF** (Hostname equals `wezzik.com`) AND (URI Path matches wildcard `/*.html` OR URI Path equals `/`)
- **THEN** → **Cache eligibility**: Eligible for cache
- **Edge TTL**: 1 hour（或选 "Cache everything"）

**为什么需要这条**：
- 免费版 CF 默认对 HTML 标 `DYNAMIC`（不缓存），只对静态资源（js/css/图片）缓存。
- 我已把源站 Cache-Control 改成 `max-age=600, stale-while-revalidate=86400`，但 CF 免费版仍按 DYNAMIC 处理 HTML。
- 这条 Cache Rule 强制 CF 缓存 HTML，命中率会从 13% 跳到 40%+，源站（Vercel）带宽压力骤降。

**安全说明**：
- HTML 不带 `?v=` 版本号，按完整 URL 缓存，每个 URL = 独立内容，安全。
- 语言是路径区分（`/zh/` vs `/`），各自独立缓存键，不会串。
- 部署新 HTML 后最多 1 小时自动刷新，可接受。

---

## 6. 验证（24 小时后看）

Cloudflare 控制台 → **Caching** → 看 **Cache hit ratio**：
- 目标：从 13.38% → **40%+**
- 同时看 **Security** → 4xx 错误率应降到 <10%

---

## 已完成（代码层，无需操作）

| 项 | 状态 |
|---|---|
| JS/CSS 缓存 `max-age=86400, stale-while-revalidate=2592000` | ✅ 线上生效 |
| HTML 缓存 `max-age=600, stale-while-revalidate=86400` | ✅ 源站头已发，CF 缓存待第 5 项 |
| HSTS 头 | ✅ 已存在 |
| IndexNow key 文件 + robots.txt 引用 + 提交脚本 | ✅ key 线上生效 |
| ZH 博客坏链修复（`/tools/`→`/zh/tools/`） | ✅ 线上生效 |
