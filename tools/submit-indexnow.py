#!/usr/bin/env python3
"""
IndexNow 提交脚本 — PDF Toolkit AI (wezzik.com)
================================================
作用：把 sitemap 里的所有 URL 一次性通知 Bing / Yandex / Seznam / Naver
      （Bing 同时给 DuckDuckGo / Ecosia / Yahoo 喂数据）。
      新站/新页面提交后，Bing 通常 5 分钟内抓取并收录。

前置：
  1. 根目录已放密钥文件 `<key>.txt`（内容 = key），部署后可通过
     https://wezzik.com/<key>.txt 公开访问 —— 这是 IndexNow 的域名所有权验证。
  2. 安装依赖：只用到标准库（urllib），无需 pip。

用法：
  # 提交 sitemap 里全部 URL（默认）
  python3 tools/submit-indexnow.py

  # 只提交单个新页面（发博客后调用）
  python3 tools/submit-indexnow.py --url https://wezzik.com/blog/my-new-post.html

  # 多 URL
  python3 tools/submit-indexnow.py --url A --url B

  # 演练（不真正发请求，打印将发送的 payload）
  python3 tools/submit-indexnow.py --dry-run

  # 指定 host / key（一般不用，脚本会自动从根目录的 <key>.txt 推断）
  python3 tools/submit-indexnow.py --host wezzik.com --key <key>

退出码：0 = 全部成功；非 0 = 有失败。
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# 配置（自动推断，一般不用改）
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # 项目根目录
DEFAULT_HOST = "wezzik.com"
INDEXNOW_EP = "https://api.indexnow.org/indexnow"

# 要抓取的 sitemap（部署后线上地址）
SITEMAP_URLS = [
    f"https://{DEFAULT_HOST}/sitemap-pages.xml",
    f"https://{DEFAULT_HOST}/sitemap-blog.xml",
]


def find_key() -> str:
    """从根目录找 <key>.txt 文件，返回 key 字符串。"""
    for name in os.listdir(ROOT):
        if re.fullmatch(r"[0-9a-f]{32}\.txt", name):
            with open(os.path.join(ROOT, name), "r", encoding="utf-8") as f:
                return f.read().strip()
    raise FileNotFoundError(
        "根目录未找到 <32-hex>.txt 密钥文件。请先运行生成脚本或手动放置。"
    )


def fetch_sitemap_urls() -> list:
    """抓取两个 sitemap，解析出所有 <loc> URL。"""
    urls = []
    for sm in SITEMAP_URLS:
        try:
            req = urllib.request.Request(sm, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=20).read().decode("utf-8")
        except Exception as e:
            print(f"  ! 无法抓取 {sm}: {e}", file=sys.stderr)
            continue
        found = re.findall(r"<loc>\s*(.*?)\s*</loc>", data, re.DOTALL)
        urls.extend(u.strip() for u in found if u.strip())
    # 去重并保持顺序
    seen, uniq = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


def submit(key: str, host: str, url_list: list, dry_run: bool = False) -> int:
    """向 IndexNow 提交一批 URL，返回 0=成功 / 1=失败。"""
    key_loc = f"https://{host}/{key}.txt"
    payload = {
        "host": host,
        "key": key,
        "keyLocation": key_loc,
        "urlList": url_list,
    }
    body = json.dumps(payload).encode("utf-8")

    if dry_run:
        print(f"[dry-run] 将向 {INDEXNOW_EP} POST {len(url_list)} 个 URL:")
        print(json.dumps(payload, indent=2)[:1500])
        return 0

    req = urllib.request.Request(
        INDEXNOW_EP,
        data=body,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "Mozilla/5.0",
        },
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        code = resp.getcode()
        text = resp.read().decode("utf-8", "replace")
        print(f"  HTTP {code} — {text[:200]}")
        return 0 if code in (200, 202) else 1
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        print(f"  HTTP {e.code} — {text[:200]}")
        return 1
    except Exception as e:
        print(f"  网络错误: {e}")
        return 1


def main():
    ap = argparse.ArgumentParser(description="Submit URLs to IndexNow (Bing et al.)")
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--key", default=None, help="默认自动从根目录 <key>.txt 读取")
    ap.add_argument("--url", action="append", default=[], help="单独提交某个 URL（可多次）")
    ap.add_argument("--dry-run", action="store_true", help="只打印，不真正发送")
    args = ap.parse_args()

    try:
        key = args.key or find_key()
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(2)

    if args.url:
        url_list = args.url
        print(f"提交 {len(url_list)} 个指定 URL ...")
    else:
        print("从 sitemap 抓取全部 URL ...")
        url_list = fetch_sitemap_urls()
        print(f"共解析到 {len(url_list)} 个 URL。")

    if not url_list:
        print("没有可提交的 URL，退出。")
        sys.exit(0)

    rc = submit(key, args.host, url_list, dry_run=args.dry_run)
    if rc == 0:
        print("✓ IndexNow 提交成功。Bing 通常 5 分钟内抓取。")
    else:
        print("✗ 提交失败，检查上面的 HTTP 状态码。", file=sys.stderr)
    sys.exit(rc)


if __name__ == "__main__":
    main()
