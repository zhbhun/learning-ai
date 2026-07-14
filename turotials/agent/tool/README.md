# Claude Code Agent 工具

agent 在一次会话中可随时调用的工具集合,按类别分目录存放。每个子目录的 README.md 给出该工具的详细描述与参数,目录内还配有实际使用的截图与会话日志。

## 分类索引

### 文件与命令

- [file/](file/README.md) — Read / Write / Edit / NotebookEdit:本地文件的读取、写入与编辑
- [bash/](bash/README.md) — Bash:执行 shell 命令
- [web/](web/README.md) — WebSearch / WebFetch:联网搜索与网页获取

### 任务与监控

- [task/](task/README.md) — TaskCreate / TaskUpdate / TaskList / TaskGet / TaskOutput / TaskStop:结构化任务列表
- [todo/](todo/README.md) — TodoWrite:轻量级会话任务清单
- [monitor/](monitor/README.md) — Monitor:后台监听脚本输出,逐行推送事件

### 计划与编排

- [plan/](plan/README.md) — EnterPlanMode / ExitPlanMode:计划模式的进入与退出
- [agent/](agent/README.md) — Agent / SendMessage:子代理派发与协作通信
- [workflow/](workflow/README.md) — Workflow:用脚本确定性编排多个子代理

### 交互与技能

- [clarify/](clarify/README.md) — AskUserQuestion:在决策点向用户结构化提问
- [notify/](notify/README.md) — PushNotification:主动发送桌面或手机通知
- [skill/](skill/README.md) — Skill:在主对话中调用专业技能

### 调度与 Git

- [cron/](cron/README.md) — CronCreate / CronDelete / CronList / ScheduleWakeup:定时任务与 /loop 唤醒
- [worktree/](worktree/README.md) — EnterWorktree / ExitWorktree:git 工作树的进入与退出

### 扩展与报告

- [mcp/](mcp/README.md) — ListMcpResourcesTool / ReadMcpResourceTool / ReadMcpResourceDirTool:MCP 资源读取,及 MCP 工具集索引
- [design/](design/README.md) — DesignSync:与 Claude Design 项目同步组件库
- [report/](report/README.md) — ReportFindings:上报代码审查发现

## 示例

待补充
