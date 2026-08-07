# Cloudflare 配置指南（针对 wezzik.com / PDF Toolkit AI）

> **背景**：本站部署在 Vercel（pdf-toolkit-ai.vercel.app），通过 Cloudflare CDN/代理对外提供 https://wezzik.com 服务。Cloudflare 的"安全/缓存/错误"Analytics 直接反映了 wezzik.com 在用户面前的真实数据。
>
> **目标**：在 24-72 小时内让 dashboard 上三个指标达到合理水平：
> - 加密请求率：79.17% → **100%**
> - 缓存请求率：11.39% → **50-70%**
> - 4xx 错误率：28.55% → **<5%**

---

## 一、加密请求率 79.17% → 100%

### 根因
约 20% 的非加密流量来自：
1. 监控机器人（UptimeRobot、StatusCake 等）默认用 HTTP 探活
2. 爬虫从历史 HTTP 链接访问
3. 用户在地址栏敲入 `wezzik.com`（会被 Cloudflare 自动升级到 HTTPS，所以这部分应该已经是 100%）

### 步骤 1：开启 Always Use HTTPS（强制 301）
1. 登录 https://dash.cloudflare.com/，选择 `wezzik.com`
2. 左侧菜单 **SSL/TLS** → **Edge Certificates**
3. 找到 **Always Use HTTPS** → 开关拨到 **ON**

效果：所有 HTTP 请求立即 301 重定向到 HTTPS。

### 步骤 2：开启 HSTS（含 Preload，永久生效）
1. 还是 **Edge Certificates** 页面
2. **HTTP Strict Transport Security (HSTS)** → 启用
3. 配置：
   - Max Age: **12 months**（Vercel 配置的是 2 年，但 Cloudflare 这边 12 个月即可作为兜底）
   - ✅ Include subdomains
   - ✅ No-sniff
   - ✅ Preload
4. 等待 24 小时后访问 https://hstspreload.org/?domain=wezzik.com 提交到浏览器厂商列表

### 步骤 3：最低 TLS 版本
1. **SSL/TLS** → **Edge Certificates**
2. **Minimum TLS Version** → **TLS 1.2**（不建议 < 1.0）
3. **Opportunistic Encryption** → ON
4. **TLS 1.3** → ON

### 步骤 4：监控机器人/HTTP-only 抓取
加密请求率到不了 100% 通常是因为：
- Bot 直接用 `http://yourdomain.com/health` 这种格式
- 这是正常的，可以忽略
- Cloudflare 自带的 Bot Management 会自动处理大部分

---

## 二、缓存请求率 11.39% → 50-70%

### 根因（针对 PDF Toolkit AI 的特点）
- **HTML 页面不缓存**（合理）：每次动态返回 → 占比 ~70-80%
- **静态资源**（CSS/JS/SVG/PNG/ICO）：被缓存，但只占小流量
- 总体命中率 = 静态资源 / 总流量 → 11%

### 步骤 1：开启 Auto-Minify（损失小但能减小传输）
1. **Speed** → **Optimization**
2. **Auto Minify**: 勾选 ✅ HTML, ✅ CSS, ✅ JavaScript

### 步骤 2：Cache Rules（核心配置）
1. **Caching** → **Cache Rules** → **Create rule**
2. 创建 3 条规则（顺序很重要：HTML 优先、Static 其次、Default 兜底）

#### Rule A: 静态资源 → Edge Cache 1 年
- Name: `Cache static assets for 1 year`
- Match: `(http.request.uri.path matches "/assets/.*") or (http.request.uri.path matches "/(favicon|favicon-.*|apple-touch-icon).*") or (http.request.uri.path matches "/.*\\.(ico|png|jpg|jpeg|webp|svg|woff2?|ttf)$")`
- Action: **Cache eligible** → Edge TTL: 1 year, Browser TTL: 1 year

#### Rule B: JS/CSS → Edge Cache 30 天
- Name: `Cache JS/CSS for 30 days`
- Match: `(http.request.uri.path matches "/(css|js)/.*")`
- Action: **Cache eligible** → Edge TTL: 30 days, Browser TTL: 30 days

#### Rule C: HTML → 不缓存 CDN，但浏览器缓存 5 分钟
- Name: `Bypass cache for HTML but allow browser cache`
- Match: `(http.request.uri.path matches "/.*\\.html") or (http.request.uri.path eq "/")`
- Action: **Cache eligible** → Edge TTL: 5 minutes, Browser TTL: 5 minutes

### 步骤 3：开启 Browser Cache TTL
1. **Caching** → **Configuration**
2. **Browser Cache TTL**: 设置为 **Respect Existing Headers**（让 Vercel 源站的 Cache-Control 起作用）

