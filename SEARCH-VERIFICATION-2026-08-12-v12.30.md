# 搜索框重排位 + 键盘快捷键 — 验证报告 (v12.30)

**时间**：2026-08-12 13:44 GMT+8
**版本**：v12.30
**反馈**：搜索框位置不好（挤在 logo 边、像在右上角），需要换个位置；滚动后会消失。

## 改动

| 维度 | 改动 |
|------|------|
| **DOM 位置** | `brand → nav-links → nav-search → nav-cta`（搜索放在 nav-links 后、CTA 簇前，成为视觉主体）|
| **键盘快捷键** | Cmd/Ctrl+K 与 `/` 全局唤起 |
| **kbd 提示徽章** | ≥769px 显示 `⌘K / Ctrl K`，focus 后自动隐藏 |
| **CSS 视觉** | 圆角矩形代替胶囊；hover 边框色变化；focus 时背景切到 `--bg`；size 14 → 14.5px；height 40 → 42px |
| **JS 注入兜底** | 新增「links 与 cta 相邻时插 cta 前」的智能判定，避免极端情况位置紊乱 |
| **缓存版本** | HTML 引用 `12.29 → 12.30`、SW `v7 → v8` |

## 端到端验证（本地 agent-browser，真实 DOM）

```
DOM 顺序： a.brand | div.nav-links | div.nav-search | div.nav-cta   ← 搜索现在是第 3 位
kbd 元素： "⌘K display=flex w=34px"                                    ← 徽章可见 (≥769px)
搜索功能： input merge → 下拉 "🔗 Merge PDF Combine several PDFs into one"   ← 搜索照常工作

键盘事件：
  dispatchEvent(Cmd+K)  → OK_focused
  dispatchEvent(Ctrl+K) → OK_focused
  dispatchEvent('/')    → OK_focused
```

## 线上验证

```
首页 HTTP：        cf-cache-status: DYNAMIC  (HTML 缓存规则仍待 CF 后台启用)
首页引用版本号：   main.js?v=12.30
main.js?v=12.30：  含 1 处 nav-search__kbd + 1 处 Cmd/Ctrl 逻辑
style.css?v=12.30：含 3 处 nav-search__kbd 样式
Service Worker：   pdftoolkit-v8
```

## 部署

- **Vercel** `wezzik.com` Ready 8s（Aliased）
- **GitHub** `main` = `79dc959`（151 文件）

## 仍待 CF 后台手动处理（与本次改动无关）

1. Cache Rule 仍处 Test 模式（首页/工具页/中文页 `cf-cache-status: DYNAMIC`）
2. CF 托管的 robots.txt 拦截 GPT/Claude/Perplexity 爬虫，且丢 IndexNow 行

处理完可在 Cloudflare 后台操作 → 重跑复测。
