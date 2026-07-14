# Git 工作树

git worktree 隔离工作区的进入与退出。

## EnterWorktree

创建一个隔离的 git worktree,并将当前会话切换进去。仅在被明确要求在 worktree 中工作时使用,不要主动调用。

**何时使用**

- 用户明确提到 "worktree"(如"开始 / 创建 / 用 worktree")。
- 项目指示(CLAUDE.md / memory)要求在 worktree 中工作。

**何时不用**

- 用户要求建分支、切分支、在不同分支上工作——改用普通 git 命令。
- 修 bug 或做功能走正常 git 流程即可。
- 用户未提 "worktree",且项目指示也没说时,绝不擅自使用。

**前置要求**

- 必须处于 git 仓库内,或已配置 `WorktreeCreate` / `WorktreeRemove` hook。
- 不能已经身处某个 worktree 会话中。

**行为**

- 在 git 仓库内:于 `.claude/worktrees/` 下创建新的 git worktree,并位于一条新分支上。base ref 由 `worktree.baseRef` 设置控制:`fresh`(默认)从 `origin/<默认分支>` 分支;`head` 从当前本地 HEAD 分支。
- 在仓库外:委托给 hook 完成 VCS 无关的隔离。
- 工具会把会话工作目录切换到新 worktree。
- 离开时用 ExitWorktree(保留或移除)。会话退出时若仍身处 worktree,会提示用户选择保留还是移除。

**进入已有 worktree**:传入 `path`(而非 `name`)即可切入一个已存在的 worktree。

**参数**

- `name`:新 worktree 的名字(可选)。省略则自动生成随机名。
- `path`:要进入的已有 worktree 的路径(可选)。

`name` 与 `path` 互斥,二选一。

## ExitWorktree

退出由 EnterWorktree 创建的 worktree 会话,把会话恢复到原工作目录。

**作用范围**

- 仅操作本会话内由 EnterWorktree 创建的 worktree。
- 不碰:你手动用 `git worktree add` 创建的 worktree、往期会话创建的、以及从未调用过 EnterWorktree 的当前所在目录。

**会话外调用为空操作**:工具会报告无活动 worktree 会话,不执行任何动作,文件系统状态保持不变。

**何时使用**

- 仅当用户明确要求(如"退出 worktree" / "离开 worktree" / "回去",或其他结束 worktree 会话的表达)时使用。
- 不要主动调用——只有用户提出时才用。

**参数**

- `action`(必填):`"keep"` 或 `"remove"`。
  - `keep`:保留 worktree 目录与分支于磁盘上。
  - `remove`:删除 worktree 目录及其分支。
- `discard_changes`(默认 `false`,仅 `remove` 时有意义):若 worktree 中存在未提交改动或未合并提交,工具会拒绝移除;除非显式设为 `true` 才会强制移除。此时工具会列出改动,需先确认再以 `discard_changes: true` 重新调用。