### 步骤 4：清掉旧缓存（部署后立即）
1. **Caching** → **Configuration** → **Purge Cache** → **Purge Everything**
2. 这样下次访问会按新规则缓存

---

## 三、4xx 错误率 28.55% → < 5%

### 根因（已诊断 + 修复）
✅ **已修复**（v12.1 部署 2026-08-06）：
| 原因 | 修复 |
|---|---|
| **缺失 `/favicon.ico`** | ✅ 已添加 3 尺寸 ICO（16/32/48） |
| **manifest.json 引用 `icon-192/512.png` 缺失** | ✅ 已生成 192/512 PNG |
| **4 个分类页引用 `compress.html`（应是 `tools/compress.html`）** | ✅ 已修复 24 个链接 |
| **4 个分类页引用 `guides.html`（不存在，已替换为 `blog.html`）** | ✅ 已修复 24 个链接 |
| **6 个工具页导航缺 `../` 前缀** | ✅ 已修复 12 个链接（chat/invoice/pdf-to-word/pdf-to-excel/resume/rotate） |

部署后这些资源全部 200：
```
/favicon.ico: 200 (3553b)
/apple-touch-icon.png: 200 (20112b)
/manifest.json: 200
/assets/icons/icon-192.png: 200
/assets/icons/icon-512.png: 200
```

### 剩余可能 4xx（Cloudflare 侧配置）
- **爬虫扫描常见路径**（`/wp-admin`、`/.env`、`/.git/config`）：不需要修复，这是噪声
- **Cloudflare 自身错误**：保持 Email Routing/Bot Fight Mode 配置好即可

### 步骤 1：开启 Bot Fight Mode
1. **Security** → **Bots** → **Bot Fight Mode** → ON
   - 自动挑战可疑 bot，大部分嗅探流量在源头被拦
2. **Security** → **Bots** → **AI Bots** → 选择拦截（拦截 GPTBot/ClaudeBot 等训练型爬虫）

### 步骤 2：设置自定义 404
1. **Caching** → **Configuration** → **Custom Error Pages**
2. 添加 **404** → https://wezzik.com/404.html
3. （Vercel/项目本身已经有 404.html，自动 fallback）

### 步骤 3：Email Routing 拦截钓鱼扫描
1. **Email** → **Email Routing** → **Routes**
2. 启用 Catch-all 地址保护

### 步骤 4：验证
curl 测试以下 URL，确认全部 200：
```bash
for p in /favicon.ico /apple-touch-icon.png /manifest.json \
         /assets/icons/icon-192.png /assets/icons/icon-512.png \
         /robots.txt /sitemap.xml; do
  echo "$p: $(curl -s -o /dev/null -w '%{http_code}' https://wezzik.com$p)"
done
```

---

## 四、预期结果（部署后 24-72 小时）

| 指标 | 当前 | 目标 | 备注 |
|---|---|---|---|
| 加密请求率 | 79.17% | **100%** | Always Use HTTPS 开启后立刻生效 |
| 缓存请求率 | 11.39% | **50-70%** | Cache Rules 生效需要 24h（看流量累积） |
| 4xx 错误率 | 28.55% | **<5%** | favicon 修复立刻能减 60%+，Bot Fight 后能减到 < 5% |
| 5xx 错误率 | 0.08% | **<0.1%** | 已经健康 |

### 关键观察期
- **0-1 小时**：HTTP→HTTPS 立刻生效，加密率上 100%
- **24-72 小时**：缓存规则生效，命中率翻倍
- **7 天**：4xx 错误率回归正常水平

---

## 五、常见误区

### ❌ 不要开启 "Cache Everything" 给所有路径
HTML 页面会被锁住缓存，用户永远看不到更新。一定要按规则分类。

### ❌ 不要设置 Edge TTL > 0 给 HTML 页面
这会导致内容更新延迟。HTML 永远走 must-revalidate。

### ❌ 不要关闭 Cloudflare Proxy（橙色云朵）
不代理则 Cloudflare 看不到任何流量，Analytics 失效。

### ✅ 部署后建议 Purge Everything
Vercel 部署后：
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer <CF_API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```
或者在 Cloudflare 后台 → Caching → Purge Cache → Purge Everything

---

## 六、关键位置速查

| 配置项 | 路径 |
|---|---|
| HTTPS 强制 | SSL/TLS → Edge Certificates |
| HSTS | SSL/TLS → Edge Certificates |
| Cache Rules | Caching → Cache Rules |
| Bot Fight | Security → Bots |
| Custom 404 | Caching → Configuration |
| Email Routing | Email → Email Routing |

---

**文档版本**：2026-08-06
**作者**：PDF Toolkit AI 团队
