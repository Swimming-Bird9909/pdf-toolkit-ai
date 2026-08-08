# PDF Toolkit AI — Blog Content Plan

## Publishing Address

| Item | URL |
|------|-----|
| Blog index | https://wezzik.com/blog/ |
| Individual posts | https://wezzik.com/blog/<slug>.html |
| Sitemap | https://wezzik.com/sitemap-blog.xml |

Posts are static HTML files placed in the `blog/` directory, auto-deployed to Vercel via `vercel deploy --prod`.

---

## Content Strategy

**Core principle:** Every post teaches one concrete task, links to a free tool the reader can use immediately, and reinforces the "files never leave your browser" privacy message.

**Two content tracks:**

| Track | Ratio | Purpose |
|-------|-------|---------|
| Tool Tutorials | 70% | Capture search intent ("how to split PDF", "PDF to Word") and convert to tool usage |
| Privacy Q&A | 30% | Build topical authority around "private PDF processing", differentiate from competitors |

**Publishing cadence:** 1 post per week, Tuesday morning (US time = Tuesday evening China time).

---

## 12-Week Content Calendar

### Already Published (Weeks 1-3)

| # | Title | Slug | Track | Status |
|---|-------|------|-------|--------|
| 1 | How to compress a PDF for email (under 25 MB) | compress-pdf-for-email | Tutorial | Published |
| 2 | Merge PDFs without watermarks — free & private | merge-pdf-without-watermark | Tutorial | Published |
| 3 | Extract every image from a PDF (3 ways) | extract-images-from-pdf | Tutorial | Published |

### New Posts (Weeks 4-12)

| # | Title | Slug | Track | Target Keyword |
|---|-------|------|-------|---------------|
| 4 | How to split a PDF into separate pages (3 methods) | split-pdf-guide | Tutorial | "split pdf" |
| 5 | Is it safe to upload your PDF online? A privacy guide | is-online-pdf-safe | Privacy | "is online pdf safe" |
| 6 | AI PDF Summary: digest a 100-page report in 30 seconds | ai-summary-guide | Tutorial | "ai pdf summary" |
| 7 | PDF to Word: convert without losing formatting | pdf-to-word-guide | Tutorial | "pdf to word" |
| 8 | What metadata your PDF leaks (and how to remove it) | pdf-metadata-privacy | Privacy | "pdf metadata remove" |
| 9 | How OCR works — turn scanned PDFs into searchable text | ocr-guide | Tutorial | "pdf ocr" |
| 10 | Why browser-based PDF tools beat cloud apps for privacy | browser-vs-cloud-pdf | Privacy | "private pdf tool" |
| 11 | How to rotate, delete, and rearrange PDF pages | rotate-delete-pages | Tutorial | "rotate pdf pages" |
| 12 | Chat with any PDF: ask questions and get answers | chat-with-pdf-guide | Tutorial | "chat with pdf" |

---

## Detailed Outlines

### Post 4: How to split a PDF into separate pages (3 methods)
**Slug:** `split-pdf-guide` | **Track:** Tutorial | **Length:** 4 min read
**Target tool:** https://wezzik.com/tools/split.html

Outline:
1. Hook: "You have a 50-page contract but only need page 12-15."
2. Method 1: Split by page ranges (our tool) — step-by-step
3. Method 2: Extract single pages — when you need just one
4. Method 3: Split every N pages — for bulk processing
5. Common scenarios: invoices, legal exhibits, homework
6. Privacy note: all local, no upload
7. FAQ: bookmarks preserved? encrypted PDFs? file size?

### Post 5: Is it safe to upload your PDF online? A privacy guide
**Slug:** `is-online-pdf-safe` | **Track:** Privacy Q&A | **Length:** 6 min read
**Target tool:** https://wezzik.com/ (homepage)

Outline:
1. The question: "I need to merge two PDFs — is it safe to use an online tool?"
2. What happens when you upload a PDF to a typical website
   - File travels to a server you don't control
   - Server may store, log, index, or analyze your file
   - Data retention policies are often vague or unenforced
3. The 3 risk levels of online PDF tools
   - High risk: free tools with no privacy policy, ads everywhere
   - Medium risk: freemium SaaS (Smallpdf, ILovePDF) — they process server-side
   - Zero risk: client-side tools (like ours) — files never leave your browser
4. How to verify a tool is truly client-side
   - Open DevTools > Network, upload a file, check for upload traffic
   - Look for "WASM" / "Web Worker" / "in-browser" language
   - Check if the site works offline (after initial load)
5. Real-world horror stories (anonymized)
   - Resume leaked through a free PDF converter
   - Medical records processed on shared servers
   - Confidential contracts stored in cloud buckets
