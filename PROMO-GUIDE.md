# PDF Toolkit AI 推广发稿包（直接复制粘贴版）

> 写给你自己发的。AI 不能替你登第三方账号发帖，所以这是一份"你复制、你粘贴、你点发布"的包。
> 今天周三，晚上 22:00–次日 02:00（北京时间）= 美东早上，正好是 Hacker News 和 Reddit 的流量高峰，今晚就能开干。
> 之前你写过的稿子在文章末尾有存档说明，那两版也能直接用，这版只是更顺手、更不像机器写的。

---

## 一、先搞懂怎么发（看这 3 点就够了）

**1. 时间**
欧美用户白天刷 HN/Reddit。你北京时间晚上 10 点发，等于美东早上 10 点，人最多。
周二到周四都行，今天周三正好。

**2. 节奏（别一天发完）**
- 今晚：Hacker News（Show HN）+ 1 个 Reddit（r/privacy 或 r/SideProject）
- 明天：Product Hunt（PH 当天要找人帮忙 upvote，前 24 小时最关键）
- 后天：Dev.to 或 Hashnode 发一篇短文（这篇会进 Google 搜索，长期吃流量）
- 这一周慢慢铺：AlternativeTo、Indie Hackers、Lobsters、Twitter/X、LinkedIn
- 中文平台（少数派 / V2EX / 即刻）随时能发，跟英文那边不冲突

**3. 铁律**
- 同一个平台只发一次自己的项目，别刷，刷了就被封
- 发完前 2 小时蹲在评论区，真有人问就真回，别用客服腔
- 帖子里的链接，优先链具体博客页（比如 compress-pdf-to-100kb）而不是首页，长尾页吃外链权重更划算

**发之前 5 分钟自查：**
- [ ] `js/analytics.js` 里的 `G-REPLACE-ME` 还没换成你的 GA4 ID（目前仍是占位符）。不换也能发，只是你之后看不了流量从哪来。
- [ ] wezzik.com 能正常打开（你刚换浏览器确认过，OK）
- [ ] 配图：项目里已有 `reddit_hero.png`（1280×520 首页图）和 `reddit_overview.png`（完整 6 分类图），Reddit 帖直接拖进去用

---

## 二、平台清单（按性价比排）

**第一档，必发（流量最准）：**
- Hacker News —— Show HN
- Reddit —— r/privacy、r/SideProject
- AlternativeTo —— 把你加进 Smallpdf / iLovePDF 的"替代品"列表，长期带来搜索流量和外链

**第二档，该发（稳的曝光）：**
- Product Hunt
- Dev.to / Hashnode —— 写篇短文，这种"媒体博客"会进 Google 搜索，等于免费 SEO
- Indie Hackers —— 开发者社区，适合讲建站故事
- Lobsters（lobste.rs）—— HN 的平替，技术用户多、没那么卷

**第三档，选发（看心情）：**
- Twitter / X 发一条 + 转发
- LinkedIn 发一条（如果你有职场人脉）
- Hacker Noon —— 媒体博客，能投技术稿

**中文平台（想要国内流量时发）：**
- 少数派（sspai.com）—— 写"不上传文件的 PDF 工具"类盘点最合适
- V2EX —— "分享创造"节点发一帖
- 即刻 —— 一句话 + 链接
- 掘金 / 知乎 —— 回答"有什么好用的 PDF 工具"时把 wezzik 当其中一个选项带出来（别硬广）

---

## 三、各平台文案（下面都是可直接复制的块）

### 1. Hacker News —— Show HN

标题（第一行，直接粘）：
```
Show HN: A PDF toolkit that runs 100% in the browser, no upload, no signup
```

