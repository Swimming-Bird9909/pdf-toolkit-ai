# Google Search Console 配置指南 — wezzik.com（Cloudflare DNS 版）

> 一步一步操作 · 约 15 分钟完成 · DNS 已确认走 Cloudflare

---

## 你的域名架构（先搞清楚）

```
用户浏览器
    ↓
Cloudflare（DNS + 代理 + SSL + 缓存）
    ↓ 回源
Vercel（托管 pdf-toolkit-ai 站点）
```

- **域名注册商**：Namecheap（买域名的地方，续费用）
- **DNS 管理**：Cloudflare（`kristin.ns.cloudflare.com` / `finley.ns.cloudflare.com`）
- **网站托管**：Vercel（pdf-toolkit-ai 项目）

**关键**：GSC 的验证 TXT 记录必须加在 **Cloudflare** 里，不是 Vercel，不是 Namecheap。

---

## 第 1 步：登录 GSC 并添加域名属性

1. 打开 https://search.google.com/search-console/welcome
2. 用你的 Google 账号登录（建议用和 Google Analytics / YouTube 同一个账号）

3. 你会看到两个选项：

```
┌─────────────────────────────────┬──────────────────────────────────┐
│  Domain                         │  URL prefix                      │
│  (推荐 ✅)                       │                                  │
│                                 │                                  │
│  输入: wezzik.com               │  输入: https://wezzik.com        │
│                                 │                                  │
│  覆盖: 所有子域名 + http/https   │  仅覆盖输入的精确前缀             │
│  验证: TXT 记录                  │  验证: HTML / TXT / CNAME 等     │
└─────────────────────────────────┴──────────────────────────────────┘
```

4. **选左边的 "Domain"**（推荐），输入 `wezzik.com`，点 **Continue**

5. GSC 会显示一个验证页面，类似：

```
┌──────────────────────────────────────────────────────┐
│  Verify ownership                                     │
│                                                       │
│  Choose verification method:                          │
│  ● TXT record (recommended)                           │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ google-site-verification=AbCdEfGhIjKlMnOp...   │ │
│  │                              [📋 Copy]           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Add this TXT record to your DNS provider.            │
│  Then come back and click "Verify".                   │
│                                                       │
│              [ Verify ]   [ Cancel ]                  │
└──────────────────────────────────────────────────────┘
```

6. **点 📋 Copy 按钮**，把 `google-site-verification=xxxxx` 这串复制到剪贴板

7. **先别点 Verify**，新开一个浏览器标签页，去 Cloudflare 加 TXT 记录

---

## 第 2 步：在 Cloudflare 添加 TXT 验证记录

1. 打开 https://dash.cloudflare.com → 登录

2. 在首页你会看到你的域名列表，点 **wezzik.com**

```
┌──────────────────────────────────────┐
│  Your websites                       │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ wezzik.com                  →  │ │
│  │ Active                         │ │
│  └────────────────────────────────┘ │
│                                      │
│  [+ Add a site]                      │
└──────────────────────────────────────┘
```

3. 进入域名后，看左侧菜单栏，点 **DNS** → **Records**

```
左侧菜单：
┌──────────────────┐
│ ⚡ Overview       │
│ 🔍 Analytics      │
│ 🌐 DNS           ← 点这个
│   ↳ Records      ← 默认子页
│   ↳ Caching      │
│ ⚡ Rules          │
│ 🔒 SSL/TLS        │
│ ...               │
└──────────────────┘
```

4. 在 DNS Records 页面，点右上角 **+ Add record** 按钮

5. 填写表单（照着填，不要改）：

```
┌─────────────────────────────────────────────────────────────┐
│  Add DNS record                                              │
│                                                               │
│  Type:    [TXT ▼]          ← 选 TXT                           │
│                                                               │
│  Name:    [@]               ← 输入 @（代表根域 wezzik.com）   │
│            ↑ 自动显示为 wezzik.com                            │
│                                                               │
│  Content: [google-site-verification=AbCdEfGhIjKlMnOp...]     │
│            ↑ 粘贴第 1 步复制的完整字符串                       │
│            ↑ 一整行粘贴，不要加引号，不要截断                   │
│                                                               │
│  TTL:     [Auto ▼]         ← 保持默认                         │
│                                                               │
│           (TXT 记录没有橙色云朵代理选项，不用担心)             │
│                                                               │
│                    [ Save ]   [ Cancel ]                      │
└─────────────────────────────────────────────────────────────┘
```

**注意事项**：
- `Name` 填 `@` 不是 `wezzik.com`（Cloudflare 会自动补全域名后缀）
- `Content` 是一整行 `google-site-verification=xxxx`，不要手动拆分
- 不要加引号、不要换行、不要前后空格
- TTL 选 Auto 就行（Cloudflare 会自动管理）