6. The litmus test: "If this file were printed on paper, would I hand it to a stranger?"
7. FAQ: What about HTTPS? Doesn't that protect me? / What about "we delete files after 1 hour"?

### Post 6: AI PDF Summary: digest a 100-page report in 30 seconds
**Slug:** `ai-summary-guide` | **Track:** Tutorial | **Length:** 5 min read
**Target tool:** https://wezzik.com/tools/ai-summary.html

Outline:
1. Hook: "You just received a 120-page market research report. The meeting is in 20 minutes."
2. What AI PDF Summary does
   - Extracts key sentences using TF-IDF scoring
   - Selects diverse sentences with MMR (Maximal Marginal Relevance)
   - Outputs: TL;DR, key points, section summaries, tags, stats
3. Step-by-step walkthrough
   - Drop your PDF
   - Wait ~5 seconds (all local processing)
   - Read the structured summary
4. What the output looks like (screenshots)
   - TL;DR hero card
   - Numbered key points
   - Section-by-section breakdown
   - Auto-generated tags
   - Document statistics (pages, words, reading time)
5. When to use it vs. Chat with PDF
   - Summary: quick overview before reading
   - Chat: specific questions about content
6. Privacy: runs entirely in your browser, no API calls
7. FAQ: Does it work with scanned PDFs? What languages? How accurate?

### Post 7: PDF to Word: convert without losing formatting
**Slug:** `pdf-to-word-guide` | **Track:** Tutorial | **Length:** 5 min read
**Target tool:** https://wezzik.com/tools/pdf-to-word.html

Outline:
1. Hook: "Your boss sent a PDF and said 'update this.' It was originally a Word doc."
2. Why PDF-to-Word is hard (PDF is a display format, not a structured document)
3. Our approach: pdf.js text extraction + .docx reconstruction
4. Step-by-step: drop PDF, click convert, download .docx
5. What converts well vs. what doesn't
   - Good: text-heavy documents, reports, articles
   - Tricky: complex tables, multi-column layouts, embedded charts
6. Pro tip: OCR first for scanned PDFs
7. Privacy: no upload, no Adobe cloud
8. FAQ: Will fonts match? Can I edit tables? What about images?

### Post 8: What metadata your PDF leaks (and how to remove it)
**Slug:** `pdf-metadata-privacy` | **Track:** Privacy Q&A | **Length:** 5 min read
**Target tool:** https://wezzik.com/tools/remove-metadata.html

Outline:
1. Hook: "You created a PDF for a client. It contains your name, your computer's username, the exact time you finished it, and the software you used."
2. What's inside PDF metadata
   - Title, Author, Subject, Keywords (visible properties)
   - Creator, Producer (software that made it)
   - CreationDate, ModDate (timestamps)
   - Hidden: XMP metadata, custom fields, sometimes GPS coords (from phone scans)
3. Why this matters
   - Anonymous whistleblowing that wasn't anonymous
   - Competitive intelligence from file metadata
   - Forensic tracking of document chains
4. How to view metadata (Acrobat > Properties, or our tool)
5. How to remove it
   - Method 1: Our remove-metadata tool (1 click)
   - Method 2: Print to PDF (loses some metadata but not all)
   - Method 3: ExifTool (command line, power users)
