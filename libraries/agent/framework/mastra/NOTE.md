# 学习笔记：Mastra

## 偏好

- 主题边界：Mastra 框架本体——安装、Agent、工具、工作流、记忆、RAG、MCP 与互联协议、扩展能力（Sandbox/Browser/Channels/Voice/Skills）、Harness 长时运行、Server 与部署、可观测性与 Evals、Mastra Platform。不深入 Vercel AI SDK 本身（Mastra 已内建 model router），不做多框架横向对比，不覆盖提示词工程理论。
- 运行环境：TypeScript + Node.js（≥ 20），npm；示例以 Node 脚本与 CLI 为主，Web 集成课程涉及 Next.js / Hono / Express。
- 模型接入：统一使用 model router 的 `provider/model` 字符串（如 `openai/gpt-...`、`google/gemini-...`），API key 走环境变量；示例代码保持 provider 可替换。
- 学习节奏：长期系统学习，从零上手延伸到生产化与进阶分支；课程兼顾顺读与回查。

## 工作笔记

- 该目录是与 autogen / crewai / deepagent 并列的框架学习目录之一，父目录 README.md 由用户维护。
- Mastra 版本迭代较快（v1 后仍在增加 Long-running Agents、Workspace 等新能力），写课时以 mastra.ai/docs 当前版本为准，注意核对包版本号。
- 本地开发调试入口是 Studio（`mastra dev`），文档中旧称 Playground；写课统一用当前称谓。
- 2026-09 官方文档结构：Agents / Workflows / Memory / Storage / Harness（长时运行）/ Connections（MCP、A2A、ACP、SDK agents）/ Sandbox / Browser / Channels / Skills / Server / Auth / Observability / Evals / Deployment / Studio / Mastra Platform；RAG 概念内容在 reference/rag 下，语音在 integrations/voice 下。agents/networks 已标注 Deprecated，官方替代是 subagents（supervisor 模式）。
- 多个子能力为 Beta（file-based agents、code-mode、durable agents、schedules、signals、goals、agent controller 等），写课时按当页标注注明成熟度。
