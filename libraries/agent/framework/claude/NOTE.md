# 学习笔记：Claude Agent SDK（TypeScript）

## 偏好
- 主题：Claude Agent SDK TypeScript 版，包 `@anthropic-ai/claude-agent-sdk`；文档区入口 https://code.claude.com/docs/en/agent-sdk/overview ，TS API 参考 https://code.claude.com/docs/en/agent-sdk/typescript 。
- 主题边界：只讲 SDK 视角，不教 Claude Code CLI 的终端交互式使用；CLI 能力（slash 命令、设置、插件、skills 等）只从"SDK 如何驱动"的角度讲。
- 主题边界：MCP 覆盖两条线——SDK 接入外部 MCP server 与 `createSdkMcpServer()` 进程内自定义工具；以及用官方 TypeScript MCP SDK 自建 stdio/Streamable HTTP server。
- 主题边界：排除 Python SDK、原始 Messages API（`@anthropic-ai/sdk`）、Bedrock/Vertex/Foundry 专属接入与 Claude Code 产品日常使用技巧；Bedrock/Vertex 如有需要再补课。
- 范例：讲解为主——范例以代码 + 预期输出展示，不强求每次真实运行；关键课程提供可运行脚本，并标注凭证前置与成本控制。
- 运行环境：Node.js >= 18、ESM（`"type": "module"`）、TypeScript + tsx 运行脚本；包管理器 npm。

## 工作笔记
- 凭证：SDK 需要 `ANTHROPIC_API_KEY`（Claude Console 获取）；订阅登录不支持第三方 SDK 用途；SDK 不自动加载 `.env`。
- API 版本：以稳定 V1 `query()` 流式 API（v0.3.x）为准；实验性 V2 session API（`unstable_v2_*`）已在 0.3.142 移除，课程不得引用。
- SDK 捆绑 Claude Code CLI 运行时，query 进程实际驱动 CLI 子进程；打包不可 bundle CLI，细节以官方 troubleshooting / hosting 页为准。
- 旧包名 `@anthropic-ai/claude-code`（原 Claude Code SDK）已更名为 `@anthropic-ai/claude-agent-sdk`；使用旧包名的网络教程视为过时，甄别时以官方文档为准。