正文（发在评论区第一条）：
```
I kept needing to merge or shrink a PDF for some paperwork, and every "free" site
wanted me to upload it first. For a bank statement or a signed contract that always
felt off. So I spent a couple months building the version I wanted.

16 PDF tools, all running locally in the browser. Nothing gets uploaded. No account,
no watermark, no "upgrade to pro" popup halfway through.

What's in it:
- compress to an exact size (handy for email attachment limits)
- merge / split / rotate / remove pages
- PDF to Word / Excel / Image
- OCR in 100+ languages
- an AI summary + chat-with-PDF
- invoice and resume generators

It's plain static HTML and JS, pdf-lib / pdf.js / Tesseract under the hood, hosted on
Vercel. Open DevTools, watch the Network tab while you process a file, you'll see zero
upload traffic. That's the whole point.

wezzik.com

I'd genuinely like to know what's missing. The roadmap right now is basically whatever
my accountant and my mom complain about, so outside input would help.
```

发完 1 小时内自己回一条技术细节（比如解释"为什么纯前端能做到 OCR"），把讨论带起来。HN 反垃圾很严，正文只放一个链接（首页）。

---

### 2. Reddit

标题备选（挑一个用，别带 emoji、别写"look at my"）：
```
A. I got tired of "free" PDF tools uploading my tax return to a random server, so I built one that runs in my browser
B. Built a PDF toolkit that never touches a server, because I got sick of wondering where my bank statements end up
C. Stopped trusting "free" PDF merger sites with sensitive docs, built my own offline-first version instead
```

正文（r/privacy、r/SideProject 都能用）：
```
Every time I needed to merge a PDF or shrink one for an email, I'd find another free
tool, hit upload, wait, and then wonder which country my bank statement was sitting in.
So I built wezzik.com.

It's 16 PDF tools that process files locally via WebAssembly. Nothing is uploaded. No
account, no email gate, no premium upsell mid-task.

What's there:
- convert: PDF to Word / Excel / Image, OCR
- edit: merge / split / rotate / remove pages
- AI: summary + chat-with-PDF
- compress: to exact targets like 100KB, for email and forms
- business: invoice and resume generators

Why I bothered: most free tools are server-side and keep your file for training or
analytics. This one can't, by how it's built. Open DevTools and you'll see no file
traffic at all, even on a 50MB PDF.

It's been a weekend project for a couple months. Costs me about $15/month on Vercel, no
ads, no data selling. Would love feedback from people who actually use these daily.
If a tool fits the local-only model and it's missing, tell me and I'll build it.

wezzik.com
```

发在哪：
- r/SideProject → 标题用 A 或 C
- r/privacy → 标题用 B 或 C
- 也可 r/selfhosted、r/opensource、r/webdev，但每个 sub 隔 1–2 天发，别同一天全发
- 前 2 小时亲自回每条评论

---

### 3. AlternativeTo（最容易被忽略、但其实最值）

做法：打开 alternativeto.net，搜 "Smallpdf" 或 "iLovePDF"，进页面点 "Add alternative"，填：
```
Name: PDF Toolkit AI
URL: https://wezzik.com
Short description:
Free, private PDF tools that run 100% in your browser. No file upload, no signup,
no watermark. Merge, split, compress, convert, OCR, and AI summary.
Tags: pdf, privacy, offline, free, browser, ocr
```
这个不刷屏、不被封，而且长期在 Google 里排着，持续带外链和直接访问。

---

### 4. Product Hunt

产品名：PDF Toolkit AI
Tagline：16 free PDF tools that run entirely in your browser. Your files never leave your device.

首条评论：
```
Hey Product Hunt!

I built this because I was done uploading sensitive PDFs to tools I didn't trust.
Every feature here runs in your browser, so the files literally never reach a server.

Inside (all free, no account):
- Compress to an exact size for email and forms
- Merge, split, rotate, remove pages
- PDF to Word / Excel / Image
- OCR in 100+ languages
- AI summary and chat-with-PDF
- Invoice and resume generators

The privacy part isn't a setting you toggle. There's just no backend to send anything to.

Happy to take feedback and hunt tips. Thanks for checking it out.
```
Topics 选：Productivity, Privacy, PDF, Developer Tools。
PH 要注册 hunter 账号才能发；发当天在 Twitter/LinkedIn 转一下，找几个朋友帮忙 upvote，前 24 小时排名最要命。

---

### 5. Dev.to / Hashnode 短文（媒体博客，会进 Google）

标题：
```
I rebuilt my PDF workflow so a file never has to leave my laptop
```

