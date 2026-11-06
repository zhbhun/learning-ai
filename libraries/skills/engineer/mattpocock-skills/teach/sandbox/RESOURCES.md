# git rebase（PR 提交整理）Resources

## Knowledge

- [Book: _Pro Git_ — Rewriting History (git-scm.com)](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
  Git 官方免费书的重写历史章节。`git rebase -i` 的 edit / squash / 排序 / 删除提交都有完整 walkthrough。中文版：[重写历史](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E9%87%8D%E5%86%99%E5%8E%86%E5%8F%B2)。Use for: todo 列表命令的权威语义、改动历史的官方姿势。
- [Article: "git rebase: what can go wrong?" — Julia Evans (jvns.ca, 2023)](https://jvns.ca/blog/2023/11/06/rebasing-what-can-go-wrong-/)
  调研了 rebase 在实践中出过的所有问题：undo 靠 reflog、别 rebase 已推送/共享的分支、一次 rebase 只做一件事、force push 用 `--force-with-lease`。文末"my personal rebase rules"是安全规则的最佳浓缩。Use for: 安全规则、错误恢复、第一课之后的进阶警示。
- [Reference: git-rebase 官方手册 (git-scm.com/docs)](https://git-scm.com/docs/git-rebase)
  命令级权威：todo 命令全表（pick/reword/edit/squash/fixup/drop/reorder）、`--abort`、`--continue`、`--autosquash`、`-x`。Use for: 查 flag 语义，不用于通读。
- [Zine/Article: Oh Shit, Git?!?! (ohshitgit.com)](https://ohshitgit.com/)
  按事故查急救命令：错 commit 了、rebase 到一半想退出、force push 把同事提交顶掉了。中文版：[我操，Git！](https://ohshitgit.com/zh)。Use for: 事故恢复速查，和 reflog 课程搭配。

## Wisdom (Communities)

- [r/git](https://www.reddit.com/r/git/)
  Git 专版，工作流与事故讨论多。Use for: rebase 相关问题按真实场景求助。
- [GitLab Forum — Git category](https://forum.gitlab.com/c/git/9)
  团队工作流（受保护分支、force push 策略）讨论集中地。Use for: 公司 PR 流程相关的问题。
- Stack Overflow `git-rebase` 标签（问答型，无需加入）：具体报错直接搜。

## Gaps

- 暂缺一份可视化讲解 reflog / rebase 内部机制的高质量中文资源；后续课程若需要再补。
