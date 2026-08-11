# wezzik.com 外链建设清单（加速 Google 收录）

> 目标：让 Googlebot 从外部"撞见" wezzik.com，缩短从"上线"到"被收录"的时间（正常 2–6 周，外链好可压到 1–2 周）。
> 原则：**质量 > 数量**，只做白帽、自然、相关性高的外链。绝不买链接、不进 PBN / 链接农场（会被 Google 惩罚）。

---

## ✅ 已完成（代码层，我做的）

| 渠道 | 状态 | 说明 |
|------|------|------|
| **GitHub 仓库 README** | ✅ 已推送 | 顶部 `🌐 Live site: https://wezzik.com` + "已上线域名"段都链到 wezzik.com。GitHub 仓库页 PR 值高、Google 必抓，这是最值钱的一条免费外链 |
| 站点 sitemap / robots.txt | ✅ 已就绪 | Googlebot 会自动经由 `Sitemap:` 指令发现全部页面（无需在 GSC 手动提交） |

---

## 🥇 Tier 1 — 今天就能做，确定性高

### 1. Bing Webmaster Tools（强烈推荐）
Bing 比 Google 对中国用户友好（不被墙），且 **Bing 为 DuckDuckGo 提供数据**（你之前用 DDG 查过）。提交后 Bingbot 会爬站，间接让你在更多引擎可见。
- 打开 https://www.bing.com/webmaster/home
- 用 Microsoft 账号登录 → 添加站点 `wezzik.com`
- 验证方式选 **"Meta tag"**（把给的 `<meta>` 标签贴到 `index.html` 的 `<head>` 里，我帮你加），或选 **"DNS TXT"**（去 Cloudflare 加一条 TXT，和 GSC 同理）
- 验证后左侧 **"提交 URL"** → 贴 `https://wezzik.com/` 和核心工具页，点提交（主动抓取比等快）
- 报告里能看到"已抓取 / 已编入索引"数量

### 2. 设置 GitHub 仓库 homepage（可选，10 秒）
当前 PAT 没有 admin 权限，无法用 API 改。你手动做：
- GitHub → `Swimming-Bird9909/pdf-toolkit-ai` → **Settings → General → About → Website** 填 `https://wezzik.com` → Save
- 效果：仓库首页 sidebar 出现可点击链接（锦上添花，README 正文链接已经够用）

---

## 🥈 Tier 2 — 社区 / 社交（需账号，价值高）

按 ROI 排序，挑你有的账号做：

| 渠道 | 怎么发 | 外链价值 | 备注 |
|------|--------|---------|------|
| **Hacker News — Show HN** | 标题 `Show HN: wezzik.com – privacy-first PDF toolkit, 100% in-browser (no upload)` + 评论里讲技术栈（pdf-lib / WASM OCR） | ⭐⭐⭐⭐⭐ | 技术受众，病毒传播潜力最大；首条评论要真诚，别像广告 |
| **Reddit** | r/pdf（"free no-signup PDF compressor"）、r/privacy（"client-side PDF tools, files never leave browser"）、r/selfhosted、r/productivity | ⭐⭐⭐⭐ | 价值优先，**不要纯发链接**——先回答问题再附工具。每个 sub 隔几天发，别刷 |
| **Product Hunt** | 提交产品，写好 tagline + 首条评论讲"为什么做这个"（隐私痛点） | ⭐⭐⭐⭐ | 上线当天有流量红利，选周二/周三发 |
| **AlternativeTo** | 搜 Smallpdf / iLovePDF / ILovePDF，添加"替代方案" → wezzik.com，标签填 `privacy`, `open-source`, `no-signup` | ⭐⭐⭐⭐ | 长尾 SEO 外链，持续带来精准流量 |
| **Dev.to / Hashnode** | 把 3 篇博客（`split-pdf-guide` / `is-online-pdf-safe` / `ai-summary-guide`）交叉投递，文末 `rel="canonical"` 指向 wezzik.com 原版 | ⭐⭐⭐ | 开发者受众，关注客户端技术 |
| **Medium** | 同上交叉投递，Medium 文章里链回 wezzik.com 原版（canonical 指向源站，不稀释权重） | ⭐⭐⭐ | 大流量平台，但需 canonical 避免重复内容惩罚 |
| **Twitter / X** | 每篇博客拆成 thread 发，带 wezzik.com 链接；展示"浏览器端处理"的截图 | ⭐⭐⭐ | 适合长期积累 |
| **LinkedIn** | 发一条"我们做了个隐私优先的 PDF 工具"，讲动机 | ⭐⭐ | B2B /  professional 受众 |

---

## 🥉 Tier 3 — 问答 / 目录（长尾，顺手做）

- **Quora**：搜 "how to compress pdf for email" / "is it safe to upload pdf online"，写详细回答，自然带 wezzik.com 链接
- **Indie Hackers**：发 build story，讲隐私优先的定位
- **免费目录站**：如 `aboutus.org`、`joeant.com`、`pegasusdirectory.com`（低权重，做几个即可，不值得大量投入）

---

## 🚫 坚决不做（会害了你）

- ❌ 买外链 / Fiverr 廉价外链包
- ❌ PBN（私有博客网络）、链接农场
- ❌ 论坛垃圾评论（"nice post, visit my site"）
- ❌ 自动外链工具
> Google 的垃圾链接检测很成熟，被发现会**整站降权**，比"没收录"严重得多。

---

## 📅 建议节奏（前 4 周）

| 周次 | 动作 |
|------|------|
| 第 1 周 | Bing Webmaster 提交 + Hacker News Show HN + 1 个 Reddit 帖子 |
| 第 2 周 | Product Hunt 上线 + AlternativeTo 条目 + Dev.to 交叉投递 1 篇 |
| 第 3 周 | Medium 交叉投递 + Quora 答 2 题 + 第 2 个 Reddit 帖子 |
| 第 4 周 | 检查 Bing / GSC 收录数，补发未收录页面的外链 |

---

## 🔍 怎么验证外链 + 收录生效

1. **Google**（`site:wezzik.com`）：手机 GSC App 里「网址检查」输入首页看是否"已在 Google 中"。电脑网页版（需代理）看「网页 / Coverage」报告。
2. **Bing**（`site:wezzik.com`）：Bing Webmaster →「网页」报告直接显示索引数，比 GSC 直观。
3. **外链检查**：在 `search.google.com/search-console` 看不到外链全貌；用 Bing Webmaster 的「入站链接」或第三方（ahrefs free / ubersuggest）看 wezzik.com 被哪些站链了。

---

## 下一步我可以帮你做的

- 把 Bing 验证的 `<meta>` 标签加进 `index.html`（你说一声）
- 帮你写好 Hacker News / Reddit 的发文草稿（标题 + 首评）
- 把 3 篇博客改写成 Dev.to / Medium 适配的版本（带 canonical）
- 在 `Organization` JSON-LD 里加 `sameAs` 链接你的社交账号（等你建好账号后告诉我用户名）
