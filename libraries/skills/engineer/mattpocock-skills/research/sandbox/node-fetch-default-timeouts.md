# Node.js 内置 fetch 的默认超时行为

> 调研日期：2026-11-05 · 环境：Node `v26.13.0`（内置 undici `8.12.2`，见 `process.versions.undici`）· macOS (Darwin 25.5.0)

## TL;DR

Node 内置 `fetch` **并非"没有超时"**，它基于 undici，由 Agent 的三个默认值共同把关：

| 阶段 | undici 选项 | 默认值 | 超时错误（`err.cause`） | 错误码 |
|---|---|---|---|---|
| 建立 TCP/TLS 连接 | `connectTimeout` | **10 秒** (`10e3`) | `ConnectTimeoutError` | `UND_ERR_CONNECT_TIMEOUT` |
| 收完响应头 | `headersTimeout` | **300 秒** (`300e3` = 5 分钟) | `HeadersTimeoutError` | `UND_ERR_HEADERS_TIMEOUT` |
| 响应体**相邻 chunk 之间**的间隔 | `bodyTimeout` | **300 秒** (`300e3` = 5 分钟) | `BodyTimeoutError` | `UND_ERR_BODY_TIMEOUT` |

三个值都可以设为 `0` 完全禁用（undici 文档原文："Use `0` to disable it entirely."）。

对外统一的表现形式：`fetch()` 返回的 promise 以 **`TypeError`** reject（等待响应头阶段 message 为 `"fetch failed"`；读 body 阶段为 `"terminated"`），真实原因挂在 **`err.cause`** 上——只看 `err.name`/`err.message` 会丢掉全部有效信息。

## 各阶段语义（对照一手来源）

### `connectTimeout` — 建连超时，默认 10 秒

undici Client 文档："The timeout, in milliseconds, for establishing a socket connection."（默认 `10e3`）

覆盖 DNS 之后到 socket 建立为止的窗口；对 TLS 目标也覆盖握手。

**实测**（Node v26.13.0，对不可路由地址 `http://10.255.255.1:81/` 发请求，SYN 无应答）：

```json
{
  "waitedMs": 10529,
  "topLevel": { "name": "TypeError", "message": "fetch failed" },
  "cause": {
    "name": "ConnectTimeoutError",
    "code": "UND_ERR_CONNECT_TIMEOUT",
    "message": "Connect Timeout Error (attempted address: 10.255.255.1:81, timeout: 10000ms)"
  }
}
```

错误消息里直接写明了默认值 `timeout: 10000ms`。若内核先失败（如端口拒绝连接），则不等超时，`err.cause` 为 `Error: connect ECONNREFUSED ...` 之类。

### `headersTimeout` — 响应头超时，默认 300 秒

undici Client 文档默认值 `300e3`，监控"发出请求到收完响应头"的时长。服务器收到请求后迟迟不返回状态行/响应头，5 分钟后被掐断。

**实测**（本地起 http server，接受请求但永远不回响应头）：

```json
{
  "waitedMs": 301340,
  "topLevel": { "name": "TypeError", "message": "fetch failed" },
  "cause": { "name": "HeadersTimeoutError", "code": "UND_ERR_HEADERS_TIMEOUT", "message": "Headers Timeout Error" }
}
```

`301340ms ≈ 300s + 1.3s`：undici 文档明确说明这些定时器"not guaranteed to fire with exact millisecond precision"（快定时器目标分辨率约 500ms），所以实测值总是略超 300 秒。

### `bodyTimeout` — 响应体 chunk 间隔超时，默认 300 秒

undici Client 文档：默认 `300e3`，**"Monitors the time between consecutive body chunks."** 这是关键语义：它不是"整个 body 最多传 5 分钟"，而是"相邻两个数据块之间最多等 5 分钟"。

- 一个总耗时 20 分钟但数据持续到达的慢下载**不会**触发它；
- 一个收到响应头、传了几个字节后彻底停滞的流，在最后一片字节之后 5 分钟被掐断。

**实测**（server 发送 `content-length: 1000` 但只写 10 字节就停滞；`res.text()` 在等完剩余 body 时 reject）：

```json
{
  "waitedMs": 301117,
  "topLevel": { "name": "TypeError", "message": "terminated" },
  "cause": { "name": "BodyTimeoutError", "code": "UND_ERR_BODY_TIMEOUT", "message": "Body Timeout Error" }
}
```

注意顶层错误变成 `TypeError: terminated`（fetch 规范里"流被终止"的固定形态），同样要看 `err.cause` 才知道是 body 超时。

## 错误码定义（undici Errors 文档原文）

- `UND_ERR_CONNECT_TIMEOUT` — "The socket was destroyed because establishing the connection exceeded the `connectTimeout` option."
- `UND_ERR_HEADERS_TIMEOUT` — "The socket was destroyed because receiving the response headers exceeded the `headersTimeout` option."
- `UND_ERR_BODY_TIMEOUT` — "The socket was destroyed because reading the response body exceeded the `bodyTimeout` option."

## 如何修改超时（均在 Node v26.13.0 实测生效）

### 方式一：per-request 传自定义 dispatcher（Node 非标准扩展）

Node 官方文档（globals › fetch › Custom dispatcher）："You can use a custom dispatcher to dispatch requests passing it in fetch's options object. The dispatcher must be compatible with undici's `Dispatcher` class."

