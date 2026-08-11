# Cloudflare Workers + KV — 流量计数器自建指南

## 为什么自建

- `counterapi.dev` **v1 API 已在 2026-08-07 永久废弃**（返回 HTTP 410），v2 必须注册账号 + Bearer token + 缓冲延迟
- 你的 DNS 已在 Cloudflare，部署 Worker 一气呵成，**国内访问比 counterapi.dev 友好**
- 免费额度：Workers 10 万请求/天 + KV 10 万读/天 + 1000 写/天（绝对够个人站用）

## 第一步：创建 KV 命名空间

1. 登录 https://dash.cloudflare.com/
2. 左侧菜单 **Workers & Pages** → 右上角 **KV** 标签（如果没看到，先点进任意 Worker 页面就有了）
3. 点 **Create a namespace**
4. 名字填：`vc-counter-kv`
5. 点 **Add** → 记下 namespace ID（暂时用不到）

## 第二步：创建 Worker

1. 左侧 **Workers & Pages** → **Create** → **Create Worker**
2. Worker 名字：`vc-counter`（最终 URL 会是 `vc-counter.<your-subdomain>.workers.dev`，但我们会绑自定义域名，不影响）
3. 点 **Deploy**（先部署一个 hello world 占位）
4. 部署完成后点 **Edit Code**（或 **Edit Worker**）
5. **全选删除**默认代码，把 `cf-worker/visitor-counter.js` 里的代码完整粘贴进去
6. 点右上角 **Save and Deploy**

## 第三步：绑定 KV

1. 回到 Worker 详情页 → 左侧 **Settings** → **Variables**
2. 滚到 **KV Namespace Bindings** → 点 **Add binding**
3. Variable name: `VC_KV`（必须大写，和代码一致）
4. KV namespace: 下拉选刚才创建的 `vc-counter-kv`
5. 点 **Save and Deploy**

## 第四步：绑自定义域名

1. Worker 详情页 → **Settings** → **Triggers** → **Custom Domains** → **Add Custom Domain**
2. 输入：`vc.wezzik.com`
3. CF 会自动加 DNS 记录（无需手动操作）
4. 等 10~30 秒生效

## 第五步：验证

打开浏览器，依次访问（每个都应该返回 JSON）：

```
https://vc.wezzik.com/total              → {"count":0}
https://vc.wezzik.com/total/up           → {"count":1}
https://vc.wezzik.com/total/up           → {"count":2}
https://vc.wezzik.com/daily/2026-08-08   → {"count":0}
https://vc.wezzik.com/daily/2026-08-08/up → {"count":1}
```

⚠️ 看到 `{"count":0}` 正常——这是新 Worker，KV 还没数据。访问 /up 端点会写 1，再读就能看到 1。

如果浏览器有缓存，加 query string `?t=<随机数>` 强制刷新。

## 第六步：前端生效

前端代码（`js/visitor-counter.js`）已经改为调用 `https://vc.wezzik.com`，本次 Vercel 部署后立即生效。

**不需要额外操作**，直接打开 wezzik.com 滚到底部就能看到数字。

## 监控 / 重置

- **看总数**：Cloudflare Dashboard → Workers & Pages → KV → `vc-counter-kv` → 看到 `total` 和 `daily:YYYY-MM-DD` 这些 key
- **手动 +1**：浏览器访问 `https://vc.wezzik.com/total/up`
- **重置为 0**：Dashboard → KV → 找到 key → Edit → Value 改为 `0` → Save
- **看调用次数**：Dashboard → vc-counter Worker → Metrics（免费额度用得很少不用看）

## 常见问题

**Q: 报错 500 / KV error？**
A: 99% 是 KV 绑定变量名写错。必须是 `VC_KV`（大写带下划线），和你代码里 `env.VC_KV` 完全一致。

**Q: 报错 404 Not found？**
A: 路由格式不对。检查 URL 末尾有没有多余斜杠、日期格式是不是 `YYYY-MM-DD`（月份和日期要 0 补齐）。

**Q: 国内访问慢？**
A: `vc.wezzik.com` 走 CF 节点，国内一般 100-300ms。如果偶尔 1s+ 是 Worker 冷启动，免费版偶发，重试即可。
