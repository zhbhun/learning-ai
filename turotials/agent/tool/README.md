## Claude Code

- 文件
  - Read — 读文件(支持图片、PDF、Jupyter notebook)
  - Write — 创建/覆写文件
  - Edit — 精确字符串替换(需先 read)
  - NotebookEdit — 编辑 .ipynb 单元格

- 命令
  - Bash — 执行 shell 命令(支持后台运行)

- 网络
  - WebFetch - 获取网页内容
  - WebSearch — 网络搜索

- MCP
  - ListMcpResourcesTool - 列出 MCP 资源
  - ReadMcpResourceTool - 读取 MCP 资源
  - ReadMcpResourceDirTool - 读取 MCP 资源目录

- 技能
  - Skill — 调用已安装的 skill

- 任务
  - TaskCreate — 创建任务
  - TaskUpdate — 更新任务
  - TaskList — 任务列表
  - TaskGet — 任务详情
  - TaskOutput — 读取后台任务输出
  - TaskStop — 停止后台任务
  - Monitor - 后台流式监控日志/事件

- 计划
  - EnterPlanMode — 进入计划模式
  - ExitPlanMode — 退出计划模式

- 子代理
  - Agent — 派发子代理(Explore / Plan / general-purpose 等)
  - SendMessage — 与运行中的代理通信
  - Workflow — 多代理确定性编排脚本

- 交互
  - AskUserQuestion — 结构化提问(选项)
  - PushNotification — 桌面/手机推送

- 调度
  - CronCreate — 创建定时任务
  - CronDelete — 删除定时任务
  - CronList — 定时任务列表
  - ScheduleWakeup — /loop 模式下的自定步调唤醒

- Git
  - EnterWorktree — 进入 git worktree
  - ExitWorktree — 退出 git worktree

- 其他
  - DesignSync — 与 claude.ai design-system 项目同步组件库
