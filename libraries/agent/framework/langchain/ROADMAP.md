# LangChain（TypeScript）

- 1. 入门上手
  - [1.1 安装](cheatsheets/installation/README.mdx)
    npm 包结构（langchain、@langchain/core、@langchain/langgraph）与 create-langchain 脚手架，跑通最小工程。
  - [1.2 第一个 Agent](cheatsheets/first-agent/README.mdx)
    用 createAgent 组装模型、系统提示与工具，invoke 与 stream 跑通第一个能查天气的 Agent。
  - [1.3 模型与消息](cheatsheets/models-and-messages/README.mdx)
    ChatOpenAI 配置项与消息类型（Human/AI/System/Tool），多模态输入和提供方差异对照。
  - [1.4 流式输出](cheatsheets/streaming/README.mdx)
    stream 与 streamEvents 两级流式 API，token 级增量与事件流的消费方式。
  - [1.5 结构化输出](cheatsheets/structured-output/README.mdx)
    用 zod schema 约束输出、withStructuredOutput 的用法与校验失败处理。

- 2. Agent 构建
  - [2.1 工具](cheatsheets/tools/README.mdx)
    tool() 加 zod 定义工具、模型绑定与完整调用链路、工具错误处理。
  - [2.2 中间件](cheatsheets/middleware/README.mdx)
    中间件模型与执行顺序、预置中间件、自定义拦截的编写。
  - [2.3 短期记忆](cheatsheets/short-term-memory/README.mdx)
    thread 级消息历史的存储、裁剪与 summary 策略。
  - [2.4 人机协同](cheatsheets/human-in-the-loop/README.mdx)
    工具调用前的 interrupt 审批模式、恢复执行与拒绝分支。
  - [2.5 护栏](cheatsheets/guardrails/README.mdx)
    输入输出校验、注入防护与预置护栏中间件的取舍。
  - [2.6 MCP 接入](cheatsheets/mcp/README.mdx)
    用 MCPAdapter 连接 MCP server，把外部工具挂进 Agent。

- 3. LangGraph 图编排
  - [3.1 LangGraph 思维模型](cheatsheets/langgraph-thinking/README.mdx)
    workflow 与 agent 的分界、Graph API / Functional API / createAgent 的选型判断。
  - [3.2 Graph API](cheatsheets/graph-api/README.mdx)
    StateGraph 状态定义、节点、边与条件路由，compile 成可执行图。
  - [3.3 Functional API](cheatsheets/functional-api/README.mdx)
    entrypoint 与 task 函数式编排，与 Graph API 的互转场景。
  - [3.4 持久化](cheatsheets/persistence/README.mdx)
    checkpointer 与 thread_id 机制，从 MemorySaver 切换到生产存储。
  - [3.5 中断与时间旅行](cheatsheets/interrupts-time-travel/README.mdx)
    interrupt 暂停与恢复、历史快照回放与分叉重跑。
  - [3.6 子图](cheatsheets/subgraphs/README.mdx)
    子图封装、状态映射与父子图通信。
  - [3.7 图级流式](cheatsheets/graph-streaming/README.mdx)
    图执行的多通道流式（updates/values/messages）与自定义事件。

- 4. 记忆与检索
  - [4.1 长期记忆与 Store](cheatsheets/long-term-memory/README.mdx)
    跨 thread 的 Store 读写、命名空间设计与记忆注入系统提示。
  - [4.2 嵌入与向量库](cheatsheets/embeddings-vector-stores/README.mdx)
    OpenAIEmbeddings、向量库写入与相似度检索。
  - [4.3 文档加载与切分](cheatsheets/document-processing/README.mdx)
    DocumentLoader、TextSplitter 与切分参数的取舍。
  - [4.4 RAG](cheatsheets/rag/README.mdx)
    检索增强问答的最小闭环：检索、注入上下文、带引用回答。
  - [4.5 Agentic RAG](cheatsheets/agentic-rag/README.mdx)
    把检索做成工具，由 Agent 决定何时检索、如何重写查询。

- 5. 多智能体与 Deep Agents
  - 5.1 多智能体
    - [5.1.1 概览与路由](cheatsheets/multi-agent-overview/README.mdx)
      多智能体架构选型与 supervisor / router 分发模式。
    - [5.1.2 子代理](cheatsheets/subagents/README.mdx)
      task 工具委派子代理、上下文隔离与结果汇总。
    - [5.1.3 移交](cheatsheets/handoffs/README.mdx)
      handoff 在代理间转移控制权与共享状态。
    - [5.1.4 技能](cheatsheets/skills/README.mdx)
      SKILL.md 渐进式能力披露的组织方式与加载机制。
  - 5.2 Deep Agents
    - [5.2.1 上手](cheatsheets/deep-agents-quickstart/README.mdx)
      deepAgents() harness、虚拟文件系统与内置工具的最小示例。
    - [5.2.2 核心能力](cheatsheets/deep-agents-capabilities/README.mdx)
      子代理、技能、记忆与上下文工程的组合用法。
    - [5.2.3 生产化](cheatsheets/deep-agents-production/README.mdx)
      backends、权限、沙箱与容错的生产配置。
    - [5.2.4 Managed Deep Agents](cheatsheets/managed-deep-agents/README.mdx)
      LangSmith 托管运行：项目结构、部署与渠道接入。
  - [5.3 OpenWiki](cheatsheets/openwiki/README.mdx)
    用 OpenWiki 为代码库生成可维护的 Markdown 知识库并接入 CI 自动更新。

- 6. 观测、测试与部署
  - [6.1 LangSmith 追踪](cheatsheets/langsmith-observability/README.mdx)
    平台开通、tracing 接入与 trace、token 成本分析。
  - [6.2 测试](cheatsheets/testing/README.mdx)
    单元测试与集成测试：mock 模型、固定工具与断言策略。
  - [6.3 Agent 评估](cheatsheets/agent-evals/README.mdx)
    评估数据集、LLM-as-judge 与回归评估。
  - [6.4 部署](cheatsheets/deployment/README.mdx)
    LangGraph Server 与 Studio 调试、上线前检查清单。
