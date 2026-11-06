# Teaching Notes — git rebase

## 用户偏好
- 课程产出用中文（用户以中文交流）。
- 用户是开发者（仓库里有大量编程项目），但对 rebase 属于"用过 git、没系统学过 rebase"的状态——第一课从零建立心智模型。
- Mission 已由用户一次说清，无需再访谈：目标是"提给团队的 PR 历史干净可读"，教学时每个练习都要挂在这个目标上。

## 教学决策
- 练习一律在 `practice-repo/` 沙箱仓库里做，绝不碰 learning/ai 这个真实仓库本身（它有自己的历史）。
- 第一课故意避开 `rebase main` 和冲突——按 Julia Evans 的"two kinds of rebase"区分，type 1（整理祖先提交）几乎不出冲突，适合建立信心；type 2 留到后续课程。
- 课后必带"安全出口"：`git rebase --abort` + `git reflog`，用户随时能自救，才敢放手试。
