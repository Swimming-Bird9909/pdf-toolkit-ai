# 搜索框重排版 v12.31 — 验证报告

**时间**：2026-08-12 14:26 GMT+8
**版本**：v12.31
**反馈**：v12.30 把搜索塞 nav-links 和 CTA 之间，导致 nav 文字被挤压换行（"工"+"具"、"为什么选我"+"们"等）；要求搜索框移出 navbar、navbar 宽松。

## 改动

| 维度 | 改动 |
|------|------|
| **搜索条位置** | 移出 navbar，作为 navbar 的 sibling（DOM 顺序：`nav.navbar → div.nav-search → header.hero`）|
| **sticky** | `position: sticky; top: 64px` —— 永远跟 navbar 一起在顶部 |
| **结构** | `.nav-search > .nav-search__inner (max-width:var(--container)) > .nav-search__box (max-width:640px)` |
| **navbar 图标按钮** | 新增 `.nav-search-toggle`（36×36px，在 nav-cta 内），点击聚焦 input |
| **navbar 内部** | 移除搜索框，nav-links 恢复 `gap: 26px` 不再换行 |
| **缓存版本** | HTML 引用 `12.30 → 12.31`、SW `v8 → v9` |

## 端到端验证（线上 wezzik.com）

```
navbar 子元素：    ["brand","nav-links","nav-cta"]   ← 不再有 nav-search ✅
body 前5顺序：     nav.navbar → div.nav-search → header.hero → section → section   ← 红框位置 ✅
搜索条位置：       searchTop=65, navbarBottom=65   ← 紧贴 navbar 下方 ✅
搜索条宽度：       searchWidth=1265, inner=1180px, box=640px   ← 居中、宽度合理 ✅
toggle 按钮：      w=36 h=36, inCTA=true   ← navbar 右侧图标按钮 ✅
Cmd+K 快捷键：     OK_focused   ← 全局快捷键工作 ✅
点 toggle 按钮：   OK_focused   ← 点图标也能聚焦 input ✅
搜索 'merge'：    option "🔗 Merge PDF Combine several PDFs into one"   ← 搜索结果正常 ✅
```

## 部署

- **Vercel** `wezzik.com` Ready 9s（Aliased）
- **GitHub** `main` = `84c7d58`（152 文件）

## 仍待 CF 后台手动处理（与本次改动无关）

1. Cache Rule 仍处 Test 模式（首页/工具页/中文页 `cf-cache-status: DYNAMIC`）
2. CF 托管的 robots.txt 拦截 GPT/Claude/Perplexity 爬虫，且丢 IndexNow 行

## 验证用脚本（可复用）

- `tools/submit-indexnow.py` — IndexNow 批量提交（沙箱内不通 api.indexnow.org，需本机跑）
- 端到端验证模板：agent-browser + `no_proxy=127.0.0.1,localhost` + 访问 `https://wezzik.com/`
