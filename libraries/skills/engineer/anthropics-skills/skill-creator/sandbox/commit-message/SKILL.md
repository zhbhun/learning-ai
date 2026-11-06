---
name: commit-message
description: 根据 git 暂存区的 diff 生成符合 Conventional Commits 规范的 commit message。只要用户想写 commit message、提交代码、或提到 "commit"、"提交"、"commit message"、"提交信息"——即使没有明说"规范"二字——都应该使用本技能。
---

# Commit Message

为当前暂存区（staged）的改动生成一条 Conventional Commits 规范的 commit message。

核心原则：commit message 描述的是**这次改动为什么存在、做了什么**，而不是把 diff 逐行翻译一遍。读 diff 是为了理解意图，写出来的话要让半年后的同事（包括你自己）不看代码也能明白这次提交的目的。

## 工作流程

### 1. 确认暂存区里有东西

先运行：

```bash
git diff --staged --stat
```

- 如果输出为空，说明暂存区没有内容。此时检查 `git status`：如果有未暂存的改动，告诉用户"暂存区是空的，有 X 个文件的改动还没 stage"，让用户先 stage，**不要**擅自基于未暂存的改动生成 message——那描述的不是将要提交的内容。
- 如果整个工作区都是干净的，直接告诉用户没有可提交的改动，结束。

### 2. 对齐仓库已有的风格

提交信息要融入仓库的历史，而不是自成一体。先看一眼最近的提交：

```bash
git log --oneline -15
```

关注两点：这个仓库常用哪些 type（有的仓库从不用 `chore`）；subject 是英文还是中文。跟随仓库既有惯例，规范结构和既有惯例冲突时，结构（type/scope 格式）保留，语言跟随仓库。

### 3. 读 diff，理解意图

```bash
git diff --staged
```

diff 很大时（比如超过几百行或涉及十几个文件），先用 `--stat` 建立全局认识，再按文件分批读，避免被细节淹没。读的时候问自己：这些改动合起来是在**做一件什么事**？一件事就是一条 commit——如果暂存区混了多件不相关的事，指出来并建议用户拆开分别提交（每个拆分方案配上对应的 message）。

判断意图的一些线索：

- 新文件 + 对应的引用处改动 → 通常是 `feat` 或 `feat` 的一部分
- 只删代码、没加新行为 → 往往是 `refactor` 或 `chore`
- 测试文件 + 修了一行实现 → 大概率是 `fix`（测试是证明）
- README/注释/文档 → `docs`

拿不准时选更能反映用户视角意图的那个，并可在 body 里一句话说明为什么。

### 4. 确定类型和 scope

| type | 用在什么时候 |
|------|------------|
| `feat` | 新功能、新能力（对用户可见的新行为） |
| `fix` | 修复 bug（行为错了，现在对了） |
| `docs` | 只改文档（README、注释、wiki） |
| `style` | 不影响代码含义的改动（格式、空格、分号） |
| `refactor` | 既不是新增功能也不是修 bug 的代码改动 |
| `perf` | 以性能为目标的改动 |
| `test` | 补测试或改测试 |
| `build` | 影响构建系统或外部依赖（npm、pip、Makefile） |
| `ci` | 改 CI 配置（GitHub Actions 等） |
| `chore` | 其他不动 src 或测试的杂务 |
| `revert` | 回滚之前的提交 |

scope 是改动聚焦的模块/目录名，从改动文件的路径推断（如 `libraries/agent/` 下的改动 → `agent`）。改动跨越多个模块、没有明显焦点时，省略 scope，不要硬编一个。

### 5. 写 message

**Subject 行**：

- 格式：`type(scope): 祈使句描述`
- 用祈使语气——检验方法是它应该能填进 "If applied, this commit will **___**"："fix login timeout" 通顺，"fixed login timeout" 不通顺
- 结尾不加句号，开头不大写（英文时），中文描述则正常书写
- 控制在 50 字符左右、最多不超过 72——这是 `git log --oneline` 不被截断的实用边界
- 写**变化本身**，不写"修改了xx文件"这类废话：diff 本身就说明改了哪些文件

**Body（可选）**：subject 讲不清"为什么"的时候才写，比如修 bug 的根因、方案取舍。空一行后开始，每行不超过 72 字符。能不写就不写——好的 subject 大多数时候就够了。

**Breaking change**：API 或行为发生不兼容变化时，type 后加 `!`（如 `feat!:`），并在 footer 写 `BREAKING CHANGE: <说明及迁移方法>`。让依赖方在升级前能看到这一点，是这条规则的唯一目的。

**示例**：

```
输入 diff：新增 useAuth hook，登录页改用它，package.json 加了依赖
输出：
feat(auth): extract useAuth hook from login page
```

```
输入 diff：删除 retry 函数的 setTimeout 轮询，改用事件监听
输出：
refactor(retry): replace polling with event listener
```

```
输入 diff：token 过期时间判断写成了 <，应为 <=
输出：
fix(auth): use <= for token expiry comparison

Tokens expiring exactly at the boundary were rejected one tick early.
```

### 6. 输出

- 把最终 message 放在一个代码块里，方便直接复制。
- 默认只输出 message，**不要主动执行 `git commit`**——用户要的是 message 本身。只有用户明确说"帮我提交"时才提交。
- 如果对意图有推测成分（比如 diff 看不出为什么改），输出后用一句话说明你的假设，方便用户纠正。

## 规范速查（Conventional Commits 1.0.0）

```
<type>[可选 scope][!]: <描述>

[可选 body]

[可选 footer]
```

完整规范见 https://www.conventionalcommits.org/zh-hans/v1.0.0/ ——本技能已覆盖日常所需的全部规则，通常不需要再去查。
