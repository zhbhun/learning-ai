# Claude Agent SDK（TypeScript）

- 1. 上手
  - [1.1 安装与凭证](cheatsheets/install/README.mdx)
    安装 `@anthropic-ai/claude-agent-sdk`，配置 Node、ESM、tsx 与 `ANTHROPIC_API_KEY`，跑通前置环境。
  - [1.2 第一次运行](cheatsheets/first-run/README.mdx)
    用最小 `query()` 脚本驱动一个会改文件的 agent，拿到最终结果。
  - [1.3 消息流](cheatsheets/message-stream/README.mdx)
    认识 SDKMessage 类型体系与 agent loop，从流里提取文本、工具调用与结果。
  - [1.4 多轮对话](cheatsheets/multi-turn/README.mdx)
    用流式输入组织多轮交互，用 resume 与 fork 延续历史会话。
- 2. 配置与控制
  - 2.1 配置体系
    - [2.1.1 Options](cheatsheets/options/README.mdx)
      建立常用配置项地图（cwd、model、allowedTools、maxTurns、env、abortController 等），并划清 SDK 可用的 Claude Code 功能范围。
    - [2.1.2 模型与系统提示词](cheatsheets/model-and-prompt/README.mdx)
      选择模型，用 preset 与追加方式定制 system prompt。
    - [2.1.3 设置来源](cheatsheets/settings-sources/README.mdx)
      理解 settingSources 如何加载 user/project/local 设置与 CLAUDE.md，用 resolveSettings 核对生效配置。
  - 2.2 权限与安全
    - [2.2.1 权限模式](cheatsheets/permission-modes/README.mdx)
      区分 default、acceptEdits、plan、bypassPermissions 四种模式的行为与适用场景。
    - [2.2.2 权限规则与 canUseTool](cheatsheets/permissions/README.mdx)
      用 allow/deny/ask 规则和 canUseTool 回调精细控制每次工具调用。
    - [2.2.3 沙箱](cheatsheets/sandbox/README.mdx)
      配置 bash 与网络沙箱，理解 agent 安全边界与安全部署要求。
  - 2.3 输出控制
    - [2.3.1 流式输出](cheatsheets/streaming-output/README.mdx)
      用 includePartialMessages 拿到增量文本，把输出流接到自己的界面。
    - [2.3.2 结构化输出](cheatsheets/structured-outputs/README.mdx)
      约束最终输出格式，从 result 消息解析可编程的结构。
  - 2.4 Hooks
    - [2.4.1 Hook 事件](cheatsheets/hooks/README.mdx)
      认识 PreToolUse、PostToolUse、Stop 等事件与 hooks 配置结构。
    - [2.4.2 Hook 拦截与自动化](cheatsheets/hook-control/README.mdx)
      在 hook 里拦截、改写和自动决策，辨析 hook 与 canUseTool 的分工。
- 3. 扩展能力
  - 3.1 工具与 MCP
    - [3.1.1 进程内自定义工具](cheatsheets/custom-tools/README.mdx)
      用 tool() 与 createSdkMcpServer() 在同一进程里定义带类型校验的自定义工具。
    - [3.1.2 接入 MCP server](cheatsheets/mcp-integration/README.mdx)
      用 mcpServers 配置接入 stdio/HTTP 外部 server，核对工具命名与连接状态。
    - [3.1.3 自建 MCP server](cheatsheets/mcp-server/README.mdx)
      用官方 TypeScript MCP SDK 编写 stdio 与 Streamable HTTP server 供 agent 调用。
    - [3.1.4 工具搜索](cheatsheets/tool-search/README.mdx)
      工具数量大时启用工具搜索，控制上下文占用与工具选择。
  - 3.2 子代理与扩展
    - [3.2.1 子代理](cheatsheets/subagents/README.mdx)
      用 agents 选项定义子代理，理解主代理与子代理的分工和上下文隔离。
    - [3.2.2 Slash 命令](cheatsheets/slash-commands/README.mdx)
      让 SDK 加载并触发自定义 slash 命令，用 supportedCommands 枚举可用命令。
    - [3.2.3 Agent Skills](cheatsheets/skills/README.mdx)
      编写并加载 SKILL.md 技能，用 reloadSkills 在运行中刷新。
    - [3.2.4 插件](cheatsheets/plugins/README.mdx)
      安装与加载插件，用 reloadPlugins 管理运行中的扩展。
  - 3.3 上下文与文件
    - [3.3.1 附件与用户输入](cheatsheets/user-input/README.mdx)
      传入图片等附件，处理 agent 向用户发起的输入请求。
    - [3.3.2 TODO 跟踪](cheatsheets/todo-tracking/README.mdx)
      读取与维护 agent 的任务清单，展示执行进度。
    - [3.3.3 文件检查点](cheatsheets/file-checkpointing/README.mdx)
      利用文件检查点与 rewindFiles 回滚 agent 改动的文件。
- 4. 生产化
  - 4.1 会话与状态
    - [4.1.1 会话管理](cheatsheets/session-management/README.mdx)
      用 listSessions、getSessionMessages 等接口枚举、读取与管理历史会话。
    - [4.1.2 会话存储](cheatsheets/session-storage/README.mdx)
      理解会话转录的存储位置与格式，支撑持久化与审计。
  - 4.2 可观测与成本
    - [4.2.1 成本与用量](cheatsheets/cost-tracking/README.mdx)
      从 result 与 usage 统计 token、请求与费用，建立用量看板。
    - [4.2.2 可观测性](cheatsheets/observability/README.mdx)
      接入日志与 OpenTelemetry 追踪，定位线上 agent 行为。
  - 4.3 运行与部署
    - [4.3.1 进程与预热](cheatsheets/process-model/README.mdx)
      理解 CLI 子进程模型，用 startup、prewarm 与 warm pool 消除冷启动。
    - [4.3.2 打包与托管](cheatsheets/hosting/README.mdx)
      处理打包限制（不 bundle CLI）、/core 入口与容器化托管。
  - 4.4 健壮性
    - [4.4.1 错误处理与中断](cheatsheets/error-handling/README.mdx)
      用 AbortController、超时与错误类型处理失败、中断与重试。
    - [4.4.2 故障排查](cheatsheets/troubleshooting/README.mdx)
      按官方排查路径定位凭证、进程、工具与配置类故障。