正文：
```
For years my "PDF workflow" meant: open a free website, upload the file, pray it
wasn't a bank statement, download the result. I never liked it. So I built the thing
I wanted.

wezzik.com is 16 PDF tools that all run in the browser. Merge, split, rotate,
compress to an exact size, convert to Word/Excel/Image, OCR, even an AI summary.
The part that matters: nothing is uploaded. Open DevTools while you process a 50MB
file and the Network tab stays empty.

It's static HTML and JS, pdf-lib and pdf.js doing the heavy lifting, Tesseract for
OCR, hosted on Vercel. No backend means there's nothing to send your file to, which
is the only privacy guarantee that actually holds.

If you process PDFs with any regularity, give it a try. And if there's a tool missing
that fits the local-only model, tell me, I'll build it.
```
Hashnode 还能绑自己域名、对 SEO 更友好；Dev.to 自带读者。两个都发也行，错开几天。

---

### 6. Indie Hackers

发在 "Show" 或 "Working in Public"：
```
Shipped a small thing: wezzik.com

A PDF toolkit where every tool runs in the browser, so files never get uploaded.
16 tools (compress/merge/split/convert/OCR/AI summary), no signup, no watermark.
Built with vanilla JS + pdf-lib + pdf.js, ~$15/mo on Vercel.

Motivation was simple: I got tired of "free" PDF sites quietly keeping my documents.
Curious whether other indie hackers care about the no-backend angle, or if everyone
just self-hosts. Happy to share what I learned about client-side PDF processing.
```

---

### 7. Lobsters（lobste.rs）

标题：
```
PDF Toolkit AI: 16 PDF tools that run entirely client-side
```
URL 填 https://wezzik.com，tags 选 pdf、release、security。Lobsters 需要邀请或现有用户邀请才能发，有的话发一条，技术用户质量高。

---

### 8. Twitter / X 和 LinkedIn

X（一条）：
```
spent a couple months building the PDF tools i actually wanted:
everything runs in the browser, nothing gets uploaded.

merge, split, compress, convert, ocr, ai summary. no signup, no watermark.
https://wezzik.com
```
LinkedIn（一条，偏职场语气）：
```
Most "free" PDF tools upload your file to a server you don't control. I built the
opposite: 16 PDF tools that run entirely in your browser, so documents never leave
your device. Free, no account. wezzik.com
```

---

### 9. 中文平台（想要国内流量时发）

少数派（写篇短盘点，别硬广）：
```
最近在折腾 PDF 工具，发现一类挺省心：纯前端处理、文件不上传。
比如 wezzik.com，合并/压缩/格式转换/OCR 都在浏览器里跑，适合处理合同、账单这类不想传出去的文件。
```
V2EX：「分享创造」节点发一帖，正文用上面 Reddit 中文意译版即可。
即刻：一句话 + 链接。
知乎：去"有什么好用的 PDF 工具"类问题下回答，把 wezzik 列成选项之一，顺带说"它在浏览器里处理、不上传"这个差异点。

---

## 四、发完之后做三件事

1. **让 Bing 立刻收录外链落地页**（如果你装了 IndexNow）：
   ```
   python3 tools/submit-indexnow.py
   ```
2. **回评论**：尤其 HN 和 Reddit，真诚、不防御，开发者社区对客服腔零容忍。
3. **盯流量**：过几天去 GSC 看 Links 里有没有新外链冒出来；哪个博客页（如 compress-pdf-to-100kb）被带得最多流量，下次发帖就多链它。

---

## 五、你之前写过的稿子（存档，对照用）

- `PROMO-DRAFTS.md` —— 初版，含 HN Show HN / Reddit / Product Hunt 的标题+正文+首评，以及发后动作清单。
- `reddit_post.md` —— 8/4 那版 Reddit 图文稿，含 5 个标题备选、完整正文、subreddit 适配表、防屏蔽 checklist；同目录还有 `reddit_hero.png`、`reddit_overview.png` 两张配图可直接用。

这版 `PROMO-GUIDE.md` 是把上面两份揉碎重写的人性化版本，平台更全、语气更像你自己写的。旧的两份留着不删，哪天想对照随时翻。
