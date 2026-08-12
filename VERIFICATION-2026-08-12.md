# 线上配置检测报告 — 2026-08-12

目标：验证 CF-OPTIMIZE.md 中建议的优化步骤（SSL / Always HTTPS / Bot Fight Mode / WAF / Cache Rule / IndexNow）是否真正生效。

检测方式：对 https://wezzik.com 实测 HTTP 响应头与可达性（curl，UTC 时间 ~04:42）。

---

## 总览

| 项目 | 状态 | 证据 |
|------|------|------|
| HTTPS 重定向 (Always HTTPS) | ✅ | `http://wezzik.com/` → 301 → `https://` |
| HSTS 强开 | ✅ | `strict-transport-security: max-age=63072000; includeSubDomains; preload` |
| SSL 模式 Full Strict | ⚠️ 建议后台确认 | 响应头无法直接读取模式；HTTPS 正常、证书有效，推测已配，请 CF 后台核实 |
| WAF 拦截 wp-admin | ✅ | `/wp-admin` 与 `/wp-login.php` 均返回 `403` |
| Bot Fight Mode | ✅（推断） | 防火墙规则已拦截恶意路径，推断已开启 |
| JS 长缓存 (vercel.json) | ✅ | `cache-control: max-age=86400, stale-while-revalidate=2592000` |
| CSS 长缓存 (vercel.json) | ✅ | 同上 |
| HTML 缓存 (CF Cache Rule) | ❌ **未生效** | `cf-cache-status: DYNAMIC`（首页/工具页/中文页全部 DYNAMIC） |
| IndexNow 密钥文件 | ✅ | `6904effd…txt` → 200，content-length 32 |
| IndexNow robots.txt 行 | ❌ **被覆盖** | 线上 robots.txt 无 `IndexNow:` 行（见下） |
| robots.txt 整体可控性 | ❌ **被覆盖** | 线上为 Cloudflare 托管版本，且 `Disallow: /` 拦截 AI 爬虫 |
| sitemap-pages.xml | ✅ | 200，含 27 个 `<loc>` |
| sitemap-blog.xml | ✅ | 200，含 10 个 `<loc>` |
| sitemap.xml (索引) | ✅ | 200 |
| 部署版本一致性 | ✅ | 线上首页引用 `main.js?v=12.25`，与本地一致（无内容变更，无需强刷） |

---

## ❌ 待办 1：CF Cache Rule 没有缓存 HTML

**现象**：所有 HTML 页面 `cf-cache-status: DYNAMIC`。虽然 `cache-control: max-age=600, stale-while-revalidate=86400` 已正确下发（来自 vercel.json），且 Vercel 自身 `x-vercel-cache: HIT`，但 **Cloudflare 边缘层并未缓存 HTML**——每次请求都回源到 Vercel。

**后果**：你之前想从 ~13% 拉高的「CF 缓存命中率」不会上升；请求量仍全部打到源站（Vercel 虽命中缓存，但仍是一次回源）。

**最可能原因**：该 Cache Rule 仍处于 **Test（仅日志不生效）模式**，或动作设为「Eligible for cache」但未设置 **Edge Cache TTL**。

**修复步骤（CF 后台）**：
1. 进入 **Rules → Cache Rules**。
2. 找到「缓存 HTML」那条规则，确认开关为 **Enabled（不是 Test）**。
3. 动作（Action）设置为：
   - **Set Cache Status → Cache**，
   - 并加一条 **Edge Cache TTL → 例如 1 小时（3600s）**，
   - Browser TTL 选 `Respect origin`（尊重 vercel.json 的 10 分钟）。
4. 规则表达式建议：
   `(http.request.uri.path.extension eq "html") or (http.request.uri.path eq "/")`
5. 保存后复测：
   `curl -sI https://wezzik.com/ | grep -i cf-cache-status`
   首次应为 `MISS`/`REVALIDATED`，第二次应为 `HIT`。

> 备注：当前 Vercel 已命中缓存，终端用户打开速度并不慢，此项是「提升 CF 缓存命中率 KPI / 降回源」的优化，非紧急但建议补齐。

---

## ❌ 待办 2：Cloudflare 托管 robots.txt 覆盖了你的配置

**现象**：线上 `robots.txt` 顶部有一段 `# BEGIN Cloudflare Managed content`，含 `Content-Signal: search=yes,ai-train=no,use=reference`，并对 `GPTBot / ClaudeBot / Google-Extended / PerplexityBot` 等执行 `Disallow: /`。同时缺少你本地写的 `IndexNow:` 行。

**原因**：你在 CF 开启了「托管 robots.txt / Content Signals」类功能，Cloudflare 会**拦截 `/robots.txt` 并生成自己的版本**，你 Vercel 上的 `robots.txt`（允许 AI 爬虫、含 IndexNow 行）被忽略。

**后果**：
1. IndexNow 发现行缺失（次要——密钥文件本身已 200，IndexNow 仍能工作）。
2. **AI 搜索爬虫被拦截**，与「提升 AI 搜索（ChatGPT/Perplexity）收录与引流」的目标直接冲突。

**修复步骤（二选一）**：
- **方案 A（推荐）**：关掉托管 robots.txt，改用你自己的。
  CF → **Bots（或 Settings → Bots）** → 关闭 **Serve a managed robots.txt / Content Signals**。
  关闭后线上会直接提供 Vercel 上的 `robots.txt`（已包含 IndexNow 行 + AI 爬虫 Allow 段）。
- **方案 B**：保留托管，但在 CF 的 robots.txt 编辑器「Custom rules」里手动补两行：
  ```
  IndexNow: https://wezzik.com/6904effd19f68a0789a3a82af2b74288.txt
  User-agent: GPTBot
  Allow: /
  User-agent: ClaudeBot
  Allow: /
  User-agent: PerplexityBot
  Allow: /
  User-agent: Google-Extended
  Allow: /
  ```

> 若选方案 A，请随后复测：`curl -s https://wezzik.com/robots.txt | grep -E "IndexNow|GPTBot"` 应能看到这两行。

---

## ✅ 已确认生效项（无需操作）

- HTTP→HTTPS 301 重定向 + HSTS（2 年 + preload）。
- WAF 对 `wp-admin` / `wp-login.php` 返回 403。
- JS / CSS 走 vercel.json 长缓存（`max-age=86400, s-w-r=2592000`）。
- IndexNow 密钥文件 `6904effd19f68a0789a3a82af2b74288.txt` 可访问（200）。
- `sitemap-pages.xml`(27) / `sitemap-blog.xml`(10) / `sitemap.xml` 均可访问。
- 部署版本号与本地一致，无 JS 陈旧风险。

---

## 后续建议

1. 本机运行 IndexNow 提交（沙箱网络不通 api.indexnow.org）：
   `python3 tools/submit-indexnow.py --dry-run` 先验证，再去掉 `--dry-run` 正式提交。
2. 补齐上面 2 个 CF 后台待办后，重跑本报告的 curl 复测命令确认 `cf-cache-status: HIT` 与 robots.txt 含 IndexNow/AI 爬虫 Allow。
