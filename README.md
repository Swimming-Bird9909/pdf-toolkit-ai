# PDF Toolkit AI — 海外 PDF 工具站

> 10 个核心 PDF 工具，100% 浏览器本地处理，零上传，零注册。
> 纯静态站点，可一键部署到 Vercel / Netlify / Cloudflare Pages / 任何静态托管。

## ✨ 功能

| # | 工具 | 对应长尾关键词 | 竞争度 |
|---|------|---------------|--------|
| 1 | Compress PDF | compress pdf to 100kb / compress pdf for email attachment / reduce pdf size without losing quality | 低/低/中 |
| 2 | Split PDF | split pdf by pages online | 中 |
| 3 | Merge PDF | merge pdf files free no signup | 中 |
| 4 | PDF to Images | pdf to png / pdf to jpg | 中 |
| 5 | PDF OCR | pdf ocr online free | 中 |
| 6 | AI Summary | ai pdf summarizer | 低 |
| 7 | Remove Pages | pdf page remover online | 低 |
| 8 | Extract Images | extract images from pdf | 中 |
| 9 | Remove Metadata | pdf metadata remover | 低 |
| 10 | Remove Watermark | pdf watermark remover free | 中 |

## 🛠 技术栈

- **纯前端**：无后端、无数据库、无服务器成本
- **pdf-lib** (1.17.1) — PDF 创建、合并、拆分、元数据、水印
- **PDF.js** (3.11.174) — 渲染、文本提取、图片提取
- **Tesseract.js** (5.0.4) — OCR（100+ 语言）
- **JSZip** (3.10.1) — 批量打包下载
- 所有库通过 jsDelivr CDN 加载

## 📁 目录结构

```
pdf-toolkit-ai/
├── index.html                    # 主页（10 工具卡片 + FAQ + Features）
├── privacy-policy.html           # 隐私政策（GDPR/CCPA 合规）
├── terms.html                    # 服务条款
├── about.html                    # 关于页
├── 404.html                      # 自定义 404
├── robots.txt                    # 搜索引擎指令
├── sitemap.xml                   # 站点地图
├── manifest.json                 # PWA manifest
├── _redirects                    # Netlify 重定向
├── _headers                      # Cloudflare Pages 安全头
├── css/
│   └── style.css                 # 设计系统（深浅主题、响应式）
├── js/
│   ├── main.js                   # 主题切换、cookie banner、通用工具函数
│   └── tools/                    # 10 个工具逻辑
│       ├── compress.js
│       ├── split.js
│       ├── merge.js
│       ├── pdf-to-image.js
│       ├── ocr.js
│       ├── ai-summary.js
│       ├── remove-pages.js
│       ├── extract-images.js
│       ├── remove-metadata.js
│       └── remove-watermark.js
├── tools/                        # 10 个工具页面
│   ├── compress.html
│   ├── split.html
│   ├── merge.html
│   ├── pdf-to-image.html
│   ├── ocr.html
│   ├── ai-summary.html
│   ├── remove-pages.html
│   ├── extract-images.html
│   ├── remove-metadata.html
│   └── remove-watermark.html
├── blog/                         # SEO 内容营销
│   ├── index.html
│   ├── compress-pdf-for-email.html
│   ├── merge-pdf-without-watermark.html
│   └── extract-images-from-pdf.html
└── assets/
    └── icons/
        └── favicon.svg           # SVG favicon（推荐另外生成 PNG 192/512 for PWA）
```

## 🚀 部署

### 选项 1：Cloudflare Pages（推荐，免费 + 全球 CDN）

```bash
# 直接把整个 pdf-toolkit-ai/ 目录拖到 https://pages.cloudflare.com/
# 或用 wrangler:
npm i -g wrangler
wrangler pages deploy pdf-toolkit-ai --project-name=pdf-toolkit-ai
```

Cloudflare 会自动读取 `_headers` 设置安全头（CSP、HSTS 等）。

### 选项 2：Netlify

```bash
# 拖到 https://app.netlify.com/drop
# 或:
npm i -g netlify-cli
netlify deploy --dir=pdf-toolkit-ai --prod
```

### 选项 3：Vercel

```bash
npm i -g vercel
vercel --prod pdf-toolkit-ai
```

### 选项 4：GitHub Pages

1. 把代码 push 到 GitHub 仓库
2. Settings → Pages → Source: `main` branch, root
3. 等待部署完成

## 🌐 域名建议

- pdftoolkit.ai
- pdf-toolkit.app
- freepdftoolkit.com

## 📊 上线前清单

- [ ] 替换 `<link rel="canonical">` 里的域名（所有 HTML 文件中）
- [ ] 替换 sitemap.xml 里的域名
- [ ] 替换 manifest.json 里的 start_url
- [ ] 准备 PWA PNG 图标（192×192, 512×512）
- [ ] 准备 OG 图片（1200×630）
- [ ] 替换 `mailto:` 邮箱地址
- [ ] 在 Google Search Console 提交 sitemap
- [ ] 在 Plausible/Umami 注册 analytics（可选）
- [ ] 替换 Stripe 链接（如果做 Pro 版）

## 💰 变现路径

1. **联盟营销** — 在 about/blog 页面推荐 Adobe Acrobat / Foxit（带 affiliate link）
2. **Pro 订阅** — 通过 Stripe 收款，$4.99/月解锁：
   - 无限文件（vs 免费每天 20 个）
   - 大文件（500MB vs 50MB）
   - 批量处理
   - 优先 OCR
3. **API 服务** — 把核心能力（特别是 AI Summary）包装成 API，给企业客户
4. **展示广告** — 不推荐，会破坏"隐私"卖点

## 🔍 SEO 优化要点（已内置）

- 每个工具独立 URL，含独立 Title / Description / Keywords / Canonical
- JSON-LD 结构化数据（SoftwareApplication + FAQPage + HowTo + Article）
- sitemap.xml + robots.txt
- 移动端友好（响应式 CSS）
- Core Web Vitals 友好（CDN 库 + 内联 SVG + 静态 HTML）

## 🔐 安全

- CSP 头限制第三方脚本只能从 jsDelivr 加载
- `Permissions-Policy` 关闭所有不必要权限
- `Referrer-Policy: strict-origin-when-cross-origin`
- 无 cookie、无追踪、无 fingerprinting

## 📝 License

代码：MIT
pdf-lib, pdf.js, Tesseract.js, JSZip：各自的开源协议（MIT / Apache 2.0）

---

Made with 🦞 by 邱总's team