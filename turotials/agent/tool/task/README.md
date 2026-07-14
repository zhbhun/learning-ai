# 任务

结构化任务列表的创建、更新与查询。

## TaskCreate

为当前编码会话创建结构化任务列表,帮助你跟踪进度、组织复杂任务,并向用户展示计划。

**何时使用**:

- 复杂的多步骤任务(≥3 个不同步骤)
- 非平凡的复杂任务
- 处于计划模式中
- 用户明确要求时

**使用方式**: 在开始任务前立即捕获需求;随工作展开迭代更新。每收到新需求就新增任务;开始任务前标记为 in_progress;完成后标记为 completed,并补充新发现的任务。

**何时不使用**: 单一直接任务、琐碎任务、纯对话或信息查询。

**任务字段**: subject、description、activeForm。所有任务以 pending 状态创建。

**使用技巧**: subject 要清晰具体;创建后用 TaskUpdate 设置依赖;创建前先调用 TaskList 避免重复。

**参数**: subject(必填)、description、activeForm。

## TaskUpdate

更新任务列表中的任务。

**标记完成**: 任务完成时标记;不再需要或被取代时同样标记。始终在工作完成后更新状态,标记后再调用 TaskList 找下一个任务。仅在完全完成时才标 completed——遇错、阻塞或无法完成则保持 in_progress;受阻时创建一个描述待解决项的新任务;测试失败、部分实现、未解错误或找不到文件等情况都应保持 in_progress,而非 completed。

**删除**: 设 status 为 "deleted" 永久移除任务。

**更新细节**: 需求变化或建立依赖时使用。

**可更新字段**: status(取值 pending → in_progress → completed / deleted)、subject、description、activeForm、owner、meta(合并式更新,设为 null 即删除该键)、addBlocks、addBlockedBy。

**新鲜度**: 更新前用 TaskGet 读取最新状态,避免覆盖。

**参数**: taskId(必填)、subject、description、activeForm、status、owner、meta。

## TaskList

列出任务列表中的所有任务。用于查看有哪些可做(pending、无 owner、未阻塞)、了解整体进度,以及找出被阻塞的任务。建议优先按 ID 顺序工作。

**参数**: 无。

## TaskGet

按 ID 从任务列表检索单个任务。需要完整描述和上下文时(例如开始任务前),或要理解依赖关系时使用。TaskList 用于查看全部,TaskGet 用于查看单个任务。

**输出字段**: subject、description、status、blocks(等待本任务的任务)、blockedBy(必须先完成的任务)、activeForm。空任务仓库中 blocks / blockedBy 为空。

**参数**: taskId(必填)。

## TaskOutput

[已弃用] 后台任务会在工具结果中返回输出文件路径,任务完成时你会收到带有相同路径的 <task-notification>。

- **bash 任务**: 优先对该输出文件使用 Read 工具,其中包含 stdout/stderr。
- **local_agent 任务**: 使用 Agent 工具的结果。不要 Read .output 文件——它是完整 transcript 的符号链接,会撑爆上下文。
- **remote_agent 任务**: 优先 Read 输出文件路径,其中包含流式远程会话输出。

检索运行中或已完成任务的输出(后台 shell、agent 或远程会话)。block=true(默认)会等待任务完成;block=false 为非阻塞查询当前状态。

**参数**: task_id(必填)、block(默认 true)、timeout(默认 30000,最大 600000)。

## TaskStop

按 ID 停止正在运行的后台任务。停止 agent-team 队友时传其 agent ID(格式 "name@team")或裸队友名;停止有命名的后台 agent 时传其名字。返回成功或失败状态。

**参数**: task_id(必填)、shell_id(已弃用,请改用 task_id)。
