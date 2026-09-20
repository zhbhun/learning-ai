# Mastra

- 1. 起步
  - [1.1 Mastra 是什么](cheatsheets/what-is-mastra/README.mdx)
    框架定位、整体架构与核心概念地图，建立后续课程的全局框架。
  - [1.2 安装与项目结构](cheatsheets/installation/README.mdx)
    用 create-mastra 或手动安装搭建项目，认识目录约定、mastra dev 与面向 AI 编码助手的 Build with AI 支持。
  - [1.3 模型接入](cheatsheets/model-access/README.mdx)
    provider/model 字符串、模型提供商与环境变量，以及 Mastra 模型网关的配置与自定义。
  - [1.4 第一个 Agent](cheatsheets/first-agent/README.mdx)
    定义 Agent 的 instructions（系统提示词）与 model，用 generate / stream 跑通第一次对话。
  - [1.5 工具](cheatsheets/tools/README.mdx)
    用 createTool 定义带 schema 的工具，配置 beforeToolCall / afterToolCall 调用钩子、toolChoice 与 activeTools，使用内置搜索与抓取工具。
  - [1.6 结构化输出](cheatsheets/structured-output/README.mdx)
    用 structuredOutput 与 schema 让 Agent 返回类型安全的结果，处理解析失败策略。
  - [1.7 用 Studio 调试](cheatsheets/studio/README.mdx)
    用 mastra dev 启动 Studio，在本地界面测试 Agent、工具与工作流并查看调用详情。
  - [1.8 存储与持久化](cheatsheets/storage/README.mdx)
    存储层的 9 个数据域、按域路由的复合存储与后端选型，是工作流与记忆的前置。

- 2. Agent 进阶
  - [2.1 Agent 执行机制](cheatsheets/agent-lifecycle/README.mdx)
    Agent 从请求到响应的完整执行生命周期：准备、循环、收尾、中止控制与各层回调钩子的触发时机。
  - [2.2 工具审批与挂起](cheatsheets/human-in-the-loop/README.mdx)
    Agent 级人工介入：工具预执行审批、工具内挂起与重启后恢复。
  - [2.3 流式输出](cheatsheets/streaming/README.mdx)
    stream 的事件流结构、工具与步骤的自定义事件，以及向 AI SDK 格式的转换。
  - [2.4 输入输出处理器](cheatsheets/processors/README.mdx)
    处理器管道机制：input / output / error 三类处理器，processInput、processOutputStream 等钩子与内置处理器。
  - [2.5 安全防护](cheatsheets/guardrails/README.mdx)
    用内置防护处理器实现 guardrails：注入检测、审核、PII 与系统提示词防泄漏。
  - [2.6 代码模式](cheatsheets/code-mode/README.mdx)
    让 Agent 在沙箱中写 TypeScript 编排多工具调用，减少往返与 token 消耗。
  - [2.7 上下文工程](cheatsheets/context-engineering/README.mdx)
    控制模型每轮看到什么：静态与动态 instructions、工具、记忆、信号与裁剪手段的组合取舍。

- 3. 工作流
  - 3.1 编排基础
    - [3.1.1 工作流基础](cheatsheets/workflow-basics/README.mdx)
      用 createWorkflow / createStep 组建步骤链，理解变量映射、结果状态与运行方式。
    - [3.1.2 控制流](cheatsheets/workflow-control-flow/README.mdx)
      顺序、并行、条件分支、循环与数据映射等流程控制原语。
    - [3.1.3 工作流中的 Agent 与工具](cheatsheets/agents-and-tools-in-workflows/README.mdx)
      用 .agent() / .tool() 把 Agent 与工具接入步骤，组合确定性编排与 LLM 推理。
    - [3.1.4 Agent 还是工作流](cheatsheets/agent-or-workflow/README.mdx)
      判断任务交给 Agent 自主推理还是用工作流确定性编排。
  - 3.2 状态与恢复
    - [3.2.1 挂起与恢复](cheatsheets/suspend-and-resume/README.mdx)
      用 suspend / resume 暂停和恢复执行，定位挂起步骤并从存储恢复。
    - [3.2.2 人工介入](cheatsheets/workflow-human-in-the-loop/README.mdx)
      人工审批与人工输入场景：suspend 载荷、resume 提交决策与 bail 提前退出。
    - [3.2.3 共享状态](cheatsheets/workflow-state/README.mdx)
      用 state 与 stateSchema 在步骤间共享数据，理解状态与步骤输入输出的区别。
    - [3.2.4 快照与时间旅行](cheatsheets/snapshots-and-time-travel/README.mdx)
      快照的持久化机制与 timeTravel 从任意步骤重跑的调试用法。
    - [3.2.5 错误处理](cheatsheets/workflow-error-handling/README.mdx)
      重试配置、错误回调与 bail 语义，让流程失败可控。
  - 3.3 运行方式
    - [3.3.1 定时触发](cheatsheets/scheduled-workflows/README.mdx)
      用 cron 配置定时触发工作流，管理暂停、恢复与触发历史。
    - [3.3.2 动态工作流](cheatsheets/dynamic-workflows/README.mdx)
      用 JSON 在运行时注册工作流，支持用户或 Agent 动态生成编排。

