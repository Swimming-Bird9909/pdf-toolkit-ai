# Search Widget — v12.32 (Branch Preview) Verification

**Date**: 2026-08-12
**Branch**: `feature/search-fixed-topright` (2 commits ahead of `main`)
**Main HEAD**: `e5796c6` (v12.27) — **untouched. wezzik.com is unaffected.**
**Preview URL**: https://0da8e686b2a44c62968db79b62ff2641.gz5.agentos-app.net
**Preview platform**: WorkBuddy CloudStudio sandbox (independent of Vercel/Cloudflare production)

## Goal (from user's screenshot)
User reported that with v12.31, the search bar sat between the navbar and the hero.
When scrolling, the page content covered it; only the top and bottom extremes showed it.
User wanted: a search box placed at the **page's top-right corner**, fully fixed,
visible regardless of how far down the page is scrolled.

## What Changed (v12.32)

### Position
- `.nav-search` is `position: fixed; top: 84px; right: 16px` — anchored to the
  viewport, **not** to any element in the document flow.
- Appended to `document.body` at runtime so no parent affects its position.
- Lives completely **outside** the navbar. The navbar now reads
  `brand → nav-links → nav-cta` (only), so it can never be crowded or wrapped.

### Two States
1. **Collapsed (default)** — a 134×40px pill button: `🔍 Search ⌘K`.
   Visible at all times in the top-right corner.
2. **Open** — clicking the pill, pressing **⌘K / Ctrl+K** or **`/`** expands
   a ~380px wide floating panel right below the pill with:
   - the search input,
   - live filtered results (up to 8, scored by title > keyword > desc),
   - "↑↓ navigate · Enter open · Esc close" hint.
3. Click outside or **Esc** collapses it cleanly.

### Smooth Transitions
- Panel fades + slides down on open (180ms), closes the opposite way.
- Reduced-motion users get an instant toggle.

## End-to-End Verification (Browser)

Run on https://0da8e686b2a44c62968db79b62ff2641.gz5.agentos-app.net via
agent-browser with viewport 1280×720.

| Test | Expected | Result |
|---|---|---|
| Page references main.js / style.css | `?v=12.32` | `12.32` ✓ |
| Initial nav-search class | `nav-search nav-search--collapsed` | ✓ |
| Initial panel display | `none` | ✓ |
| Initial panel opacity | `0` | ✓ |
| Pill position (top, right, w, h) | `top:84, right:31, 134×40` | ✓ |
| Pill text | `Search⌘K` | ✓ |
| Scroll to 1500px — pill visibility | top:84, right:31, visible | ✓ |
| Scroll to page bottom (4757px) — pill | top:84, right:31, visible | **✓ (key fix)** |
| Click pill — className | `nav-search--open` | ✓ |
| Click pill — panel display | `flex` | ✓ (after CSS !important fix) |
| Click pill — panel opacity | `1` | ✓ |
| Click pill — panel width | 380px | ✓ |
| Click pill — panel position | top:134, right:31 (aligned under pill) | ✓ |
| Type "merge" — result count | ≥1 | 1 ✓ |
| Type "merge" — first result | `🔗 Merge PDF — Combine several PDFs into one` | ✓ |

## Visual Proof

Screenshot at `/tmp/search_open.png` — page open + search clicked + "merge" typed.
Captures the clean navbar and the top-right pill with the floating panel expanded
beneath it. The panel overlaps the hero text as expected (`position: fixed` is
above page content), so the user can always see and use it.

## Branch Diff vs. main (production)

```
$ git log main..feature/search-fixed-topright --oneline
7cf48f2 v12.32 (branch) fix: lift [hidden] priority so panel display follows class
9f7f8d6 v12.32 (branch): floating top-right search widget (collapsed pill -> expanded panel)
e5796c6 (main) v12.27: cache strategy upgrade ...  <- production HEAD
```

`git log main..HEAD` shows only the 2 v12.32 commits — main has **no new commits**
since the user last saw production (v12.31 was pushed directly via the GitHub API
in the previous session, but local main was reset to v12.27 because that was the
last locally committed baseline; the v12.31 production state lives on
`origin/main`).

## How to Promote to Production (when user approves)

When the user confirms the visual + behaviour, run:

```
git checkout main
git merge --no-ff feature/search-fixed-topright
git push origin feature/search-fixed-topright  # optional: review on GitHub first
vercel deploy --prod --yes
```

This will ship v12.32 to https://wezzik.com.

## Notes for the User

- The preview URL above is hosted on WorkBuddy CloudStudio and is independent
  of the Vercel / Cloudflare production stack. The user's site on
  https://wezzik.com is currently still running v12.31.
- If they want to compare side-by-side, **open https://wezzik.com in a normal
  Chrome window** (old v12.31 layout) **and the preview URL in another** (new
  v12.32 layout).
- The 2 open issues from earlier (CF Cache Rule on HTML, CF managed
  robots.txt) remain unchanged — they don't affect this layout change.