6. What survives metadata removal (and what doesn't)
7. FAQ: Does removing metadata affect the document? Can metadata be recovered?

### Post 9: How OCR works — turn scanned PDFs into searchable text
**Slug:** `ocr-guide` | **Track:** Tutorial | **Length:** 6 min read
**Target tool:** https://wezzik.com/tools/ocr.html

Outline:
1. Hook: "You scanned a 30-page contract. Now you need to search for a specific clause. Ctrl+F finds nothing."
2. What OCR is (Optical Character Recognition) in plain English
3. How our OCR works (Tesseract.js, runs in your browser)
4. Supported languages (100+, including Chinese, Japanese, Korean)
5. Step-by-step: drop scanned PDF, pick language, click OCR, get searchable PDF
6. Quality tips
   - Higher DPI scans = better accuracy
   - Clean, straight scans work best
   - Handwriting: forget about it (Tesseract isn't great)
7. What to do with the output
   - Searchable PDF (text layer added)
   - Copy-paste text
   - Feed into AI Summary
8. Privacy: Tesseract.js runs locally, no cloud OCR API
9. FAQ: How long does it take? What about handwriting? Chinese OCR accuracy?

### Post 10: Why browser-based PDF tools beat cloud apps for privacy
**Slug:** `browser-vs-cloud-pdf` | **Track:** Privacy Q&A | **Length:** 6 min read
**Target tool:** https://wezzik.com/ (homepage)

Outline:
1. The two models: cloud processing vs. client-side processing
2. Cloud model: PDF > upload > server processes > download result
   - Your file exists on someone else's server, even if briefly
   - Server logs, backups, CDN caches may retain copies
   - GDPR/CCPA compliance is the vendor's claim, not your guarantee
3. Client-side model: PDF > browser processes locally (WASM/JS) > download result
   - Zero network transfer of file content
   - Verifiable with DevTools
   - Works offline after first load
4. The technology behind client-side PDF processing
   - pdf-lib (creation/manipulation)
   - pdf.js (rendering/extraction)
   - Tesseract.js (OCR)
   - Web Workers (background processing, no UI freeze)
5. Trade-offs (honest)
   - Slower for very large files (your CPU, not a server farm)
   - Limited by browser memory (~2GB practical limit)
   - No batch processing across multiple devices
6. When to use which
   - Client-side: personal documents, sensitive work, quick tasks
   - Cloud/server: batch processing, enterprise workflows, API integration
7. How to audit any PDF tool's privacy claims
8. FAQ: Is WASM safe? Can a website steal my files through JavaScript?

### Post 11: How to rotate, delete, and rearrange PDF pages
**Slug:** `rotate-delete-pages` | **Track:** Tutorial | **Length:** 4 min read
**Target tools:** https://wezzik.com/tools/rotate-pdf.html, https://wezzik.com/tools/remove-pages.html

Outline:
1. Hook: "Page 3 is upside down. Page 7 is a duplicate. Page 12 shouldn't be there."
2. Rotate pages: 90/180/270 degrees, individual or all
3. Delete pages: remove unwanted pages, renumber automatically
4. Common scenarios
   - Scanned pages in wrong orientation
   - Accidental duplicate scans
   - Removing cover pages or blank pages
5. Pro tip: merge + rotate + delete in sequence for cleanup workflows
6. Privacy: all local with pdf-lib
7. FAQ: Does rotation affect quality? Can I undo? Batch rotate?

### Post 12: Chat with any PDF: ask questions and get answers
**Slug:** `chat-with-pdf-guide` | **Track:** Tutorial | **Length:** 5 min read
**Target tool:** https://wezzik.com/tools/chat-with-pdf.html

Outline:
1. Hook: "You have a 200-page academic paper. You need to find: what methodology did they use? What were the limitations?"
2. What Chat with PDF does
   - Extracts all text from your PDF
   - Lets you ask questions in natural language
   - Returns answers with page references
3. How it works (no external AI API needed)
   - pdf.js extracts text locally
   - Keyword matching + context extraction
   - Highlights relevant passages
4. Step-by-step: drop PDF, type question, get answer
5. Best practices for good questions
   - Be specific: "What is the sample size?" not "Tell me about the study"
   - Ask one question at a time
   - Use quotes from the document to verify answers
6. When to use Chat vs. Summary vs. OCR
7. Privacy: 100% local, no OpenAI/Google API calls
8. FAQ: Does it work with any language? How long can the PDF be? Can it hallucinate?

---

## Publishing Recommendations

### Primary: Your own site (wezzik.com/blog/)
**Why:** Full control, SEO equity builds on your domain, tools are one click away.
**How:** Create HTML file in `blog/` directory, add to `blog/index.html` and `sitemap-blog.xml`, deploy via Vercel.

### Secondary: External platforms for distribution
| Platform | What to post | Why | Effort |
|----------|-------------|-----|--------|
| **Reddit** (r/pdf, r/productivity, r/sysadmin) | Link to your blog post with a value-first comment | Targeted audience, high engagement, SEO backlinks | Low |
| **Dev.to** | Cross-post privacy/technical articles (browser-vs-cloud, metadata) | Developer audience, interested in client-side tech | Medium |
| **Medium** | Cross-post with canonical link to wezzik.com | Built-in audience, SEO domain authority | Low |
| **Hacker News** | Submit privacy-focused posts (is-online-pdf-safe, browser-vs-cloud) | Tech audience, viral potential | Low |
| **LinkedIn** | Share tutorial posts in PDF/productivity groups | Professional audience, B2B angle | Low |
| **X/Twitter** | Thread summarizing each blog post | Broad reach, quick to produce | Low |

### Strategy
1. **Publish on wezzik.com first** (canonical URL).
2. **Wait 1 week** for Google to index.
3. **Cross-post to Medium/Dev.to** with `rel="canonical"` pointing to wezzik.com.
4. **Share on Reddit/HN** with a genuine value-first comment (not just a link drop).
5. **Create X threads** from each post's key points.
