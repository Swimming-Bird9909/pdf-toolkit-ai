#!/usr/bin/env python3
"""
Bulk optimizer for PDF Toolkit AI.
Operations:
  A. Inject GA4 loader (<script async src="/js/analytics.js?v=12.24">) before </head> on all HTML.
  B. Bump main.js references to ?v=12.24 so SW + lang toggle load fresh.
  C. Homepage: add "Most popular this week" strip after hero.
  D. Homepage: add Newsletter section before footer.
  E. Tool pages: add "Next step" CTA before <section class="related-tools">.
  F. 5 key tool pages: add FAQPage JSON-LD (head) + visible FAQ (before related-tools).

Usage:
  python3 build/optimize_all.py            # dry run
  python3 build/optimize_all.py --apply    # write changes
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = '--apply' in sys.argv

GA_SNIPPET = '  <script async src="/js/analytics.js?v=12.24"></script>\n'

# ---- E. Next-step CTA mapping (href relative to tools/) ----
NEXT = {
    'merge.html':        ('Compress PDF', '../tools/compress.html', 'Shrink the merged file?', 'Combined PDFs are often large — compress before emailing or uploading.'),
    'split.html':        ('Merge PDF', '../tools/merge.html', 'Need to reassemble pages?', 'After splitting, you can recombine selected pages into a new document.'),
    'rotate-pdf.html':   ('Compress PDF', '../tools/compress.html', 'File too big after rotation?', 'Rotating adds no data, but compressing keeps the whole set email-ready.'),
    'remove-pages.html': ('Compress PDF', '../tools/compress.html', 'Trimmed it down?', 'Fewer pages usually means a smaller file — compress to finish the job.'),
    'pdf-to-word.html':  ('PDF to Excel', '../tools/pdf-to-excel.html', 'Need tables in a spreadsheet?', 'Extract tabular data into Excel without retyping.'),
    'pdf-to-excel.html': ('PDF to Word', '../tools/pdf-to-word.html', 'Prefer an editable document?', 'Convert the same PDF into a Word file for further edits.'),
    'pdf-to-image.html': ('PDF to Word', '../tools/pdf-to-word.html', 'Want selectable text instead?', 'Images are great for sharing, Word is better for editing.'),
    'ocr.html':          ('PDF to Word', '../tools/pdf-to-word.html', 'Make it editable?', 'After OCR, convert the searchable PDF into a Word document.'),
    'ai-summary.html':   ('Chat With PDF', '../tools/chat-with-pdf.html', 'Have specific questions?', 'Summary gives the big picture — Chat drills into details with citations.'),
    'chat-with-pdf.html':('AI Summary', '../tools/ai-summary.html', 'Want the TL;DR?', 'Get a structured summary before asking follow-up questions.'),
    'compress.html':     ('Merge PDF', '../tools/merge.html', 'Combine several files?', 'Compress first, then merge — or merge then compress, both work.'),
    'extract-images.html':('Compress PDF', '../tools/compress.html', 'Sharing the whole PDF?', 'Compress after extracting to keep the source file light.'),
    'remove-metadata.html':('Compress PDF', '../tools/compress.html', 'Finalizing for sharing?', 'Strip metadata, then compress for the smallest private file.'),
    'remove-watermark.html':('Compress PDF', '../tools/compress.html', 'Cleaned it up?', 'Compress the watermark-free PDF before sending.'),
    'invoice-pdf.html':  ('Resume Builder', '../tools/resume-pdf.html', 'Also need a resume?', 'Generate a matching resume with the same privacy-first engine.'),
    'resume-pdf.html':   ('Invoice Generator', '../tools/invoice-pdf.html', 'Sending an invoice too?', 'Create a professional invoice in the same browser-only flow.'),
}

# ---- F. FAQ content for 5 key tool pages (visible + JSON-LD) ----
FAQS = {
    'merge.html': [
        ('Can I merge PDFs without uploading them?', 'Yes. Merging runs entirely in your browser with pdf-lib — your files never leave your device. Open DevTools → Network and you will see zero upload traffic.'),
        ('Is there a page or file limit?', 'There is no hard limit. Very large jobs (hundreds of pages) depend on your device memory; a desktop browser handles the biggest batches best.'),
        ('Will merging change the quality?', 'No. Pages are copied losslessly into the new file — text, images, and vectors stay pixel-identical. Bookmarks inside the source files are preserved.'),
        ('Can I reorder pages before merging?', 'Yes. Drag files to reorder whole documents, or use Split first to drop specific pages, then merge the result.'),
    ],
    'split.html': [
        ('Is splitting a PDF safe for confidential files?', 'Yes. Splitting happens locally in your browser. Nothing is uploaded, so contracts, medical records, and financial statements never leave your device.'),
        ('Does splitting reduce quality?', 'No. It is a lossless operation that copies page objects into new containers. Text and images are untouched.'),
        ('Can I split by specific page ranges?', 'Yes — enter ranges like 1-3, 5-12, 20-25, or extract single pages (3, 7, 15), or split every N pages.'),
        ('What is the max file size?', 'Practically about 500MB (limited by browser memory). For larger files, split in smaller batches.'),
    ],
    'compress.html': [
        ('How small can I make a PDF?', 'Specify any target — 100KB, 200KB, 500KB, or custom. Lossless mode keeps text crisp; lossy mode hits aggressive targets by recompressing images.'),
        ('Does compression reduce quality?', 'Lossless mode preserves quality exactly. Lossy mode trades some image sharpness for size — preview before downloading.'),
        ('Is my file uploaded to compress it?', 'No. Compression runs in your browser with pdf-lib. Files never touch a server.'),
        ('Why is my PDF still large after compressing?', 'If the file is mostly text, there is little to shrink. Scanned or image-heavy PDFs see the biggest reductions.'),
    ],
    'pdf-to-word.html': [
        ('Will the layout survive the conversion?', 'Text, headings, and most formatting convert well. Complex multi-column layouts or custom fonts may need light cleanup in Word.'),
        ('Is my PDF uploaded for conversion?', 'No. Text extraction uses pdf.js in your browser; the document never leaves your device.'),
        ('Do tables convert correctly?', 'Simple tables convert into native Word tables. Very complex bordered tables may arrive as text that you re-table quickly.'),
        ('Can I convert a scanned PDF?', 'Not directly — scanned pages are images. Run OCR first to get a text layer, then convert to Word.'),
    ],
    'ai-summary.html': [
        ('Does AI Summary send my PDF to a server?', 'No. Text extraction (pdf.js) and the ranking algorithm (TF-IDF + MMR) both run in your browser. There are zero API calls to OpenAI or Google.'),
        ('How accurate is the summary?', 'It is extractive: every sentence in the summary is verbatim from your document, so it cannot hallucinate. It selects the most informative sentences rather than rewriting.'),
        ('What languages are supported?', 'Any language with sentence boundaries — English, Spanish, French, German, and CJK languages with special segmentation.'),
        ('What is the max file size?', 'About 200MB or 1000 pages. A 10-page PDF takes ~2s; a 500-page PDF takes ~15s.'),
    ],
}

def edit_file(path, changes):
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    original = t

    # A. GA4 injection
    if 'analytics.js?v=12.24' not in t:
        t = t.replace('</head>', GA_SNIPPET + '</head>', 1)
        changes.append('GA4 snippet')

    # B. main.js version bump
    new_t = t
    new_t = new_t.replace('src="js/main.js"', 'src="js/main.js?v=12.24"')
    new_t = new_t.replace('src="../js/main.js"', 'src="../js/main.js?v=12.24"')
    if new_t != t:
        t = new_t
        changes.append('main.js?v=12.24')

    base = os.path.basename(path)

    # E. Next-step CTA (tool pages only)
    if base in NEXT and '<section class="related-tools">' in t and 'next-step' not in t:
        label, href, h3, p = NEXT[base]
        block = f'''<section class="next-step">
  <div class="container">
    <div class="next-step-inner">
      <div>
        <span class="eyebrow">Next step</span>
        <h3>{h3}</h3>
        <p>{p}</p>
      </div>
      <a class="btn btn-primary" href="{href}">{label} →</a>
    </div>
  </div>
</section>

<section class="related-tools">'''
        t = t.replace('<section class="related-tools">', block, 1)
        changes.append('next-step CTA')

    # F. FAQ for 5 key tool pages
    if base in FAQS and 'class="faq"' not in t and 'FAQPage' not in t:
        items = FAQS[base]
        # JSON-LD
        qa_json = ',\n'.join(
            '    { "@type": "Question", "name": %s, "acceptedAnswer": { "@type": "Answer", "text": %s } }'
            % (repr(q), repr(a)) for q, a in items
        )
        jsonld = (
            '<script type="application/ld+json">\n'
            '{\n'
            '  "@context": "https://schema.org",\n'
            '  "@type": "FAQPage",\n'
            '  "mainEntity": [\n' + qa_json + '\n'
            '  ]\n'
            '}\n'
            '</script>\n'
        )
        # Insert JSON-LD before </head>
        t = t.replace('</head>', jsonld + '</head>', 1)
        # Visible FAQ before related-tools (or before footer if no related-tools)
        faq_html = '  <section class="section" id="tool-faq">\n    <div class="container">\n      <h2 class="section-title">Frequently asked questions</h2>\n      <div class="faq">\n'
        for q, a in items:
            faq_html += f'''        <details>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
'''
        faq_html += '      </div>\n    </div>\n  </section>\n'
        if '<section class="related-tools">' in t:
            t = t.replace('<section class="related-tools">', faq_html + '\n<section class="related-tools">', 1)
        elif '<footer class="footer">' in t:
            pass  # fallback not needed for these pages
        changes.append('FAQ schema + visible')

    if t != original:
        if APPLY:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(t)
        return True
    return False


def main():
    html_files = []
    for dp, _, fns in os.walk(ROOT):
        if 'node_modules' in dp:
            continue
        for fn in fns:
            if fn.endswith('.html'):
                html_files.append(os.path.join(dp, fn))
    html_files.sort()

    changed = 0
    for p in html_files:
        ch = []
        if edit_file(p, ch):
            changed += 1
            print(f"  [{'APPLY' if APPLY else 'DRY'}] {os.path.relpath(p, ROOT)} -> {', '.join(ch)}")

    # Homepage-specific C + D
    idx = os.path.join(ROOT, 'index.html')
    with open(idx, 'r', encoding='utf-8') as f:
        t = f.read()
    orig = t
    ch = []
    # C. popular strip after hero
    if 'popular-strip' not in t:
        anchor = '<!-- ============================ Tools Grid (6 categories) ============================ -->'
        block = '''<!-- ============================ Most popular this week ============================ -->
<section class="section popular-strip">
  <div class="container">
    <h2 class="section-title">Most popular this week</h2>
    <p class="section-sub">The tools our visitors reach for first.</p>
    <div class="popular-grid">
      <a class="popular-pill" href="tools/compress.html"><span class="fire">🔥</span> Compress PDF <span class="arrow">→</span></a>
      <a class="popular-pill" href="tools/merge.html"><span class="fire">🔥</span> Merge PDF <span class="arrow">→</span></a>
      <a class="popular-pill" href="tools/split.html"><span class="fire">🔥</span> Split PDF <span class="arrow">→</span></a>
      <a class="popular-pill" href="tools/pdf-to-word.html"><span class="fire">🔥</span> PDF to Word <span class="arrow">→</span></a>
      <a class="popular-pill" href="tools/ai-summary.html"><span class="fire">🔥</span> AI Summary <span class="arrow">→</span></a>
      <a class="popular-pill" href="tools/ocr.html"><span class="fire">🔥</span> PDF OCR <span class="arrow">→</span></a>
    </div>
  </div>
</section>

''' + anchor
        t = t.replace(anchor, block, 1)
        ch.append('popular strip')
    # D. newsletter before footer
    if 'class="newsletter"' not in t:
        anchor = '<!-- ============================ Footer ============================ -->'
        block = '''<!-- ============================ Newsletter ============================ -->
<section class="section newsletter">
  <div class="container">
    <h2>Get new PDF guides in your inbox</h2>
    <p class="sub">One short email when we publish a new privacy-first PDF guide. No spam, unsubscribe anytime.</p>
    <form class="newsletter-form" action="https://buttondown.email/api/emails/embed-subscribe/qiuliang087" method="post" target="_blank">
      <input type="email" name="email" placeholder="you@example.com" required aria-label="Email address" />
      <button type="submit" class="btn btn-primary">Subscribe</button>
    </form>
    <p class="note">We use <a href="https://buttondown.email" target="_blank" rel="noopener">Buttondown</a> — your email is never sold or shared.</p>
  </div>
</section>

''' + anchor
        t = t.replace(anchor, block, 1)
        ch.append('newsletter')
    if t != orig:
        if APPLY:
            with open(idx, 'w', encoding='utf-8') as f:
                f.write(t)
        changed += 1
        print(f"  [{'APPLY' if APPLY else 'DRY'}] index.html -> {', '.join(ch)}")

    print(f"\nTotal files changed: {changed}")
    if not APPLY:
        print("(dry run — re-run with --apply to write)")


if __name__ == '__main__':
    main()
