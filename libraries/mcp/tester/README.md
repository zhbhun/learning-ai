# MCP Tester

一个最小备忘录（Notes）MCP Server，演示三种原语的用法：

| 原语 | 示例 | 触发方 |
| --- | --- | --- |
| 工具 Tools | `add-note` / `delete-note` | 模型自主调用（类比 POST，有副作用） |
| 资源 Resources | `note://notes` 列表 + `note://notes/{id}` 模板 | 应用/用户选择后注入上下文（类比 GET，只读） |
| 提示词 Prompts | `summarize-notes(style)` | 用户主动触发（常以 `/命令` 形式出现） |

## 运行

```bash
npm install
npm test   # 客户端拉起 server 子进程，依次演练三种原语
```

- [server.js](./server.js)：MCP Server，stdio 传输
- [client.js](./client.js)：测试客户端，演示 `listTools/callTool`、`listResources/readResource`、`listPrompts/getPrompt`

## 接入 Claude Code

```bash
claude mcp add notes-tester -- node /absolute/path/to/libraries/mcp/tester/server.js
```

接入后：

- **工具**：`tools/list` 的定义自动注入每次请求，模型据 description 决定调用
- **资源**：只暴露清单，@ 选中后才读取内容
- **提示词**：以 `/summarize-notes` 形式出现，触发时模板展开为一条消息

## 要点

- Server 日志必须走 **stderr**，stdout 被 JSON-RPC 消息占用
- 工具的 `inputSchema` / 提示词的 `argsSchema` 用 zod 声明，`.describe()` 的文案直接影响模型的调用决策
- 工具失败时返回 `isError: true`，模型会据此调整后续行为
- 资源模板（`ResourceTemplate`）的 `list` 回调让客户端能枚举出当前所有可用 URI
