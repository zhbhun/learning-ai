# 学习笔记：LangChain（TypeScript）

## 偏好
- 主题：LangChain 1.x 平台速查手册，TypeScript / LangChain.js 为主线（非 Python）。
- 覆盖范围（用户按 docs.langchain.com 指定）：LangChain、LangGraph、Deep Agents、OpenWiki、LangSmith。
  - LangChain.js 与 LangGraph.js 是主线，完整展开。
  - Deep Agents 与 Managed Deep Agents 均有官方 JavaScript 实现与完整文档（/oss/javascript/deepagents、/langsmith/javascript/managed-deep-agents-*），与主线同为 TypeScript，完整展开。
  - OpenWiki 作为工具使用课覆盖（npm CLI，站在使用者角度）。
  - LangSmith 覆盖平台设置与 JS SDK（追踪、观测）。
- 示例模型提供方以 OpenAI 为主（`@langchain/openai`）；与 `tester/` 现有 Google Gemini 写法差异显著时补一句 Gemini 对照。
- 示例语言 TypeScript，Node ≥ 20；API key 通过 dotenv 读取（如 `OPENAI_API_KEY`），对齐 `tester/` 的实践。
- 相邻主题暂不纳入：Python LangChain 生态、向量数据库运维、前端集成、其他 Agent 框架。

## 工作笔记
- `tester/` 是已有的 LangChain.js + Gemini + LangGraph jest 试验场（pnpm + ts-jest），可作课程示例的技术栈参照，不在其中添加课程文件。
- 用户指定范围时的来源 URL（原为 docs.langchain.com 的 Python 路径，主线已统一换成 JavaScript 等价页，整理进 `RESOURCES.md`）。
