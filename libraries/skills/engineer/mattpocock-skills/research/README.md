# research

> 对照高信任度的一手信源调研问题,把结论整理成一份带出处的 Markdown 文件存进仓库。可自动、仅手动。

## 场景

开发者想搞清 Node.js 内置 fetch 的默认超时行为——官方文档语焉不详,答案散在 undici 文档和源码里,正适合交给调研代理去挖。

## 对话

- /research Node.js 内置的 fetch(基于 undici)默认的超时行为是什么?请求头和响应体各自的默认超时是多少、超时时会抛什么错误?把结论整理成一份带出处的 Markdown 笔记,保存到 sandbox/ 目录下。

  ```md
  调研完成,笔记已保存。
  ## 结论
  **笔记位置**:`sandbox/node-fetch-default-timeouts.md`(沿用兄弟目录 kebab-case 命名习惯)
  **核心结论**:Node 内置 fetch(基于 undici)并非无超时,由三个分段超时把关,fetch 层自身没有 `timeout` 参数:
  | 阶段 | 默认值 | 错误(在 `err.cause` 上) |
  |---|---|---|
  | 建连 `connectTimeout` | **10 秒** | `ConnectTimeoutError` / `UND_ERR_CONNECT_TIMEOUT` |
  | 收响应头 `headersTimeout` | **300 秒**(5 分钟) | `HeadersTimeoutError` / `UND_ERR_HEADERS_TIMEOUT` |
  | 响应体 chunk 间隔 `bodyTimeout` | **300 秒** | `BodyTimeoutError` / `UND_ERR_BODY_TIMEOUT` |
  关键细节:
  - `bodyTimeout` 监控的是**相邻 chunk 之间的间隔**,不是整个 body 的总时长——慢速但持续的下载不会触发;三值均可设 `0` 禁用。
  - 对外统一表现为 `TypeError`(headers 阶段 `"fetch failed"`,body 阶段 `"terminated"`),真实原因在 `err.cause` 里。
  - 修改方式:per-request `dispatcher: new Agent({...})`、全局 `setGlobalDispatcher()`(需 npm undici),或 `AbortSignal.timeout()` 控制总时长(实测抛 `TimeoutError` DOMException,是第五种错误形态)。
  **证据链**(均写入笔记出处一节):Node 官方文档(globals›fetch)、undici Client/Errors 官方文档原文、Node v26.13.0 二进制内嵌 undici 源码(`3e5` 默认值的直接证据),以及全部本地实测——headers/body 超时各实测约 301 秒(含 undici 快定时器约 500ms 分辨率)、connect 超时实测 10.5 秒(错误消息自带 `timeout: 10000ms`)、两种 dispatcher 配置方式实测生效。
  ```

## 总结

这个技能解决的是「帮我查清楚 X」这类请求:接单后整个丢给一个后台调研代理,代理查完把带出处的笔记存进仓库,你不用盯着。

实际用下来的感受是,它对「一手信源」的执行很较真:子代理没有搜几篇二手文章就抄结论,而是把每条结论追到源头——Node 官方文档、undici 官方文档原文,甚至用 `--expose-internals` 直接从本地 Node 二进制里挖出内嵌的 undici 源码确认默认值字面量,然后自己写模拟服务器做实测,等满 5 分钟验证超时真的会触发、错误真的长那样。产出的笔记([sandbox/node-fetch-default-timeouts.md](sandbox/node-fetch-default-timeouts.md))从结论表格到复现脚本,证据链完整,基本可以直接当权威答案用。

最明显的局限是慢:这次调研跑了约 16 分钟,大头花在「等 300 秒超时真实触发」这类实测上。想要快答案时,这种每条结论都实证的做法偏重;但换来的是笔记里每个数字都有出处、都验证过。另外技能对笔记存放位置只有一句「放仓库已有的惯例位置」,子代理靠看兄弟目录的命名习惯(kebab-case)自己定的——仓库里没有惯例时,位置就是代理自己挑。
