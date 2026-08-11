# 外链爆发发文草稿 (Copy-Paste Drafts)

> 用途：把 wezzik.com 一次性推到 Hacker News / Reddit / Product Hunt，带来 3000–8000 真实 UV，并换来 5–20 个 domain 外链。
> 发布前请先确认：GA4 已填 ID、GSC 已索引主要页面、3 篇新博客已上线。
> 发布时间建议（欧美流量高峰）：**周二–周四 北京时间 22:00–次日 02:00（美东上午）**。

---

## 1. Hacker News — "Show HN"

**标题（第一行，必填）：**
```
Show HN: PDF Toolkit AI – 16 free PDF tools that run entirely in your browser
```

**正文（评论区第一条，带细节）：**
```
I got tired of "free" PDF sites that upload my contracts to who-knows-where,
so I built a set of PDF tools that process files 100% client-side.

- 16 tools: compress (to exact KB), merge, split, rotate, remove pages,
  PDF→Word/Excel/Image, OCR, AI summary, chat-with-PDF, invoice, resume
- Zero upload: everything runs in the browser with pdf-lib / pdf.js / Tesseract.js.
  Open DevTools → Network and you'll see no file traffic.
- No signup, no watermark, no daily limit.
- Privacy-first by design, not a promise.

Try it: https://wezzik.com
Source is plain static HTML/JS if you want to self-host.

Would love feedback on what's missing — especially around the AI summary
quality and mobile UX.
```

**注意：** HN 反垃圾严格，正文里只放一个链接（首页）。不要堆关键词，语气像开发者分享。发布后 1 小时内自己回复一条技术细节（"why client-side"），引导讨论。

---

## 2. Reddit — r/selfhosted 或 r/privacy

**标题：**
```
I built a fully client-side PDF toolkit — no upload, no server, your files never leave the browser
```

**正文：**
```
Sharing a project I built after one too many "free PDF merger" sites silently
uploading files: a browser-only PDF toolkit.

What it does:
- Compress to an exact target size (100KB/200KB/500KB) for email & forms
- Merge / split / rotate / remove pages
- Convert PDF → Word / Excel / JPG
- OCR (100+ languages) and AI summarize / chat-with-PDF
- Invoice + resume generators

All processing happens locally. There's literally no backend — it's static
HTML + WASM. Verifiable in DevTools.

Why it matters for privacy folks: most "free" tools are server-side and retain
your file for training/analytics. This one can't, by architecture.

https://wezzik.com

(Not trying to spam — genuinely curious if a no-backend approach is something
this community values, or if self-hosting is the only acceptable answer.)
```

**建议发到：** r/privacy（最契合）、r/selfhosted、r/opensource。每个 sub 隔 1–2 天发，避免被判定 spam。r/pdf 也可，但流量小。

---

## 3. Reddit — r/software / r/tech 短版

**标题：**
```
Free, no-signup PDF tools that actually respect your privacy (client-side only)
```
**正文：** 同上精简到 3 句 + 链接。

---

## 4. Product Hunt

**产品名：** PDF Toolkit AI
**Tagline：** 16 free PDF tools that run 100% in your browser — no upload, no signup.
**First Comment：**
```
👋 Hey Product Hunt!

Most PDF tools upload your files to a server you don't control. We took the
opposite bet: every tool runs entirely in your browser, so your PDFs never
leave your device.

What's inside (all free, no account):
🗜️ Compress to exact KB · 🔗 Merge · ✂️ Split · 🔄 Rotate
📝 PDF→Word/Excel/Image · 👁️ OCR · 🤖 AI Summary & Chat · 🧾 Invoice/Resume

Privacy isn't a setting here — it's impossible for us to see your files.

Would love your feedback and hunt tips! 🚀
```
**Topics：** Productivity, Privacy, PDF, Developer Tools

**注意：** PH 需要注册 hunter 账号发布。发布当天在 Twitter/LinkedIn 转发，并 @ 朋友 upvote，前 24h 排名最关键。

---

## 5. 发布后动作（必做）

1. 每发完一篇，跑一次 IndexNow 让 Bing 立刻索引新外链落地页：
   ```
   python3 tools/submit-indexnow.py
   ```
2. 在 GSC → Links → 等几天看新外链出现。
3. 把流量最高的那篇博客（如 compress-pdf-to-100kb）在社交帖里直接链它，而非首页，
   让长尾页吃外部权重（更直接利好 SEO）。
4. 回复每一条评论（尤其 HN），真诚、不防御——开发者社区对"客服腔"零容忍。