- 4. 记忆
  - [4.1 记忆基础与线程](cheatsheets/memory-basics/README.mdx)
    接入 Memory，理解 resource / thread 双标识、消息历史与多用户共享线程。
  - [4.2 工作记忆](cheatsheets/working-memory/README.mdx)
    模板与 schema 两种工作记忆，跨线程记住关键事实。
  - [4.3 语义召回](cheatsheets/semantic-recall/README.mdx)
    向量召回历史对话的三组件配置与元数据过滤。
  - [4.4 观察式记忆](cheatsheets/observational-memory/README.mdx)
    Observer / Reflector 把对话压缩为观察日志的机制与 token 预算。
  - [4.5 记忆处理器](cheatsheets/memory-processors/README.mdx)
    三个内置记忆处理器的工作方式、执行顺序与自定义扩展。

- 5. RAG
  - [5.1 RAG 流水线](cheatsheets/rag-pipeline/README.mdx)
    切块、嵌入、入库、检索的端到端流程骨架。
  - [5.2 切块与嵌入](cheatsheets/chunking-and-embedding/README.mdx)
    MDocument 的九种切块策略与嵌入模型选择。
  - [5.3 检索与重排](cheatsheets/retrieval-and-rerank/README.mdx)
    向量查询、元数据过滤、检索工具封装与相关性重排。
  - [5.4 GraphRAG](cheatsheets/graph-rag/README.mdx)
    以文档块建图结合随机游走检索，处理跨文档关联问题。

- 6. 扩展能力
  - 6.1 工具与互联
    - [6.1.1 MCP](cheatsheets/mcp/README.mdx)
      连接外部 MCP 服务器获取工具，或把 Mastra 能力暴露为 MCP 服务。
    - [6.1.2 子代理与监督者](cheatsheets/subagents/README.mdx)
      用子代理与 supervisor 模式组织多 Agent 协作，配置 onDelegationStart 等委派钩子与审批冒泡。
    - [6.1.3 A2A 与 ACP](cheatsheets/connections/README.mdx)
      跨服务远程代理（A2A）、外部编码代理进程（ACP）与厂商 SDK Agent 的接入。
  - 6.2 运行环境
    - [6.2.1 Sandbox 与文件系统](cheatsheets/sandbox/README.mdx)
      给 Agent 提供隔离执行环境：本地与远程沙箱、文件挂载与命令工具。
    - [6.2.2 沙箱搜索与 LSP](cheatsheets/sandbox-search/README.mdx)
      为工作区建立关键词与向量索引，接入语言服务器提供符号级理解。
    - [6.2.3 桌面沙箱](cheatsheets/sandbox-computer/README.mdx)
      让 Agent 用截图、鼠标和键盘操控完整桌面环境。
    - [6.2.4 Skills 技能包](cheatsheets/skills/README.mdx)
      用 createSkill 与 SKILL.md 目录定义可复用任务指令，配合工作区自动发现。
  - 6.3 对外通道
    - [6.3.1 浏览器自动化](cheatsheets/browser/README.mdx)
      用 AgentBrowser、Stagehand 等 provider 让 Agent 操控浏览器。
    - [6.3.2 Channels 消息渠道](cheatsheets/channels/README.mdx)
      用 adapter 把 Agent 接入 Slack、Teams、Discord、Telegram 等消息平台。
    - [6.3.3 语音](cheatsheets/voice/README.mdx)
      为 Agent 接入语音转文字、文字转语音与语音到语音能力。

- 7. 长时运行
  - [7.1 Durable Agents 与后台任务](cheatsheets/durable-agents/README.mdx)
    把 Agent 循环跑进持久化运行时，慢工具异步执行，支持断线重连与恢复。
  - [7.2 调度与信号](cheatsheets/signals-schedules/README.mdx)
    定时触发 Agent、向运行中线程投递消息与信号，接入外部事件源。
  - [7.3 目标与 Agent Controller](cheatsheets/agent-controller/README.mdx)
    线程级持久目标驱动多轮执行，用 Controller 宿主多会话交互式应用。

