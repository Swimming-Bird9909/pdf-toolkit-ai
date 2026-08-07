# Reddit 推广文案 — PDF Toolkit AI

## 🏆 推荐的标题（5 个备选，按优先级排序）

> **A. (推荐) ** *I got tired of "free" PDF tools that upload my tax returns to random servers, so I built one that runs entirely in your browser*
>
> **B.** *Free PDF tools that never upload your files. I built this over weekends instead of trusting Adobe's $20/mo subscription*
>
> **C.** *I built a 100% private PDF toolbox instead of risking my bank statements on yet another ad-laden web app*
>
> **D.** *Stop uploading sensitive PDFs to strangers' servers — a free, offline-first toolkit that does it all in your browser*
>
> **E.** *I got fed up with PDF tools asking me to "create a free account" to compress 2 pages. So I made my own — no signup, no upload, no tracking*

---

## 📝 正文（建议发帖于 r/SideProject，可同时投递 r/privacy / r/webdev / r/productivityapps）

> Every time I needed to merge a PDF or shrink it for an email attachment, I'd find another "free" tool. Open it. Hit upload. Wait 30 seconds. Then wonder which country my bank statement is sitting in by now.
>
> So I built **[PDF Toolkit AI](https://wezzik.com)** — 16 PDF tools that process files locally via WebAssembly. Nothing is uploaded. No account. No email gate. No premium upsell mid-task.
>
> ![Homepage hero]
>
> ## What's in it (organized by what you actually want to do, not by feature checklist)
>
> - **Convert** — PDF → Word, Excel, JPG, OCR
> - **Edit** — Merge, Split, Rotate, Remove Pages
> - **AI** — 200-page report summarizer + Chat-With-PDF
> - **Compress** — Hit exact targets like 100KB / 500KB
> - **Business** — Invoice Generator, Resume Builder
> - **Utilities** — Extract Images, Remove Watermark, Remove Metadata
>
> ![Six categories grid]
>
> ## Why I built it this way
>
> - **Files never leave your machine.** Open DevTools → Network tab — you'll see zero file uploads, even for 50MB PDFs.
> - **Zero accounts.** Open → drag → done.
> - **Works offline** after first load (PWA-installable).
> - **Costs me ~$15/mo** to host (Vercel). No ads. No data selling. Just a hobby that hopefully pays its own coffee bill.
>
> It's been my weekend project for the past two months and I'd genuinely love feedback from people who actually use these tools every day.
>
> If a tool is missing and it fits the local-only model, drop a comment and I'll prioritize. Roadmap is currently shaped by what my accountant and my mom actually complain about.
>
> 🔗 **[wezzik.com](https://wezzik.com)** — no signup, no email gate, no "upgrade to pro" popups
>
> *Built with: pdf-lib, pdf.js, Tesseract.js, vanilla JS. Hosted on Vercel. Code is the part of the project I'm least embarrassed about; the CSS took longer than the algorithms.*

---

## 🎯 发帖策略

| Subreddit | 标题版本 | 时机 |
|---|---|---|
| **r/SideProject** | A 或 E | 周二 / 周三 美东时间 9-11am（流量高峰） |
| **r/privacy** | C 或 D | 平日上午 |
| **r/webdev** | A 或 B | 周中平日下午 |
| **r/productivityapps** | B 或 E | 周末上午 |

**注意事项**：
- 不要一次发到 5 个 subreddit，会被 Reddit 当 spam
- 每个 subreddit 用对应 audience 的标题（A 适合 SideProject，E 适合 productivityapps）
- 评论区活跃：前 2 小时必须亲自回复每一条评论

---

## 🛡️ 防止被 Reddit 屏蔽

- ❌ **不要** 在标题里加 emoji 或 [Tool] / [Project] 之类的标签（很多 sub 自动屏蔽）
- ❌ **不要** 用 "Look at my" / "Check out my" 这种自我推销措辞
- ❌ **不要** 直接发域名当标题（如 "wezzik.com"）
- ✅ **第一句** 必须是共鸣痛点（一句话讲清为什么别人该停下来读）
- ✅ **正文图片** 最多 2 张，过多 Reddit 会折叠
- ✅ **技术 stack** 写在最后（适合 webdev / SideProject 调性）
- ✅ 主动说 roadmap，邀请反馈 → 让评论能接话

---

## 📷 推荐配图

| 图片 | 文件 | 用途 |
|---|---|---|
| 1. 顶部 Hero（1280×520） | `/tmp/reddit_compact.png` | 主帖第一张图 |
| 2. 完整首页含 6 大分类（1280×2400） | `/tmp/reddit_full2.png` | 主帖第二张图（可选） |

如果要二选一：
- **r/SideProject** / **r/webdev** → 配 6 大分类那张（展示工程量）
- **r/privacy** / **r/productivityapps** → 配 Hero 那张（突出"隐私 / 一目了然"卖点）
