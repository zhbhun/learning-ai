# [MCP](https://modelcontextprotocol.io/introduction)

## 架构

> 客户端–服务器（C/S）架构，消息格式基于 JSON-RPC 2.0

```
┌───────────── Host（宿主应用，如 Claude Code / Cursor）─────────────┐
│  ┌─ Client 1 ─┐   ┌─ Client 2 ─┐        （每个 server 一个 client） │
└──┼─────┬──────┴───┴─────┬──────┴────────────────────────────────┘
       │ stdio/http       │
┌──────▼───────┐   ┌──────▼───────┐
│ MCP Server A │   │ MCP Server B │  （轻量进程，各自暴露工具/资源/提示词）
└──────────────┘   └──────────────┘
```

- **Host**：用户直接使用的 AI 应用，负责创建并管理多个 Client
- **Client**：Host 为**每个** Server 创建一个专属 Client，维持 1:1 连接（独立会话、能力协商），转发 LLM 的请求
- **Server**：专注于某一能力域（文件、Git、浏览器…），按需暴露原语
- 类比：MCP 之于 AI 应用 ≈ USB-C 之于外设 —— 统一接口，即插即用

## 能力

Server 可暴露的三种原语：

- **工具 Tools**：类比 POST 接口（有副作用），由模型自主决定调用 —— 查库、发消息、执行操作
- **资源 Resources**：类比 GET 接口（只读），由应用/用户选择 —— 给模型喂上下文：文件、日志、数据库记录
- **提示词 Prompts**：参数化模板，由用户主动调用 —— 预置的 prompt 模板，常以 `/命令` 形式出现

开启一个 MCP server 后，agent 上下文里实际发生了什么：

- **工具**：`tools/list` 拿到的工具定义（name + description + inputSchema）**自动注入**每次请求，模型据描述决定调用；调用结果再作为消息进入上下文。工具多 = 每次请求都多烧 token，所以只开需要的 server
- **资源**：只暴露清单不进上下文，用户 @ 选中或应用 `resources/read` 后内容才注入
- **提示词**：不自动注入，用户触发 `/命令` 时模板展开为一条消息

Client 侧能力（方向反过来：Server 运行中反向调用 Client）：

- **Sampling**：Server 自己没有 LLM，工具执行中需要模型能力（如总结日志、生成文案）时，经 Client 请求一次 LLM 补全（一般需用户审批）
- **Roots**：Client 告知 Server 可访问的根目录（如 `/path/to/project`），划定文件访问边界
- **Elicitation**：工具执行中缺参数/需决策时，Server 经 Client 的 UI 弹表单向用户索要输入，拿到后继续

## 通信

### stdio

本地 server —— 客户端拉起子进程，走标准输入/输出；零网络配置、延迟低，但只能本机用

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "env": { "API_KEY": "xxx" }
    }
  }
}
```

ps: 

- 本地包一律加 `-y` 跳过 npx 确认；Node 用 `npx`，Python 用 `uvx`
- 无 `npx` 环境的客户端可经 `mcp-remote` 代理远程 server
- 桌面端一键安装：`mcpb` 扩展包

### Streamable HTTP

远程 server —— HTTP POST + 可选 SSE 流式推送；可多客户端共享、需鉴权，独立部署运维

```json
{
  "mcpServers": {
    "remote": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

## 配置

> 核心三要素：`transport`（stdio/http）、`command/url`、`env/headers`

| 客户端 | 路径 |
| --- | --- |
| Claude Code | `~/.claude.json` 或 `claude mcp add <name> -- npx <pkg>` |
| Cursor | `~/.cursor/mcp.json` |
| VS Code | `.vscode/mcp.json` 或用户设置 |

## 安全

- **冒名顶替**：恶意 server 伪装成可信 server，窃取数据或下发恶意指令 → **认证**：OAuth / API Token 验证 server 身份；只装可信来源的 server
- **提示词注入**：工具返回的内容里藏指令，劫持模型行为（如把数据发到外部）→ **审批**：工具调用前人工确认；**拦截**：对敏感工具/参数做规则过滤
- **工具权限滥用**：server 声明的能力超出所需，或被诱导执行高危操作（删库、转账）→ 最小权限授权；高危操作强制审批 + 日志审计

要点：**信任边界在 Client** —— 所有 server 能力都应经 Client 层的审批与拦截，而不是默认信任模型判断。

## 资源

官方

- [MCP 官方文档](https://modelcontextprotocol.io/) / [规范](https://modelcontextprotocol.io/specification) / [Anthropic MCP](https://github.com/modelcontextprotocol)
- [mcpb](https://github.com/modelcontextprotocol/mcpb)：Desktop Extensions，桌面端一键安装本地 server

主流 Server

- 官方参考实现（[modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)）：filesystem、git、fetch、memory、sequential-thinking、time
- [GitHub MCP](https://github.com/github/github-mcp-server)：仓库/Issue/PR 操作
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) / [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)：浏览器自动化与调试
- [Context7](https://github.com/upstash/context7)：给模型喂最新库文档
- 协作与数据：Notion、Slack、Figma、Postgres 等官方/社区 server

收集站（找 server 用）

- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)：社区精选清单
- [mcp.so](https://mcp.so/) / [Smithery](https://smithery.ai/) / [mcp-get](https://mcp-get.com/)：目录站，支持搜索与一键安装
- [MCP on Pipedream](https://mcp.pipedream.com/) / [Zapier MCP](https://zapier.com/mcp)：托管型，直接接入几千个 SaaS


---


## 教程

- [6000字+6个案例：写给普通人的MCP入门指南](https://mp.weixin.qq.com/s/BjsoBsUxCzeqXZq46_nrog)
- [一文秒懂AI核心：Agent、RAG、Function Call与MCP全解析](https://mp.weixin.qq.com/s/3Uzd9zE1nQ-G2RWaVmmJJg)
- [MCP是啥？技术原理是什么？一个视频搞懂MCP的一切](https://www.bilibili.com/video/BV1AnQNYxEsy)
- [如何让你的 Agent 更准确：MCP 工具设计技巧](https://www.bestblogs.dev/article/7cae3237)

## 客户端

- https://modelcontextprotocol.io/clients
- Visual Studio Code
- Cursor
- WindSurf
- Claude
- Cline
- [RooCode](https://github.com/RooVetGit/Roo-Code)