6. 点 **Save**

7. 你会在 DNS Records 列表里看到新加的 TXT 记录：

```
┌──────────────────────────────────────────────────────────────┐
│  Type  │ Name        │ Content                              │ │
│────────┼────────────┼──────────────────────────────────────│ │
│  A     │ wezzik.com  │ 104.21.66.222 (Proxied)             │ │
│  A     │ wezzik.com  │ 172.67.164.180 (Proxied)            │ │
│  TXT   │ wezzik.com  │ google-site-verification=AbCdEf...  │ │  ← 新加的
│  ...   │             │                                      │ │
└──────────────────────────────────────────────────────────────┘
```

---

## 第 3 步：回到 GSC 点 Verify

1. 切回 GSC 标签页

2. 点 **Verify** 按钮

**情况 A：立即成功**（运气好的话，Cloudflare DNS 传播很快）
```
┌──────────────────────────────────────┐
│  ✓ Ownership verified                 │
│                                       │
│  Your site property is now verified.  │
│  [ Go to Property » ]                 │
└──────────────────────────────────────┘
```
→ 跳到第 4 步

**情况 B：失败 "Verification record not found"**
→ 正常，DNS 还没传播，等 5-10 分钟再点 Verify

**验证 DNS 是否已传播**（可选，在 Mac 终端跑）：
```bash
nslookup -type=TXT wezzik.com 1.1.1.1
```
如果输出里能看到 `google-site-verification=xxxx`，说明 DNS 已传播，可以回 GSC 点 Verify 了。

**情况 C：多次失败（超过 30 分钟）**
→ 检查：
- TXT 记录的 Content 是不是完整复制了（一字不差）
- Name 是不是 `@`（不是 `www` 也不是 `_acme`）
- 有没有多加空格或引号
- Cloudflare 里是否保存成功（刷新 DNS Records 页面确认）

---

## 第 4 步：提交 Sitemap

1. 验证成功后，进入 GSC 主面板

2. 左侧菜单点 **Sitemaps**

```
左侧菜单：
┌──────────────────────────┐
│ 📊 Performance            │
│ 🔍 URL inspection         │
│ 📋 Coverage               │
│ 📈 Sitemaps        ← 点这个 │
│ 🗑️ Removals               │
│ ...                       │
└──────────────────────────┘
```

3. 在顶部输入框填入：`sitemap.xml`

```
┌────────────────────────────────────────────────────────┐
│  Add a new sitemap                                     │
│                                                        │
│  https://wezzik.com/[sitemap.xml]   [ Submit ]        │
│                                                        │
│  Submitted sitemaps                                    │
│  ┌──────────┬──────────┬─────────┬──────────────┐    │
│  │ URL      │ Status   │ Type    │ Last read    │    │
│  ├──────────┼──────────┼─────────┼──────────────┤    │
│  │sitemap.xml│ Success  │ sitemap │ Just now     │    │
│  └──────────┴──────────┴─────────┴──────────────┘    │
└────────────────────────────────────────────────────────┘
```

4. 点 **Submit**

5. 你提交的是 sitemap index，GSC 会自动发现里面的子 sitemap：
   - `sitemap-pages.xml`（24 个页面）
   - `sitemap-blog.xml`（7 篇博客）

6. 等几秒刷新页面，应该看到 Status = **Success**，Discovered URLs 数字会逐渐增长

---

## 第 5 步：手动加速首页收录（可选但推荐）

1. 左侧菜单点 **URL inspection**

2. 在搜索框输入 `https://wezzik.com/`，回车

3. GSC 会查询这个 URL 的收录状态（新站通常显示 "URL is not on Google"）

4. 点 **Request Indexing** 按钮

```
┌──────────────────────────────────────────────┐
│  URL inspection                               │
│                                               │
│  https://wezzik.com/                          │
│                                               │
│  ┌──────────────────────────────────────────┐│
│  │ URL is not on Google                     ││
│  │                                           ││
│  │ [ Request indexing ]  [ View report ]    ││
│  │                                           ││
│  │ Click "Request indexing" to ask Google   ││
│  │ to crawl this URL.                       ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

5. 重复以下 9 个核心 URL（每天有 10-12 次配额，分两天做完）：

| URL | 优先级 |
|-----|--------|
| `https://wezzik.com/` | ⭐⭐⭐ |
| `https://wezzik.com/convert-pdf.html` | ⭐⭐⭐ |
| `https://wezzik.com/edit-pdf.html` | ⭐⭐⭐ |
| `https://wezzik.com/ai-pdf-tools.html` | ⭐⭐⭐ |
| `https://wezzik.com/business-pdf-tools.html` | ⭐⭐ |
| `https://wezzik.com/contact.html` | ⭐⭐ |
| `https://wezzik.com/blog.html` | ⭐⭐ |
| `https://wezzik.com/blog/index.html` | ⭐ |
| `https://wezzik.com/privacy-policy.html` | ⭐ |

