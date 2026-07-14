# 命令

在沙箱中执行 shell 命令。

## Bash

执行 bash 命令并返回输出。

**执行环境与注意事项:**

- 工作目录在多次调用之间保持不变,但优先使用绝对路径——复合命令中的 `cd` 会触发权限提示。
- Shell 状态(环境变量、函数)不持久;每次 shell 从用户 profile 初始化。
- 重要:避免用此工具运行 `cat`、`head`、`tail`、`sed`、`awk`、`echo`,除非已明确指示,或已验证专用工具无法完成该任务;改用专用工具会有更好的体验。
- `timeout` 单位为毫秒:默认 `120000`,最大 `600000`。
- `run_in_background` 会将命令分离运行:它跨多轮持续运行,退出时重新唤起你。无需手动加 `&`。

**Git 用法约定:**

- 交互式 flag(如 `-i`,例如 `git rebase -i`)在本环境中不支持。
- GitHub 操作(PR、issue、API)请使用 `gh` CLI。
- 仅在用户明确要求时才提交或推送;若当前处于默认分支,先开新分支再操作。
- git commit message 结尾追加:`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- PR body 结尾追加:`🤖 Generated with Claude Code`

**参数:**

- `command`(必填):要执行的 bash 命令。
- `description`:对命令所作所为的清晰、简洁描述。
- `timeout`:超时时长(毫秒),默认 `120000`,最大 `600000`。
- `run_in_background`:设为 `true` 时在后台分离运行命令。
- `dangerouslyDisableSandbox`:设为 `true` 时危险地关闭沙箱模式,在非沙箱中执行命令。
