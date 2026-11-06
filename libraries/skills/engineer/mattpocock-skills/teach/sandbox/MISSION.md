# Mission: 用 git rebase 整理 PR 提交历史

## Why
用户提给团队的 PR 里经常积累凌乱的提交（"wip"、"fix typo"、重复修改），想让 PR 历史干净可读。掌握 rebase 的三种核心整理动作——squash（合并提交）、reword（改 message）、调整顺序——之后，提交给同事审阅的 PR 就是清晰的故事，而不是一堆碎 commit。

## Success looks like
- 能独立完成一次 `git rebase -i`：把 PR 里的碎提交 squash 成一个、改一个 message、调换两个提交的顺序，并安全 force-push 更新 PR
- 出问题时能自救：用 `git rebase --abort` 中止、用 `git reflog` 找回"消失"的提交
- 知道哪类提交绝对不能 rebase（已推到 main / 别人也在用的分支），并能解释为什么

## Constraints
- 教学工作区建在 `/Users/zhanghuabin/Projects/learning/ai`（用户指定当前目录）
- 课程产出为中文
- 练习全部在本地仓库沙箱里做，不碰用户的真实项目仓库

## Out of scope
- `git rebase main`（分支间 rebase、解决冲突）——第二阶段之后再说，先把"整理自己的提交"练熟
- rebase vs merge 的工作流之争
- GitHub 的 "Squash and merge" 按钮工作流
- `git cherry-pick`、filter-branch、filter-repo 等周边工具