---

## ⚠️ Cloudflare 专属注意事项

### A. 关闭 AI Bot 屏蔽（让 GPTBot/ClaudeBot 能爬你的站）

Cloudflare 默认会屏蔽 AI 爬虫，这会影响你的站被 AI 搜索引擎收录。

1. Cloudflare → wezzik.com → 左侧 **Security** → **Bots**
2. 找到 **AI Crawler Protection** / **Bot Fight Mode**
3. **关闭** "Block AI crawlers" 选项（或把模式改为 Allow）

```
Security → Bots:
┌──────────────────────────────────────────────┐
│  Bot Fight Mode          [ OFF ]  ← 关掉      │
│  AI Crawler Protection   [ OFF ]  ← 关掉      │
│  Super Bot Fight Mode    (付费功能，不用管)    │
└──────────────────────────────────────────────┘
```

**为什么**：你的 `robots.txt` 已经显式 Allow 了 GPTBot/ClaudeBot/PerplexityBot，但 Cloudflare 在网络层会先拦截它们。关掉后 robots.txt 的 Allow 规则才能生效。

### B. SSL 模式检查

1. Cloudflare → wezzik.com → 左侧 **SSL/TLS** → **Overview**
2. 确认加密模式是 **Full** 或 **Full (strict)**

```
SSL/TLS → Overview:
┌──────────────────────────────────────────────┐
│  ● Off        (❌ 绝对不要)                    │
│  ● Flexible   (不推荐)                        │
│  ● Full       (✅ 可以)                        │
│  ● Full (strict) (✅ 最佳 — 推荐)             │
└──────────────────────────────────────────────┘
```

**为什么**：Vercel 后端自带 HTTPS 证书。如果选 Flexible，Cloudflare 到 Vercel 用 HTTP，可能导致重定向循环。Full (strict) 最安全。

### C. Cloudflare 会自动改写 robots.txt

Cloudflare 的 "Managed Content" 功能会在你的 robots.txt 末尾自动追加一段 Disallow 规则，可能屏蔽 AI 爬虫。

**检查方法**：浏览器打开 https://wezzik.com/robots.txt

如果你看到末尾有：
```
# Cloudflare Managed Content
...
Disallow: /something
```
那说明 Cloudflare 在注入规则。去 **Rules → Configuration Rules** 或 **Security → Bots** 关闭相关选项。

你的 robots.txt 应该长这样（开头）：
```
User-agent: *
Allow: /

# Explicitly allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /
...
```

---

## 排错速查表

| 问题 | 原因 | 解决 |
|------|------|------|
| Verify 多次失败 | DNS 未传播 | 等 10 分钟再试，或用 `nslookup -type=TXT wezzik.com 1.1.1.1` 检查 |
| Sitemap 提交后 Status = "Couldn't fetch" | Cloudflare 防火墙挡了 Googlebot | 检查 Security → WAF 规则，确保没有拦截 Google IP |
| Sitemap 显示 0 Discovered URLs | sitemap.xml 格式错误 | 浏览器打开 https://wezzik.com/sitemap.xml 确认能正常加载 XML |
| URL Inspection 显示 "URL is not on Google" | 正常，新站需要 1-7 天 | 点 Request Indexing 加速 |
| 收录了但搜索结果看不到 | Google 数据中心同步延迟 | 等 1-3 天，搜索 `site:wezzik.com` 查看已收录页面 |

---

## 完成后的日常检查

| 频率 | 操作 | 位置 |
|------|------|------|
| 每天 | 看 Sitemap 是否正常 | GSC → Sitemaps |
| 每周 | 看 Coverage 有没有错误 | GSC → Coverage |
| 每周 | 看 Performance 点击/曝光 | GSC → Performance |
| 发新博客后 | Request Indexing 新 URL | GSC → URL Inspection |

---

## 总结：你只需要做 5 件事

1. ✅ GSC 添加 Domain 属性 `wezzik.com`，复制 TXT 字符串
2. ✅ Cloudflare → DNS → Records → + Add record → TXT（Name=@, Content=粘贴）
3. ✅ 回 GSC 点 Verify
4. ✅ GSC → Sitemaps → 提交 `sitemap.xml`
5. ✅ Cloudflare → Security → Bots → 关闭 AI Crawler Protection

**预计耗时**：15 分钟（含等 DNS 传播）

完成后截图发我，我帮你确认状态。