- 8. 生产化
  - 8.1 服务与接入
    - [8.1.1 Mastra Server 与 API 路由](cheatsheets/server-api/README.mdx)
      内置 HTTP 服务器、自定义 API 路由与 OpenAPI 文档。
    - [8.1.2 中间件与请求上下文](cheatsheets/middleware/README.mdx)
      用中间件与 RequestContext 实现用户隔离、请求级数据注入与动态 instructions。
    - [8.1.3 服务器适配器](cheatsheets/server-adapters/README.mdx)
      在 Express、Fastify、Next.js 等框架中托管 Mastra 服务，或自写适配器。
    - [8.1.4 Mastra Client SDK](cheatsheets/client-sdk/README.mdx)
      用 client-js 从浏览器或其他服务调用 Mastra 服务端能力。
  - 8.2 认证与授权
    - [8.2.1 认证基础](cheatsheets/auth-basics/README.mdx)
      Simple Auth 与 JWT 保护 API 和 Studio，配置公开与受保护路径。
    - [8.2.2 组合认证与细粒度授权](cheatsheets/auth-advanced/README.mdx)
      多认证提供者组合、Clerk / WorkOS 等第三方接入与 FGA 资源级授权。
  - 8.3 可观测性
    - [8.3.1 追踪 Tracing](cheatsheets/tracing/README.mdx)
      span 与 trace 结构、采样策略、导出器与敏感信息过滤。
    - [8.3.2 日志、指标与反馈](cheatsheets/logging-metrics/README.mdx)
      结构化日志、从 span 自动提取的指标与人工反馈关联。
  - 8.4 质量运营
    - [8.4.1 提示词管理与 Editor](cheatsheets/prompt-editor/README.mdx)
      用 Studio Editor 版本化管理 Agent 系统提示词：草稿发布、prompt blocks 与灰度。
    - [8.4.2 评估基础与 Scorer](cheatsheets/evals-basics/README.mdx)
      内置与自定义 scorer 给输出打分，实时评估挂载与采样。
    - [8.4.3 数据集与实验](cheatsheets/evals-datasets/README.mdx)
      用数据集与实验批量评估，gates 与 verdicts 判定通过与否。
    - [8.4.4 集成测试与 CI](cheatsheets/evals-ci/README.mdx)
      零 LLM 的 quick checks、Vitest 集成与 CI 中跑评估断言。
    - [8.4.5 多轮与会话评估](cheatsheets/evals-multi-turn/README.mdx)
      评估多轮对话与带记忆的 Agent。
  - 8.5 部署
    - [8.5.1 部署概览与自托管](cheatsheets/deployment/README.mdx)
      mastra build 产物、自托管服务器运行与优雅关闭。
    - [8.5.2 云平台部署](cheatsheets/cloud-deployment/README.mdx)
      Vercel、Cloudflare、AWS 等平台部署，monorepo 与 Web 框架集成场景。
    - [8.5.3 运行器、Workers 与 PubSub](cheatsheets/workflow-runners/README.mdx)
      Inngest / Temporal 工作流运行器、后台 worker 进程与分布式事件总线。
  - 8.6 Mastra Platform
    - [8.6.1 Platform 入门](cheatsheets/mastra-platform/README.mdx)
      托管平台的三大产品、mastra deploy 部署流程与环境管理。
    - [8.6.2 平台观测与运维](cheatsheets/platform-ops/README.mdx)
      Trace Intelligence、告警、托管数据库与平台 API 配置。

- 9. 实战
  - [9.1 Web 框架集成](cheatsheets/web-frameworks/README.mdx)
    在 Next.js、Hono、Express、Astro 等框架中集成 Mastra 的要点与差异。
  - [9.2 前端接入与聊天 UI](cheatsheets/chat-ui/README.mdx)
    用 AI SDK 转换与 assistant-ui、CopilotKit 等组件搭建对话界面。
  - [9.3 文件式 Agent 与项目组织](cheatsheets/file-based-agents/README.mdx)
    用目录约定与 config.ts 组织 Agent，管理真实项目的结构。
  - [9.4 完整示例项目](cheatsheets/capstone/README.mdx)
    综合运用 Agent、工作流、记忆与 RAG 构建一个完整应用。
