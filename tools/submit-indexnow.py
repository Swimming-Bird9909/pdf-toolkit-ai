#!/usr/bin/env python3
"""
PDF Toolkit AI — IndexNow submission helper.

Notifies Bing / Yandex / Naver / Seznam (and any IndexNow-consuming engine)
that the site's URLs changed, so they re-crawl within minutes instead of
waiting for the sitemap poll cycle.

Usage:
    python3 tools/submit-indexnow.py                 # submit ALL urls from sitemaps
    python3 tools/submit-indexnow.py --dry-run       # print urls, no POST
    python3 tools/submit-indexnow.py --url https://wezzik.com/blog/new.html  # single url

The key is inferred from the <32-hex>.txt file at the project root.
"""
import os
import re
import sys
import json
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = "wezzik.com"
API = "https://api.indexnow.org/indexnow"

# Child sitemaps referenced by sitemap.xml (sitemapindex).
SITEMAPS = [
    f"https://{HOST}/sitemap-pages.xml",
    f"https://{HOST}/sitemap-blog.xml",
]


def opener():
    """Build a urlopen opener that respects HTTP(S)_PROXY env vars."""
    proxies = {}
    for scheme in ("http", "https"):
        env = os.environ.get(f"{scheme}_proxy") or os.environ.get(f"{scheme.upper()}_PROXY")
        if env:
            proxies[scheme] = env
    if proxies:
        return urllib.request.build_opener(urllib.request.ProxyHandler(proxies))
    return urllib.request


def find_key():
    """Locate the 32-hex IndexNow key file in project root."""
    for name in os.listdir(ROOT):
        if re.fullmatch(r"[0-9a-f]{32}\.txt", name):
            with open(os.path.join(ROOT, name), "r", encoding="utf-8") as f:
                return name[:-4], f.read().strip()
    raise SystemExit("IndexNow key file (<32-hex>.txt) not found in project root.")


def fetch_urls():
    """Parse <loc> entries from the child sitemaps.

    Prefers local sitemap files committed in the repo root (fast, offline-safe),
    and falls back to fetching the live sitemaps when run after deploy.
    """
    urls = []
    local_map = {
        f"https://{HOST}/sitemap-pages.xml": os.path.join(ROOT, "sitemap-pages.xml"),
        f"https://{HOST}/sitemap-blog.xml": os.path.join(ROOT, "sitemap-blog.xml"),
    }
    op = opener()
    for sm in SITEMAPS:
        body = None
        local = local_map.get(sm)
        if local and os.path.exists(local):
            with open(local, "r", encoding="utf-8") as f:
                body = f.read()
        else:
            try:
                with op.open(sm, timeout=20) as r:
                    body = r.read().decode("utf-8", "replace")
            except urllib.error.URLError as e:
                print(f"  ! could not fetch {sm}: {e}", file=sys.stderr)
                continue
        for m in re.findall(r"<loc>\s*(.*?)\s*</loc>", body, re.S):
            u = m.strip()
            # Skip redirect targets (IndexNow rejects 3xx URLs with 422).
            if u.rstrip("/") in (f"https://{HOST}/blog",
                                 f"https://{HOST}/blog/"):
                continue
            urls.append(u)
    # de-dup, keep order
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def post(key, key_loc, url_list):
    payload = json.dumps({
        "host": HOST,
        "key": key,
        "keyLocation": key_loc,
        "urlList": url_list,
    }).encode("utf-8")
    req = urllib.request.Request(
        API,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with opener().open(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def main():
    key, _ = find_key()
    key_loc = f"https://{HOST}/{key}.txt"

    single = None
    dry = False
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--dry-run":
            dry = True
        elif a == "--url":
            i += 1
            single = args[i]
        i += 1

    if single:
        urls = [single]
    else:
        urls = fetch_urls()

    if not urls:
        print("No URLs to submit.")
        return

    print(f"IndexNow key : {key}")
    print(f"Key location : {key_loc}")
    print(f"URLs to send : {len(urls)}")
    if dry:
        for u in urls:
            print("  -", u)
        print("(dry-run, no request sent)")
        return

    status, resp = post(key, key_loc, urls)
    print(f"HTTP {status}")
    print(resp)
    if status in (200, 202):
        print("OK — search engines notified.")
    else:
        print("Submission returned an error (see above).")


if __name__ == "__main__":
    main()