```js
import { Agent } from 'undici'; // npm i undici

const res = await fetch(url, {
  dispatcher: new Agent({ headersTimeout: 10_000, bodyTimeout: 30_000, connectTimeout: 5_000 }),
});
```

实测：`Agent({ headersTimeout: 1000 })` 对内置 fetch 生效，1.5 秒后抛 `UND_ERR_HEADERS_TIMEOUT`。

### 方式二：全局替换 dispatcher

Node 官方文档："It is possible to change the global dispatcher in Node.js by installing `undici` and using the `setGlobalDispatcher()` method. Calling this method will affect both `undici` and Node.js."

```js
import { setGlobalDispatcher, Agent } from 'undici';
setGlobalDispatcher(new Agent({ headersTimeout: 10_000, bodyTimeout: 30_000 }));
```

实测：500ms 的全局 `headersTimeout` 对内置 fetch 生效，1.0 秒后抛 `UND_ERR_HEADERS_TIMEOUT`。

### 方式三：`AbortSignal.timeout()` —— 给"整个请求"设上限（推荐补充）

三个 undici 超时是分段的，没有一个覆盖"从发请求到 body 读完"的总时长。规范层做法：

```js
await fetch(url, { signal: AbortSignal.timeout(30_000) });
```

实测（配合不响应的服务器）：1 秒后 reject，抛的是 **`TimeoutError` DOMException**（`name: "TimeoutError"`, `message: "The operation was aborted due to timeout"`），**不是** `TypeError`，也没有 `cause`。用 `AbortController.abort()`（无 reason）则是 `AbortError` DOMException（MDN）。写错误处理时这是第五种形态，别漏。

### `0` = 禁用

undici 文档：三个超时选项均可 `"Use 0 to disable it entirely."`（例如长连接 SSE/流式响应可设 `bodyTimeout: 0`，改用 signal 控制总时长）。

## 出处

1. **Node.js 官方文档** — `fetch` 全局函数（基于 undici、`dispatcher` 选项、`setGlobalDispatcher` 均出自此页）：https://nodejs.org/api/globals.html#fetch
2. **undici Client 文档** — `headersTimeout` / `bodyTimeout` / `connectTimeout` / `keepAliveTimeout` 的默认值与语义（"Monitors the time between consecutive body chunks"、`0` 禁用、定时器分辨率说明）：https://undici.nodejs.org/#/docs/api/Client.md （源文件：https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md ）
3. **undici Errors 文档** — 三个 `UND_ERR_*` 错误码的原文定义：https://github.com/nodejs/undici/blob/main/docs/docs/api/Errors.md
4. **Node 二进制内嵌 undici 源码**（最直接的一手证据，Node v26.13.0 / undici 8.12.2）：
   - `this[kHeadersTimeout] = headersTimeout != null ? headersTimeout : 3e5;`
   - `this[kBodyTimeout] = bodyTimeout != null ? bodyTimeout : 3e5;`
   - `this.code = "UND_ERR_HEADERS_TIMEOUT" / "UND_ERR_BODY_TIMEOUT" / "UND_ERR_CONNECT_TIMEOUT"`
   - 查看方式：`node --expose-internals -p "process.versions.undici"`；或 `strings $(which node) | grep -E "UND_ERR_HEADERS_TIMEOUT"`。undici 上游同一段默认值在 `lib/client.js`（`Client` 构造函数）。
5. **MDN** — abort 后的 `AbortError` DOMException：https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
6. **本地实测**（本笔记所有 `waitedMs` 数据）：Node v26.13.0，见文末复现脚本。

## 复现脚本

```js
// headers-stall.mjs —— 响应头超时实测（body 同理：先写头和几个字节再停滞）
import http from 'node:http';
const server = http.createServer(() => {}); // 收下请求，永不响应
await new Promise(r => server.listen(0, '127.0.0.1', r));
const t0 = Date.now();
try {
  await fetch(`http://127.0.0.1:${server.address().port}/`);
} catch (err) {
  console.log(Date.now() - t0, err.name, err.message, '| cause:', err.cause?.name, err.cause?.code);
} finally { server.close(); }
// 预期输出（约 301 秒后）：
// 301340 TypeError fetch failed | cause: HeadersTimeoutError UND_ERR_HEADERS_TIMEOUT
```

```js
// connect-stall —— 连接超时实测（秒回）
const t0 = Date.now();
try { await fetch('http://10.255.255.1:81/'); }
catch (err) {
  console.log(Date.now() - t0, err.cause?.name, err.cause?.code, err.cause?.message);
}
// 预期输出（约 10.5 秒后）：
// 10529 ConnectTimeoutError UND_ERR_CONNECT_TIMEOUT Connect Timeout Error (attempted address: 10.255.255.1:81, timeout: 10000ms)
```

## 版本注意事项

- 默认值 `300e3 / 300e3 / 10e3` 自 undici 早期版本起长期未变，但**以你运行时的版本为准**：`node -p "process.versions.undici"` 查内置版本，或用上面的 `strings` 命令验证当前二进制。
- Node 文档页未描述任何 fetch 层的超时选项——`fetch` 本身**没有** `timeout` 参数，一切超时都来自底层 dispatcher（undici Agent）。
