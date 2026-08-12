# Search Box — Verification (v12.29)

## What shipped
A site-wide search box was added to the top navbar. It is **injected by `js/main.js`
on every page** (inserted into `.nav-inner`, before `.nav-links`) — no per-page HTML
edits were needed.

- Bilingual tool index inlined in `main.js` (21 entries: 16 tools + 4 category hubs + Blog).
- Live dropdown as you type, with ↑/↓ navigation, Enter to open, Esc to close, click-outside to dismiss.
- Jump URL is built per current language (`/zh/...` on Chinese pages, `/...` on English).
- **Cross-language search**: typing an English word on a Chinese page (or a Chinese word on
  an English page) still finds the tool, because the match haystack includes both languages.
  The result label is shown in the *current page's* language.
- Styles in `css/style.css` (`.nav-search*`, light/dark + responsive). On ≤768px the box
  fills the bar; on ≤640px the "Get started" button hides to make room.
- Cache-bust: `?v=12.28 → 12.29`; `sw.js` cache `pdftoolkit-v7`.

## End-to-end check (agent-browser, local build)
| Step | Result |
|------|--------|
| Search box rendered | `textbox "Search tools"` present ✅ |
| Type `merge` (EN page) | dropdown shows `🔗 Merge PDF — Combine several PDFs into one` ✅ |
| Type `压缩` (ZH word, EN page) | dropdown shows `🗜️ Compress PDF — Make a PDF smaller, keep quality` ✅ (cross-lang + label in page language) |

## Live (curl on wezzik.com)
- `/` and `/zh/` reference `main.js?v=12.29` / `style.css?v=12.29` ✅
- `js/main.js?v=12.29` contains 14 `nav-search` references ✅
- `css/style.css?v=12.29` contains 21 `nav-search` references ✅
- `sw.js` = `pdftoolkit-v7` ✅

## Deploy
- Vercel `wezzik.com` Ready (9s)
- GitHub `main` = `411a92c` (150 files)
