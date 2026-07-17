# LLM 能力测试问题集

- [FastChat / MT-Bench](https://github.com/lm-sys/FastChat/tree/main/fastchat/llm_judge) - Chatbot Arena 团队发布的多轮开放问答评测，包含 80 个高质量问题及 LLM-as-a-Judge 评测脚本，被许多模型与社区评测采用。
- [LLM evaluation datasets](https://huggingface.co/collections/clefourrier/llm-evaluation-datasets) - Hugging Face 上的 LLM 评测数据集合集，覆盖推理、问答、数学、代码和语言理解等任务。
- [LLM evals and benchmark datasets](https://huggingface.co/collections/davidberenstein1957/llm-evals-and-benchmark-datasets) - Hugging Face 社区整理的 LLM eval 与 benchmark 数据集集合。
- [Awesome LLM Eval](https://github.com/onejune2018/awesome-llm-eval) - 汇总 LLM 评测工具、数据集、基准、排行榜、论文和文档的资源列表。
- [Arena-Hard-Auto](https://github.com/lmarena/arena-hard-auto) - 从真实 Chatbot Arena 查询中筛选高难度开放问题，使用自动评审近似人类偏好评测。
- [LiveBench](https://github.com/LiveBench/LiveBench) - 持续更新、强调降低数据污染并使用客观答案自动评分的综合基准。
- [BIG-bench](https://github.com/google/BIG-bench) - Google 发起的协作式大模型能力基准，收录大量不同能力维度的任务。
- [OpenAI Evals](https://github.com/openai/evals) - OpenAI 开源的 LLM 评测框架与评测注册表，可运行现有 eval 或构建自定义测试。
- [LM Evaluation Harness](https://github.com/EleutherAI/lm-evaluation-harness) - EleutherAI 的统一评测框架，支持大量标准任务、模型后端与 few-shot 配置。
- [HELM](https://github.com/stanford-crfm/helm) - Stanford CRFM 的整体化评测框架，强调全面、可复现和透明的模型比较。
- [LightEval](https://github.com/huggingface/lighteval) - Hugging Face 的多后端 LLM 评测工具，可统一运行标准任务和自定义任务。
- [OpenCompass](https://github.com/open-compass/opencompass) - 支持多种模型、数据集和主客观评测方式的一站式大模型评测平台。
- [LLM Evaluation Guidebook](https://github.com/huggingface/evaluation-guidebook) - Hugging Face 整理的 LLM 评测实践与方法指南，适合设计和审查自定义评测。
- [VLMEvalKit](https://github.com/open-compass/VLMEvalKit) - 面向视觉语言模型的开源评测工具，覆盖多模态问答、OCR、图表和专业视觉基准。

## 推理

### Web of Lies（真假话）

```md
有 A、B、C、D 四个人，每个人要么始终说真话，要么始终说假话。他们分别说：

- A：“B 和 C 都在说假话。”
- B：“A 和 D 中恰好一人说真话。”
- C：“B 说真话。”
- D：“C 说假话。”

判断 A、B、C、D 各自说真话还是假话。请给出简要推理，并在最后一行严格按 `A=<真或假>, B=<真或假>, C=<真或假>, D=<真或假>` 的格式作答。
```

- 来源/资源：代表性测试题，能力维度参考 [LiveBench Web of Lies](https://github.com/LiveBench/LiveBench) 和 [BIG-Bench](https://github.com/google/BIG-bench)。
- 参考答案：`A=真, B=假, C=假, D=真`。A 的陈述成立；B 所说的“A、D 恰好一真”不成立；C 对 B 的判断不成立；D 对 C 的判断成立。

### Tracking Shuffled Objects（追踪交换物体）

```md
桌上有 5 个不透明盒子，编号为 1～5。初始时，红球、蓝球、绿球、黄球、白球依次位于盒子 1、2、3、4、5 中。随后按顺序执行：

1. 交换盒子 1 和盒子 4 中的球；
2. 交换此刻装有红球和绿球的两个盒子中的球；
3. 交换盒子 2 和盒子 5 中的球；
4. 交换此刻装有白球的盒子与盒子 3 中的球。

最终每个盒子里分别是什么颜色的球？只输出一个按盒子 1～5 排列的颜色列表。
```

- 来源/资源：代表性测试题，能力维度参考 [BIG-Bench Hard](https://github.com/suzgunmirac/BIG-Bench-Hard) 的 Tracking Shuffled Objects 任务。
- 参考答案：按盒子 1～5 排列为 `[黄球, 红球, 白球, 绿球, 蓝球]`。

### Date Understanding（日期理解）

```md
已知 2024 年 2 月 28 日是星期三。一次会议原定在“下个月的同一日”举行，之后又推迟了 3 周零 2 天。

请计算会议最终举行的公历日期和星期几。说明闰年、跨月和星期推算过程，最后严格按 `YYYY-MM-DD，星期X` 的格式作答。
```

- 来源/资源：代表性测试题，能力维度参考 [BIG-Bench Hard](https://github.com/suzgunmirac/BIG-Bench-Hard) 的 Date Understanding 任务。
- 参考答案：`2024-04-20，星期六`。2024-03-28 是星期四，再推迟 23 天即为星期六。

### Strawberry（字母计数）

```md
单词 `strawberry` 中，英文字母 `r` 一共出现几次？

请逐字符检查，但最终只输出一个阿拉伯数字，不要输出解释或其他文字。
```

- 来源/资源：经典社区测试题，用于检查模型是否真正执行字符级计数；相关操作见 [Python `str.count` 文档](https://docs.python.org/3/library/stdtypes.html#str.count)。
- 参考答案：`3`。

### Alice 有 3 个兄弟

```md
Alice 和她的所有兄弟姐妹拥有相同的父母。Alice 有 3 个兄弟，每个兄弟都恰好有 2 个姐妹。

Alice 有几个姐妹？只输出一个整数。
```

- 来源/资源：经典社区逻辑题，能力维度参考 [BIG-Bench Hard](https://github.com/suzgunmirac/BIG-Bench-Hard) 的 Logical Deduction 任务。
- 参考答案：`1`。每个兄弟的两个姐妹是 Alice 和另一名女孩，因此 Alice 自己只有一位姐妹。

### Sudoku（数独）

```md
解出下面的 9×9 数独。`0` 表示空格；每行、每列和每个 3×3 宫都必须包含数字 1～9 且不重复。

530070000
600195000
098000060
800060003
400803001
700020006
060000280
000419005
000080079

只输出解答后的 9 行数字，每行 9 位，不要添加空格、代码块或解释。
```

- 来源/资源：经典数独测试题；规则与求解方法参考 Peter Norvig 的 [Solving Every Sudoku Puzzle](https://norvig.com/sudoku.html)。
- 参考答案：

```text
534678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
```

### River Crossing（过河问题）

```md
农夫要把狼、山羊和卷心菜运到河对岸。船每次必须由农夫驾驶，且除农夫外最多只能再载一样东西。如果农夫不在场，狼会吃掉山羊，山羊会吃掉卷心菜。

请给出不发生任何损失的最短过河方案。按时间顺序列出每次单程渡河，并给出总渡河次数。
```

- 来源/资源：经典 [Wolf, goat and cabbage problem](https://en.wikipedia.org/wiki/Wolf,_goat_and_cabbage_problem)。
- 参考答案：共 `7` 次：带山羊过河；独自返回；带狼过河；带山羊返回；带卷心菜过河；独自返回；最后带山羊过河。

### Zebra Puzzle（斑马谜题）

```md
从左到右有 4 栋房子，编号 1～4。Alice、Bob、Carol、David 各住一栋；四栋房子的颜色分别为红、蓝、绿、黄；饮品分别为茶、咖啡、牛奶、水；宠物分别为猫、狗、斑马、鸟。每个属性都只出现一次。

线索：

1. Alice 住在 1 号房。
2. Bob 紧挨在 Alice 右边。
3. Carol 紧挨在 David 左边。
4. Bob 住蓝房子。
5. Carol 住绿房子。
6. 绿房子紧挨在黄房子左边。
7. Alice 住红房子并喝茶。
8. 蓝房子的住户喝咖啡。
9. 绿房子的住户喝牛奶。
10. 喝牛奶的人养斑马。
11. David 养鸟。
12. 养狗的人紧挨在养猫的人右边。

谁养斑马？请先给出住户姓名，再列出 1～4 号房的完整属性表。
```

- 来源/资源：自拟 Zebra Puzzle 风格测试题，能力维度参考 [BIG-Bench Extra Hard](https://github.com/google-deepmind/bbeh) 的 Zebra Puzzles。
- 参考答案：`Carol` 养斑马。完整排列为：1 号 Alice／红／茶／猫；2 号 Bob／蓝／咖啡／狗；3 号 Carol／绿／牛奶／斑马；4 号 David／黄／水／鸟。

## 数学

### AIME 风格整数题

```md
求满足 `1 ≤ n ≤ 2025` 且 `gcd(n, 2025) = 45` 的正整数 n 的个数。

请给出必要推导。最终答案必须是一个 000～999 的三位字符串；不足三位时在左侧补 0。
```

- 来源/资源：代表性测试题，题型参考 [MAA Invitational Competitions（AIME）](https://maa.org/maa-invitational-competitions/)；也可使用 [LiveBench Math](https://github.com/LiveBench/LiveBench) 获取动态数学评测题。
- 参考答案：`024`。令 `n = 45k`，则 `1 ≤ k ≤ 45` 且 `gcd(k, 45) = 1`，所以共有 `φ(45) = 45 × (1 - 1/3) × (1 - 1/5) = 24` 个。

### AMC 12 风格选择题

```md
从整数 1～100 中等概率随机选取一个数。该数能被 4 或 6 整除、但不能同时被二者整除的概率是多少？

(A) 1/5
(B) 1/4
(C) 3/10
(D) 1/3
(E) 2/5

请给出推导，并在最后一行只写选项字母。
```

- 来源/资源：代表性测试题，题型参考 [MAA American Mathematics Competitions（AMC 12）](https://maa.org/student-programs/amc/)。
- 参考答案：`B`。恰好满足一个整除条件的整数有 `25 + 16 - 2 × 8 = 25` 个，概率为 `25/100 = 1/4`。

### IMO / USAMO 风格证明题

```md
证明：从集合 `{1, 2, ..., 2n}` 中任取 `n + 1` 个不同的整数，其中必有两个数满足一个整除另一个。

要求给出适用于任意正整数 n 的完整证明；必须明确构造分类方式，并解释抽屉原理为什么适用，不能只写结论。
```

- 来源/资源：代表性证明题；更多正式题目见 [IMO Problems](https://www.imo-official.org/problems/) 和 [MAA Invitational Competitions（USAMO/USAJMO）](https://maa.org/maa-invitational-competitions/)。
- 参考答案：把每个被选整数唯一写成 `2^k × m`，其中 `m` 为奇数。集合 `{1, ..., 2n}` 中只有 `n` 种可能的奇数部分 `m`；选出 `n + 1` 个数后，至少两个数有相同的 `m`。这两个数形如 `2^a m` 与 `2^b m`，较小者整除较大者。

## 算法

### HumanEval 风格函数补全

```md
补全下面的 Python 函数：

`def first_missing_positive(nums: list[int]) -> int:`

返回数组中缺失的最小正整数。要求时间复杂度为 O(n)、额外空间复杂度为 O(1)，不得调用 `sort` 或 `sorted`，允许原地修改输入。

示例：
- `[1, 2, 0] -> 3`
- `[3, 4, -1, 1] -> 2`
- `[7, 8, 9, 11, 12] -> 1`

只返回完整函数实现，不要添加测试框架或第三方依赖。
```

- 来源/资源：代表性测试题，格式参考 OpenAI [HumanEval](https://github.com/openai/human-eval)。
- 参考解法：

```python
def first_missing_positive(nums: list[int]) -> int:
    n = len(nums)
    for i in range(n):
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            target = nums[i] - 1
            nums[i], nums[target] = nums[target], nums[i]

    for i, value in enumerate(nums):
        if value != i + 1:
            return i + 1
    return n + 1
```

### MBPP 风格 Python 小程序

```md
编写 Python 函数 `group_anagrams(words)`，把由小写英文字母组成的单词按“字母异位词”分组。

要求：
- 每组内部保持单词在输入中的相对顺序；
- 各组按其第一个单词在输入中出现的顺序排列；
- 空列表返回空列表；
- 不使用第三方库。

以下断言必须通过：
- `group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]`
- `group_anagrams([]) == []`
- `group_anagrams(["a"]) == [["a"]]`

请返回函数实现并简要说明复杂度。
```

- 来源/资源：代表性测试题，格式参考 Google Research [Mostly Basic Python Problems（MBPP）](https://github.com/google-research/google-research/tree/master/mbpp)。
- 参考解法：

```python
def group_anagrams(words):
    groups = {}
    for word in words:
        key = "".join(sorted(word))
        groups.setdefault(key, []).append(word)
    return list(groups.values())
```

### LiveCodeBench 风格竞赛题

```md
给定长度为 n 的整数数组 a（元素可为负数）和整数 K，求元素和至少为 K 的最短非空连续子数组长度；如果不存在，输出 -1。

输入格式：
- 第一行：`n K`
- 第二行：`a1 a2 ... an`

约束：`1 ≤ n ≤ 200000`，`-10^9 ≤ ai ≤ 10^9`，`1 ≤ K ≤ 10^18`。

示例输入：
`5 6`
`2 -1 2 3 1`

示例输出：
`3`

请使用 Python 3 编写可从标准输入读取、向标准输出写入的完整程序。算法应在 O(n) 时间内完成，并说明为什么单纯的滑动窗口在存在负数时不成立。
```

- 来源/资源：代表性测试题，能力维度参考 [LiveCodeBench](https://github.com/LiveCodeBench/LiveCodeBench)。
- 参考解法：使用前缀和与单调递增双端队列，整体复杂度为 O(n)。

```python
import sys
from collections import deque


def main() -> None:
    data = list(map(int, sys.stdin.buffer.read().split()))
    n, k = data[0], data[1]
    array = data[2:]

    answer = n + 1
    prefix = 0
    candidates = deque([(0, 0)])  # (index, prefix_sum)

    for index, value in enumerate(array, 1):
        prefix += value

        while candidates and prefix - candidates[0][1] >= k:
            start, _ = candidates.popleft()
            answer = min(answer, index - start)

        while candidates and candidates[-1][1] >= prefix:
            candidates.pop()

        candidates.append((index, prefix))

    print(answer if answer <= n else -1)


if __name__ == "__main__":
    main()
```

### Tower of Hanoi（汉诺塔）

```md
有 4 个大小不同的圆盘，开始时按从小到大顺序叠放在柱 A 上。需要借助柱 B 将所有圆盘移动到柱 C，并遵守：一次只能移动一个圆盘，且任何时刻大圆盘都不能放在小圆盘上。

请回答最少需要多少步，并实现 Python 函数 `hanoi(n, source, auxiliary, target)`，返回按顺序排列的移动列表；每次移动表示为 `(起点柱, 终点柱)`。不得硬编码 n=4 的结果。
```

- 来源/资源：经典递归与状态规划问题，参见 [Tower of Hanoi](https://en.wikipedia.org/wiki/Tower_of_Hanoi)。
- 参考答案：4 个圆盘最少需要 `2^4 - 1 = 15` 步。
- 参考解法：

```python
def hanoi(n, source, auxiliary, target):
    if n == 0:
        return []
    return (
        hanoi(n - 1, source, target, auxiliary)
        + [(source, target)]
        + hanoi(n - 1, auxiliary, source, target)
    )
```

### Conway's Game of Life（康威生命游戏）

```md
实现 Python 函数 `next_generation(board: list[str]) -> list[str]`，计算康威生命游戏的下一代。`1` 表示活细胞，`0` 表示死细胞；有限网格以外均视为死细胞。

规则：

- 活细胞周围有 2 或 3 个活邻居时存活，否则死亡；
- 死细胞周围恰有 3 个活邻居时复活。

输入：

00000
00100
00100
00100
00000

请给出下一代网格，并返回通用函数实现。不得只针对示例硬编码。
```

- 来源/资源：经典细胞自动机；规则与图样参考 [LifeWiki](https://conwaylife.com/wiki/)。
- 参考答案：下一代为水平的 Blinker：

```text
00000
00000
01110
00000
00000
```

- 参考解法：

```python
def next_generation(board: list[str]) -> list[str]:
    rows, cols = len(board), len(board[0])
    result = []

    for row in range(rows):
        next_row = []
        for col in range(cols):
            neighbors = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        neighbors += board[nr][nc] == "1"

            alive = board[row][col] == "1"
            next_row.append("1" if neighbors == 3 or alive and neighbors == 2 else "0")
        result.append("".join(next_row))

    return result
```

### LeetCode Hard（Edit Distance）

```md
实现 Python 函数 `min_distance(word1: str, word2: str) -> int`，返回把 `word1` 转换成 `word2` 所需的最少操作次数。每次操作只能插入一个字符、删除一个字符或替换一个字符。

示例：

- `min_distance("horse", "ros") == 3`
- `min_distance("intention", "execution") == 5`

要求时间复杂度为 O(mn)；空间复杂度不超过 O(min(m, n))。只返回函数实现，不使用第三方库。
```

- 来源/资源：题意经简化改写，原题见 LeetCode Hard [Edit Distance](https://leetcode.com/problems/edit-distance/)。
- 参考解法：

```python
def min_distance(word1: str, word2: str) -> int:
    if len(word1) < len(word2):
        word1, word2 = word2, word1

    previous = list(range(len(word2) + 1))
    for i, char1 in enumerate(word1, 1):
        current = [i]
        for j, char2 in enumerate(word2, 1):
            if char1 == char2:
                current.append(previous[j - 1])
            else:
                current.append(1 + min(previous[j], current[j - 1], previous[j - 1]))
        previous = current

    return previous[-1]
```

### Advent of Code 风格双阶段谜题

```md
雪橇配送员从坐标 `(0, 0)` 出发，读取一串移动指令：`^`、`v`、`<`、`>` 分别表示向上、下、左、右移动一格。起点也算访问过。

给定指令：`^>v<^^>>vv<<`

- Part 1：一名配送员执行全部指令，访问过多少个不同坐标？
- Part 2：两名配送员都从原点出发，按字符位置交替执行指令；两人合计访问过多少个不同坐标？

请给出 Part 1 和 Part 2 的答案，并编写能处理任意指令字符串的 Python 程序。程序最后输出两个整数，每行一个。
```

- 来源/资源：自拟双阶段编程谜题，形式参考 [Advent of Code](https://adventofcode.com/2024/about)；未复制官方题面或个人输入。
- 参考答案：Part 1 为 `9`，Part 2 为 `4`。

## 工程

### 修复真实 GitHub Issue

```md
代码仓库位于 `<代码仓库路径>`，待修复问题如下：

<GitHub Issue 标题与正文>

请先阅读仓库贡献指南并复现问题，再定位根因、实现最小修复并补充回归测试。运行与改动相关的测试套件，报告修改的文件、根因、验证命令和结果。不要绕过测试、吞掉异常或改变无关的公共 API。
```

- 来源/资源：任务模板，参考 [SWE-bench](https://github.com/SWE-bench/SWE-bench) 的真实仓库 Issue 修复任务。

### 根据 PR 需求修改多个文件

```md
请在 `<代码仓库路径>` 中实现以下 PR 需求：

<PR 描述、验收条件与兼容性要求>

开始前先梳理受影响的公共接口、实现、测试和文档。完成跨文件修改后，补充或更新测试，并检查所有调用点是否保持一致。最终给出文件级变更摘要、兼容性说明以及实际运行过的验证命令和结果。
```

- 来源/资源：任务模板，能力维度参考 [SWE-bench](https://github.com/SWE-bench/SWE-bench) 的仓库级补丁任务。

### 运行测试直到全部通过

```md
代码仓库位于 `<代码仓库路径>`。当前测试命令 `<测试命令>` 存在失败。

请实际运行测试，逐个分析失败原因并修复产品代码或确有错误的测试。每次修改后运行最小相关测试，最后运行完整测试套件。不得删除、跳过或弱化测试，也不得用硬编码只满足当前样例。最终报告首次失败、根因、修复内容以及完整测试结果。
```

- 来源/资源：任务模板，参考 [SWE-bench](https://github.com/SWE-bench/SWE-bench) 的可执行测试评测方式。

## 前端

### TodoMVC

```md
使用 React、TypeScript 和 CSS 实现一个符合 TodoMVC 行为规范的待办应用。

必须支持新增、编辑、删除、完成/取消完成、全选/取消全选、All/Active/Completed 路由筛选、清除已完成项和本地持久化。刷新页面后状态应保留；空白输入不得创建待办；编辑时 Enter 保存、Escape 取消、失焦保存。补充覆盖核心交互的自动化测试，并确保键盘操作和表单标签具备基本可访问性。

交付可运行源码、启动命令和测试命令。
```

- 来源/资源：任务规范与参考实现见 [TodoMVC](https://todomvc.com/) 和 [TodoMVC App Spec](https://github.com/tastejs/todomvc/blob/master/app-spec.md)。

### RealWorld App（Conduit）

```md
在 `<代码仓库路径>` 中按照 RealWorld/Conduit 规范实现完整前端，技术栈使用 `<指定前端框架>`。

必须覆盖注册、登录、JWT 会话、个人资料、关注、文章列表与分页、标签筛选、文章创建/编辑/删除、收藏以及评论。严格遵循官方 API 契约，统一处理加载、空状态和错误状态，并为鉴权、文章和评论主流程添加端到端测试。不要自行增加后端未定义的字段。

交付实现、运行说明、测试结果以及尚未覆盖的规范项；若全部覆盖则明确写“无”。
```

- 来源/资源：[RealWorld 官方仓库与规范](https://github.com/realworld-apps/realworld)。

### Web-Bench Project（Dashboard）

```md
在现有 React + TypeScript 项目中实现一个响应式分析 Dashboard：

1. 左侧导航可折叠，移动端改为抽屉；
2. 顶部提供日期范围和项目筛选器；
3. 主区包含 4 张指标卡、趋势折线图、渠道占比图和可排序/分页的数据表；
4. 筛选条件必须同步影响所有图表和表格；
5. 数据请求需呈现 loading、empty、error 和 retry 状态；
6. URL 查询参数保存筛选与分页状态，刷新后可恢复；
7. 添加关键交互测试，并满足键盘导航和颜色对比度要求。

优先复用仓库已有组件与依赖。完成后提供启动、测试和构建结果。
```

- 来源/资源：代表性项目任务，能力维度参考论文 [Web-Bench: A LLM Code Benchmark Based on Web Standards and Frameworks](https://arxiv.org/abs/2505.07473)。

### Landing Page（Goldie Bench One-shot）

```md
Landing Page — modern marketing landing page (one-shot).
```

- 来源/资源：原始提示词与各模型的单次生成结果见 [Goldie Bench: Landing](https://goldiebench.com/tasks/landing)；该测试要求所有模型使用同一条提示词并输出单个 HTML 文件，按能否运行、是否符合需求和视觉质量评分；开放式实现，无固定答案。

### SVG 绘图

```md
只输出一个可独立保存为 `.svg` 并在浏览器打开的 SVG 文档，不要使用 Markdown 代码块或外部图片。

画布使用 `viewBox="0 0 320 180"`，并包含：

1. 覆盖整个画布的 `#f8fafc` 背景；
2. 位于 `(20, 20)`、尺寸 `280×140`、圆角 `16` 的白色卡片，描边为 `#cbd5e1`；
3. 圆心 `(80, 90)`、半径 `32`、填充 `#2563eb` 的圆；
4. 圆心处水平与垂直居中的白色文字 `AI`；
5. 从 `(130, 90)` 指向 `(240, 90)` 的深色箭头，箭头必须使用 `<marker>` 定义。

所有元素必须位于 SVG 根节点内，并声明正确的 XML 命名空间。
```

- 来源/资源：代表性 SVG 生成测试题；语法参考 [MDN SVG Tutorials](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials)。
- 参考解法：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
    </marker>
  </defs>
  <rect width="320" height="180" fill="#f8fafc" />
  <rect x="20" y="20" width="280" height="140" rx="16"
        fill="#ffffff" stroke="#cbd5e1" />
  <circle cx="80" cy="90" r="32" fill="#2563eb" />
  <text x="80" y="90" fill="#ffffff" font-family="sans-serif" font-size="20"
        font-weight="700" text-anchor="middle" dominant-baseline="middle">AI</text>
  <line x1="130" y1="90" x2="240" y2="90" stroke="#0f172a"
        stroke-width="4" marker-end="url(#arrow)" />
</svg>
```

## 编辑器

### 无限画布（Infinite Canvas）

```md
使用 React、TypeScript 和 Canvas 或 SVG 实现一个无限画布编辑器。

要求支持以鼠标位置为中心缩放、拖拽平移、网格背景、创建矩形与文本卡片、单选与框选、多选移动、缩放和旋转；实现吸附与对齐参考线、复制粘贴、删除、撤销重做以及本地持久化。屏幕坐标与世界坐标的转换必须准确，缩放后拖拽和命中测试不得产生偏移。

画布包含至少 5,000 个元素时仍应保持可操作，可使用视口裁剪或分层渲染优化。补充坐标转换、选择、历史记录和序列化的自动化测试，并交付运行与测试命令。
```

- 来源/资源：开放式实现题，无固定答案；参考 [tldraw](https://github.com/tldraw/tldraw) 的无限画布编辑器与 SDK。

### 时间轴（Timeline）

```md
使用 React、TypeScript 和 Canvas 或 SVG 实现一个视频或动画时间轴编辑器。

时间轴必须包含自适应刻度尺、播放头和至少 3 条轨道；片段具有开始时间、结束时间和持续时长。支持横向平移与缩放、点击或拖拽定位播放头、移动片段、拖动两端裁剪、多选、删除、轨道间移动、吸附到播放头或其他片段边界，以及撤销重做。明确同一轨道片段重叠时的处理规则，并保证播放状态与播放头同步。

支持 JSON 导入导出；补充时间与像素坐标转换、裁剪边界、吸附和历史记录的自动化测试。交付可运行源码、数据格式说明和测试命令。
```

- 来源/资源：开放式实现题，无固定答案；交互可参考 [vis-timeline](https://github.com/visjs/vis-timeline) 的时间范围、缩放与项目编辑能力。

### 节点编辑器（Node Editor）

```md
使用 React 和 TypeScript 实现一个可执行工作流的节点编辑器。

提供输入、处理和输出三类节点，每个节点具有带类型的输入与输出端口。支持添加、拖拽、连线、断开、框选、多选移动、复制、删除、缩放和平移，并提供网格吸附、小地图、属性检查器和撤销重做。创建连线时必须校验端口方向与数据类型，拒绝重复边和会形成环的连接，并给出可理解的错误提示。

按照拓扑顺序执行无环工作流，在节点上展示等待、运行、成功或失败状态；支持 JSON 导入导出。补充连线校验、环检测、拓扑排序、序列化和历史记录测试，并交付运行方式。
```

- 来源/资源：开放式实现题，无固定答案；参考 [React Flow / xyflow](https://github.com/xyflow/xyflow) 与 [React Flow 文档](https://reactflow.dev/)。

### 3D 场景编辑器（Scene Editor）

```md
使用 Three.js 和 TypeScript 实现一个轻量级 3D 场景编辑器。

界面包含场景层级树、3D 视口和属性检查器。支持添加立方体、球体、灯光和相机；可通过层级树或 Raycaster 选择对象，并使用 TransformControls 完成平移、旋转和缩放。提供局部/世界坐标切换、数值吸附、OrbitControls 视角导航、重命名、复制、删除以及基于命令栈的撤销重做。

支持场景 JSON 导入导出，恢复父子层级、变换和材质；窗口变化时正确更新视口，并在删除对象或卸载编辑器时释放 GPU 与事件资源。补充命令撤销重做和序列化往返测试，交付可运行工程及操作说明。
```

- 来源/资源：开放式实现题，无固定答案；参考 [three.js Editor](https://threejs.org/editor/index.html) 与 [three.js Scene 文档](https://threejs.org/docs/pages/Scene.html)。

## 游戏

### Flappy Bird

```md
一次性生成一个可玩的 Flappy Bird 风格网页游戏。只输出一个完整的 `index.html`，将 HTML、CSS 和 JavaScript 全部写在文件内；不得依赖构建工具、外部库、网络请求或外部图片、字体和音频，保存后直接用浏览器打开即可运行。

使用 Canvas 绘制原创角色和场景。点击、空格键或触摸使角色向上振翅，角色持续受重力影响；管道从右向左移动，间隙高度随机但必须始终可通过。角色穿过一对管道后只加 1 分，碰到管道、地面或画布上边界立即结束。实现开始、游戏中、暂停和结束状态，支持重新开始，并用 `localStorage` 保存最高分。

运动必须基于时间增量而不是固定帧数；适配不同窗口尺寸和高像素密度屏幕，避免重复动画循环、重复计分和重新开始后残留旧障碍。界面显示当前分数、最高分和操作说明。
```

- 来源/资源：代表性 one-shot 游戏生成题，玩法参考 [Flappy Bird](https://en.wikipedia.org/wiki/Flappy_Bird)，绘制方式参考 [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)；开放式实现，无固定答案。

### 2048

```md
一次性生成一个完整可玩的 2048 网页游戏。只输出一个自包含的 `index.html`，不得使用外部库、构建工具、网络资源或外部素材，保存后直接在浏览器打开即可运行。

实现标准 4×4 棋盘，支持方向键、WASD 和移动端滑动操作。每次操作须先把数字向目标方向压紧，再让相邻且相同的方块合并；一次移动中每个方块最多参与一次合并。只有棋盘实际发生变化时才在空位随机生成一个新方块，数值为 2 或 4。正确累计合并得分，出现 2048 时允许选择继续游戏；棋盘填满且四个方向都无法移动时才判定结束。

提供新游戏、撤销上一次有效移动、当前分数和历史最高分；使用 `localStorage` 恢复棋盘、分数与最高分。加入移动与合并动画，但动画不得改变逻辑结果或阻塞快速连续输入。布局需响应式，并保证触摸滑动不会带动页面滚动。
```

- 来源/资源：代表性 one-shot 游戏生成题，规则与参考实现见 Gabriele Cirulli 的 [2048 官方仓库](https://github.com/gabrielecirulli/2048)；开放式实现，无固定答案。

### 俄罗斯方块（Tetris）

```md
一次性生成一个完整可玩的俄罗斯方块网页游戏。只输出一个自包含的 `index.html`，使用 Canvas 和原生 JavaScript，不得依赖构建工具、外部库、网络请求或外部素材。

游戏区域为 10×20 个可见格，包含 I、J、L、O、S、T、Z 七种方块，并使用 7-bag 随机器。支持左右移动、顺/逆时针旋转、软降、硬降、暂停和重新开始；实现合理的墙踢、落地锁定延迟、幽灵方块、至少 3 个后续方块预览，以及每个落下方块只能使用一次的 Hold。方块不得穿过边界或已锁定方块。

消除完整行并按一次消除的行数计分；累计消除行数后提升等级和下落速度。方块生成位置已被占用时游戏结束。使用基于时间的主循环，正确处理暂停恢复，保存最高分，并兼容键盘和移动端触控按钮。所有图形必须原创绘制，不复制商业游戏素材。
```

- 来源/资源：代表性 one-shot 游戏生成题，现代规则参考 [Tetris Guideline](https://tetris.wiki/Tetris_Guideline) 与 [Tetris 官方网站](https://www.tetris.com/)；开放式实现，无固定答案。

### 红白机的坦克大战（Battle City）

```
一次性生成一个复刻红白机《坦克大战》的网页游戏。
```

```md
一次性生成一个受红白机《坦克大战》启发的俯视角网页游戏。只输出一个自包含的 `index.html`，使用 Canvas 和原生 JavaScript；不得使用构建工具、外部库、网络资源或原作图片、音效与关卡素材，所有视觉元素须用原创几何图形绘制。

实现至少一关：玩家坦克可向四个方向移动和射击；地图包含可被子弹破坏的砖墙、不可破坏的钢墙、阻挡坦克的水域、只遮挡视线的草地以及必须保护的基地。敌方坦克从地图顶部多个出生点分批出现，能绕开障碍、向玩家或基地移动并间歇射击；同屏敌人数量和全关总数必须有限且在界面中显示。

子弹应与墙体、坦克、基地和其他子弹正确碰撞，不得因速度较高穿透目标。玩家被击中会损失生命并在安全位置重生；生命耗尽或基地被毁时失败，消灭全部敌人时过关。提供开始、暂停、重新开始、分数、剩余生命和操作说明，同时支持键盘与移动端触控。游戏循环必须基于时间增量，并避免重开后残留计时器、子弹或敌人。
```

- 来源/资源：代表性 one-shot 游戏生成题，核心玩法参考 Namco 的 [Battle City](https://en.wikipedia.org/wiki/Battle_City)，技术实现参考 [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)；开放式实现，无固定答案。

### 旋转六边形中的弹跳小球（Spinning Hexagon）

```md
使用原生 JavaScript 和 Canvas 编写一个程序，显示一个黄色小球在缓慢旋转的正六边形内部弹跳。小球必须受重力和摩擦影响，并从旋转的墙壁上真实反弹。

要求：

- 六边形以恒定角速度绕中心旋转，动画和物理更新基于实际时间增量，不依赖固定帧率；
- 小球具有半径、质量、速度、恢复系数和摩擦系数，重力始终指向屏幕下方；
- 每一帧都根据六边形当前的旋转角计算六条边，正确处理圆与线段以及顶点附近的碰撞；
- 碰撞响应必须考虑接触点处旋转墙面的瞬时速度，以小球相对墙面的速度计算法向反弹和切向摩擦；
- 碰撞后修正穿透，必要时使用子步进，确保小球高速运动、撞击顶点或长时间运行后仍完整留在六边形内；
- 绘制小球轨迹或速度向量，并在画面中显示 FPS、六边形角速度和小球速度；
- 支持空格暂停/继续、`R` 重置，不得使用 Matter.js、Planck.js 等物理引擎或其他外部库。

只输出一个自包含的 `index.html`，将 HTML、CSS 和 JavaScript 全部写在文件内，不得使用构建工具或网络资源；保存后直接用浏览器打开即可运行。不得用仅反转 `x` 或 `y` 速度的方式伪造任意角度墙面的碰撞。
```

- 来源/资源：2025 年网络流行的 “ball in rotating shape” 非正式 LLM 测试，背景与原始短提示词见 [TechCrunch 报道](https://techcrunch.com/2025/01/24/people-are-benchmarking-ai-by-having-it-make-balls-bounce-in-rotating-shapes/)；在线模型对比见 [Artificial Analysis MicroEval](https://artificialanalysis.ai/microevals/balls-bouncing-inside-a-spinning-hexagon-1750176234580)，20 球七边形扩展见 [KCORES LLM Arena](https://github.com/KCORES/kcores-llm-arena/tree/main/benchmark-ball-bouncing-inside-spinning-heptagon)；开放式实现，无固定答案。

### 仓库番（Sokoban，经典推箱子游戏）

```md
请参照 1982 年经典益智游戏《仓库番》（日文原名：倉庫番，英文名：Sokoban，中文常称“推箱子”），使用 JavaScript 复刻一个可以在浏览器中游玩的版本，要求至少设计10关，难度从困难开始每关逐渐变难，并且每关要提供答案按钮（点击后，支持一步步点击解题）。
```

- 来源/资源：规则依据 [Sokoban 官方规则](https://www.sokoban.jp/rule.html)；关卡数据、难度分组与可解性参考 DeepMind 的 [Boxoban Levels](https://github.com/google-deepmind/boxoban-levels) 和 [Jumanji Sokoban 环境](https://instadeepai.github.io/jumanji/environments/sokoban/)；开放式实现，无固定答案。

## Three.js / 3D

### Solar System（太阳系层级动画）

```md
使用 Three.js 创建可交互的太阳系页面，包含太阳以及水星、金星、地球、火星和木星。

要求行星围绕太阳公转、围绕自身自转，并以数据表统一配置相对半径、轨道半径和周期；地球需包含沿地球局部坐标运行的月球。使用 OrbitControls 支持旋转、缩放和平移，点击行星显示名称与数据，窗口变化时正确更新相机和渲染器。不得为每颗行星复制一套独立动画逻辑。

交付可直接运行的网页工程和启动说明。
```

- 来源/资源：代表性测试题，参考 [three.js 官方示例](https://threejs.org/examples/) 与场景图用法。

### GLTFLoader + OrbitControls

```md
使用 Three.js 的 `GLTFLoader` 加载 `<GLB/GLTF 模型 URL>`，并使用 `OrbitControls` 构建模型查看器。

要求显示加载进度与失败状态；加载后根据模型包围盒自动居中并调整相机，使不同尺寸模型都完整可见；支持旋转、缩放、阻尼和重置视角；正确处理模型动画、色彩空间、阴影、窗口缩放和 GPU 资源释放。不要假设模型根节点只有一层。

交付完整实现与运行方式。
```

- 来源/资源：[GLTFLoader 文档](https://threejs.org/docs/pages/GLTFLoader.html)、[OrbitControls 文档](https://threejs.org/docs/pages/OrbitControls.html) 和 [glTF 加载手册](https://threejs.org/manual/en/load-gltf.html)。

### Picking（Raycaster 点击选中模型）

```md
在 Three.js 场景中放置至少 20 个可区分的网格对象，实现基于 `Raycaster` 的鼠标与触摸拾取。

点击对象后高亮其完整业务对象而不是随机子网格，并在侧栏显示名称、世界坐标和材质信息；点击空白处取消选中。画布可以不占满窗口，页面滚动或设备像素比变化后拾取仍须准确。选中高亮不得永久修改共享材质，也不得造成材质泄漏。

交付实现、运行说明和拾取坐标换算说明。
```

- 来源/资源：[three.js Raycaster 文档](https://threejs.org/docs/pages/Raycaster.html) 和 [官方示例](https://threejs.org/examples/)。

## WebGL 图形

### Shadow Mapping

```md
使用原生 WebGL2 实现带方向光阴影的 3D 场景，场景至少包含地面、立方体和球体。

必须实现从光源视角生成深度贴图、从相机视角进行阴影比较的两遍渲染；加入可调 depth bias 和 3×3 PCF 软化，以减轻 shadow acne 与锯齿；提供调试开关显示深度贴图，并正确处理 framebuffer 完整性、纹理尺寸和视口切换。

不得使用 Three.js、Babylon.js 等渲染引擎。交付单页实现和关键矩阵说明。
```

- 来源/资源：代表性测试题，参考 [WebGL Fundamentals: WebGL Shadows](https://webglfundamentals.org/webgl/lessons/webgl-shadows.html)。

### Deferred Rendering

```md
使用原生 WebGL2 实现延迟渲染示例：几何阶段把世界或视图空间位置、法线、反照率和材质参数写入 G-buffer，光照阶段用全屏 pass 计算至少 100 个动态点光源。

要求正确创建并检查多渲染目标 framebuffer，处理深度测试与窗口缩放；可视化各个 G-buffer attachment；限制点光源有效半径以避免无意义计算；说明透明物体为何需要单独的前向渲染 pass。页面需显示实时 FPS 和 draw call 数量。
```

- 来源/资源：代表性测试题，原理参考 [LearnOpenGL: Deferred Shading](https://learnopengl.com/Advanced-Lighting/Deferred-Shading)；实现目标为 WebGL2。

### PBR Rendering

```md
使用原生 WebGL2 实现 glTF 2.0 metallic-roughness 工作流的 PBR 材质查看器。

至少实现 base color、metallic、roughness、normal map、occlusion 和 emissive；采用 Cook-Torrance BRDF（GGX 法线分布、Smith 几何项、Schlick Fresnel），支持基于图像的环境光照、sRGB/线性空间转换、HDR tone mapping 和 gamma 输出。提供材质参数网格，直观看出金属度与粗糙度变化。

请说明各纹理通道和颜色空间假设，并交付可运行示例。
```

- 来源/资源：[Khronos glTF Sample Viewer](https://github.com/KhronosGroup/glTF-Sample-Viewer) 与 [glTF 2.0 规范](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)。

## Agent

### 浏览 GitHub 找 Bug 并修复

```md
你可以使用终端、搜索和代码编辑工具。代码仓库位于 `<代码仓库路径>`，目标 Issue 为 `<Issue URL 或正文>`。

自主浏览仓库，阅读适用的贡献规范，复现 Issue，定位根因并完成最小修复。补充能在修复前失败、修复后通过的回归测试；运行相关测试和仓库要求的静态检查。遇到不确定信息时先从仓库证据中验证，不要猜测 API。最终提交补丁摘要、证据和验证结果，但不要擅自推送或创建 PR。
```

- 来源/资源：任务模板，参考 [SWE-agent](https://github.com/SWE-agent/SWE-agent) 与 [SWE-bench](https://github.com/SWE-bench/SWE-bench)。

### 浏览器自动完成购物流程

```md
在已启动的 WebArena 购物网站中，找到满足以下全部条件的商品：`<商品类别与约束>`。

比较符合条件的候选项，选择价格最低且有现货的一项，加入购物车，数量设为 `<数量>`，使用测试账户的默认地址，并操作到“最终确认订单”页面。核对商品、数量、单价、运费和总价后停止，不要点击最终下单或进行真实支付。记录关键页面和最终购物车明细；若不存在满足条件的商品，说明冲突条件并停止。
```

- 来源/资源：任务模板，参考 [WebArena](https://github.com/web-arena-x/webarena) 的自托管网页 Agent 环境。

### 网页多步任务（登录、填写表单）

```md
连接已启动的 MiniWoB++ 环境并完成 `<环境名称>` 给出的任务。

必须只依据页面顶部的自然语言指令操作网页；完成登录、选择、输入和提交等必要步骤。每次操作前读取当前 DOM/可访问性状态，不依赖固定屏幕坐标；如果页面报告失败，分析原因后从有效状态重试；页面明确显示成功后立即停止。输出最终状态和实际执行的动作序列。
```

- 来源/资源：任务模板，参考 [MiniWoB++](https://github.com/Farama-Foundation/miniwob-plusplus) 及其 [文档](https://miniwob.farama.org/)。

### Browser Agent Tasks

```md
使用浏览器在 `<测试网站 URL>` 中完成以下任务：

1. 使用 `<测试账户>` 登录；
2. 找到订单 `A-1042`；
3. 将配送方式改为“加急配送”；
4. 应用优惠码 `TEST10`；
5. 核对商品、配送费、折扣和最终金额；
6. 到达最终确认页面后停止，不要提交订单或触发真实付款。

必须依据当前页面的 DOM 或可访问性状态操作，不得直接访问数据库或调用网站内部 API。若元素不存在或任务无法安全完成，报告阻塞证据并停止。最后输出动作记录和页面显示的最终摘要。
```

- 来源/资源：任务模板，参考 [BrowserGym](https://github.com/ServiceNow/BrowserGym) 与 [WebArena](https://github.com/web-arena-x/webarena) 的浏览器 Agent 评测方式；结果依赖测试网站状态，无固定答案。

## 工具调用

### 天气 API 调用

```md
你可以调用工具：

`get_weather(location: string, date: string, unit: "celsius" | "fahrenheit")`

用户请求：“查询 2026-08-02 上海的天气，温度使用摄氏度。”

请选择正确工具并提供完整参数。不要臆造天气结果，也不要调用无关工具；在收到工具结果前只输出工具调用。
```

- 来源/资源：代表性测试题，参考 [Berkeley Function-Calling Leaderboard（BFCL）](https://gorilla.cs.berkeley.edu/leaderboard) 的单轮函数调用能力。
- 参考答案：

```json
{"name":"get_weather","arguments":{"location":"上海","date":"2026-08-02","unit":"celsius"}}
```

### Calendar 创建事件

```md
你可以调用工具：

`create_calendar_event(title: string, start: string, end: string, timezone: string, attendees: string[], description?: string)`

用户请求：“创建项目复盘会议，时间是 2026 年 8 月 5 日上海时间 14:00，持续 45 分钟，邀请 alice@example.com 和 bob@example.com，备注为‘回顾里程碑与风险’。”

计算正确结束时间并发起一次工具调用。不要遗漏时区、重复创建事件或自行改变参会人。
```

- 来源/资源：代表性测试题，参考 [BFCL](https://gorilla.cs.berkeley.edu/leaderboard) 的参数抽取与可执行函数调用能力。
- 参考答案：

```json
{"name":"create_calendar_event","arguments":{"title":"项目复盘会议","start":"2026-08-05T14:00:00+08:00","end":"2026-08-05T14:45:00+08:00","timezone":"Asia/Shanghai","attendees":["alice@example.com","bob@example.com"],"description":"回顾里程碑与风险"}}
```

### JSON Tool Calling

```md
你可以调用以下工具：

`search_products(query: string, max_price: number, in_stock_only: boolean, sort: "price_asc" | "rating_desc")`

用户请求：“帮我找有现货、价格不超过 500 元的无线机械键盘，按价格从低到高排列。”

只输出一个合法 JSON 对象，顶层必须且只能包含 `name` 和 `arguments`。不得输出 Markdown、解释、搜索结果或未经工具返回的数据。
```

- 来源/资源：代表性 JSON 工具调用题，能力维度参考 [Berkeley Function-Calling Leaderboard（BFCL）](https://gorilla.cs.berkeley.edu/leaderboard)。
- 参考答案：

```json
{"name":"search_products","arguments":{"query":"无线机械键盘","max_price":500,"in_stock_only":true,"sort":"price_asc"}}
```

### 多工具串联（搜索 → 总结 → 发送邮件）

```md
可用工具如下：

- `web_search(query: string) -> SearchResult[]`
- `fetch_page(url: string) -> Page`
- `send_email(to: string, subject: string, body: string) -> SendResult`

请搜索并阅读至少两个 Python 官方来源，概括 Python 3.13 free-threaded CPython 的用途、启用方式和主要限制，然后把不超过 200 字的中文摘要及来源链接发送给 dev@example.com，主题为“Python 3.13 free-threaded mode 摘要”。

必须按依赖顺序调用工具；只能总结实际读取到的内容；发送前检查收件人、主题、事实和链接。最终报告邮件工具返回的状态。
```

- 来源/资源：代表性测试题，参考 [BFCL](https://gorilla.cs.berkeley.edu/leaderboard) 的多步、多工具调用能力。

## 长上下文

### Long Context Needle（大海捞针）

```md
下面会提供一段长度超过 100,000 tokens 的文本：

<长文本，其中某处包含唯一的目标事实>

请找出文本中“实验编号 ORCHID-731 的校准口令”是什么，并原样输出该口令。不得根据附近的相似编号猜测；如果文本中没有该事实，只输出 `NOT_FOUND`。
```

- 来源/资源：任务模板，参考 Greg Kamradt 的 [Needle in a Haystack](https://github.com/gkamradt/needle-in-a-haystack) 长上下文检索测试。

### 长代码仓库定位 Bug

```md
分析 `<大型代码仓库路径>` 和以下故障报告：

<故障现象、复现步骤与错误日志>

先在仓库中定位与错误直接相关的入口、调用链、状态变换和测试，不要把整个仓库无差别总结。给出最可能的根因以及文件和符号级证据；随后实现最小修复并运行回归测试。最终列出搜索路径、关键证据、修改和验证结果。
```

- 来源/资源：任务模板，参考 [SWE-bench](https://github.com/SWE-bench/SWE-bench) 的仓库级上下文任务。

### 长 PDF 问答

```md
阅读提供的长 PDF：`<PDF 文件>`。

回答问题：`<需要跨章节整合的问题>`。

答案必须综合至少两个相关章节，并为每项关键结论标注 PDF 页码；区分原文事实、作者观点和你根据原文作出的推断。若不同章节存在冲突，分别陈述并指出冲突位置；若文档没有答案，明确写“文档未提供”，不得使用外部知识补全。
```

- 来源/资源：任务模板，参考 [LongBench](https://github.com/THUDM/LongBench) 的长文档理解与问答任务。

## 视觉（Vision）

### ChartQA（图表问答）

```md
观察所附图表 `<图表图片>`，回答：

1. 数值最高的系列和对应类别是什么？
2. 从 `<类别 A>` 到 `<类别 B>`，`<指定系列>` 的绝对变化量和百分比变化分别是多少？
3. 图例、坐标轴或单位是否存在可能导致误读的信息？

先准确读取图表，再进行计算。每个答案都要列出用到的图中数值；无法辨认时明确说明，不得猜测。
```

- 来源/资源：任务模板与数据集见 [ChartQA](https://github.com/vis-nlp/ChartQA)。

### DocVQA（文档 OCR + 理解）

```md
阅读所附文档图片 `<文档图片>`，提取并回答：

- 文档类型、标题或编号；
- 出具日期和涉及的主体；
- `<目标字段>` 的原始值；
- 支撑答案的原文片段及其所在区域（如“右上角”“表格第 3 行”）。

保留原始大小写、数字、货币符号和日期格式。对于模糊字符给出不确定性说明，不要用常识补齐看不清的内容。
```

- 来源/资源：任务模板与数据集见 [DocVQA](https://site.docvqa.org/datasets/docvqa)。

### MMMU（大学多学科视觉题）

```md
请根据所附专业图像 `<图像>` 回答以下大学学科问题：

<题干>

(A) <选项 A>
(B) <选项 B>
(C) <选项 C>
(D) <选项 D>

必须同时使用图像中的信息和相关学科知识。先指出图像中与判断有关的结构、数值或标注，再完成推理；最后一行只输出选项字母。若图像缺失或关键区域不可辨认，明确说明，不能仅凭题干猜测。
```

- 来源/资源：任务模板与评测代码见 [MMMU](https://github.com/MMMU-Benchmark/MMMU)。

## 指令遵循

### IFEval 风格严格格式输出

```md
介绍大语言模型评测。输出必须同时满足以下要求：

1. 恰好 4 个无序列表项；
2. 每项只包含一个句子；
3. 每项都必须包含“模型”二字；
4. 全文不得出现阿拉伯数字；
5. 不得添加标题、前言、结语或代码块。
```

- 来源/资源：代表性测试题，约束类型参考 Google Research [IFEval](https://github.com/google-research/google-research/tree/master/instruction_following_eval) 和 [IFEval 论文](https://arxiv.org/abs/2311.07911)。
- 参考答案：

```text
- 模型评测需要覆盖推理能力。
- 模型评测应检查事实准确性。
- 模型评测还要衡量指令遵循。
- 模型评测必须记录成本延迟。
```

### 只能输出 JSON

```md
阅读文本：“海风计划原定周一上线。由于支付回调测试失败，团队决定推迟到周三，并由林青负责修复，风险等级为高。”

只输出一个合法 JSON 对象，不得使用 Markdown 代码块或附加文字。对象必须严格包含以下字段，不能增加字段：

- `project`: 字符串
- `original_day`: 字符串
- `new_day`: 字符串
- `owner`: 字符串
- `risk`: `"low" | "medium" | "high"`
- `reason`: 字符串

所有键名使用英文；除 `risk` 需映射为指定英文枚举外，其余字符串值使用原文中的中文信息。JSON 必须可被标准解析器直接解析。
```

- 来源/资源：代表性测试题，能力维度参考 [IFEval](https://github.com/google-research/google-research/tree/master/instruction_following_eval) 的可验证格式约束。
- 参考答案：

```json
{"project":"海风计划","original_day":"周一","new_day":"周三","owner":"林青","risk":"high","reason":"支付回调测试失败"}
```

### 满足多个限制条件

```md
写一段关于“远程协作”的中文建议，并同时满足：

- 正文恰好分为两段；
- 第一段以“先对齐目标：”开头；
- 第二段以“再缩短反馈：”开头；
- 全文包含“异步”和“复盘”；
- 不出现“非常”“赋能”“抓手”；
- 全文不使用列表、标题、括号或感叹号；
- 最后四个字必须是“持续改进”。

只输出正文，不解释你如何满足这些条件。
```

- 来源/资源：代表性测试题，能力维度参考 [IFEval](https://github.com/google-research/google-research/tree/master/instruction_following_eval) 与 [LiveBench Instruction Following](https://github.com/LiveBench/LiveBench)。
- 参考答案：

```text
先对齐目标：明确共同成果、责任边界和完成标准，把关键决策写入共享文档，让成员通过异步更新掌握进度，减少重复确认和方向偏差。

再缩短反馈：约定固定同步节奏，及时暴露风险与依赖，在阶段结束后开展复盘，将有效做法沉淀为团队约定，并根据结果持续改进
```

### ASCII Art

```md
绘制一个 5×5 的 ASCII 字符画字母 `X`。

输出必须严格满足：

- 恰好 5 行，每行恰好 5 个字符；
- 只能使用 `#` 和 `.`；
- 两条对角线位置使用 `#`，其余位置使用 `.`；
- 不得输出标题、解释、缩进或 Markdown 代码块。
```

- 来源/资源：代表性字符画与严格格式测试题，约束类型参考 [IFEval](https://github.com/google-research/google-research/tree/master/instruction_following_eval)。
- 参考答案：

```text
#...#
.#.#.
..#..
.#.#.
#...#
```

### ASCII Art 生成

```md
生成一幅“月夜帆船”的 ASCII Art。

输出必须严格满足：

- 只输出字符画，不得添加标题、解释或 Markdown 代码块；
- 画布恰好 18 行，每行恰好 48 个 ASCII 字符，制表符不计为空格且禁止使用；
- 第一行和最后一行必须是由 `+`、46 个 `-`、`+` 组成的边框，其余每行必须以 `|` 开头并以 `|` 结尾；
- 只能使用空格以及 `+`、`-`、`|`、`/`、`\`、`_`、`.`、`*`、`~`、`(`、`)`、`o`；
- 左上区域包含一弯月亮，天空中至少有 5 颗彼此分开的星星；
- 中央包含一艘轮廓清晰的帆船，必须能辨认出桅杆、左右两面三角形船帆和船体；
- 最下面至少 4 行表现连续海浪，并在船体下方表现倒影；
- 不得出现字母、数字、Unicode 图形字符或超出边框的内容。
```

- 来源/资源：开放式字符画生成题，无固定答案；格式约束能力参考 [IFEval](https://github.com/google-research/google-research/tree/master/instruction_following_eval)，字符画样式参考 [ASCII Art Archive](https://www.asciiart.eu/)。

## 中文

### CLUE 风格中文分类

```md
将下面的新闻标题分类为且仅分类为一个标签：`财经`、`科技`、`体育`、`娱乐`、`教育`、`社会`。

标题：“国产团队发布新一代低功耗人工智能推理芯片”

只输出标签，不要解释。
```

- 来源/资源：代表性测试题，能力维度参考 [CLUE 中文语言理解测评基准](https://github.com/CLUEbenchmark/CLUE)。
- 参考答案：`科技`。

### C-Eval 风格中文学科选择题

```md
在操作系统的虚拟内存管理中，当进程访问的页不在物理内存中时，通常会触发哪一种事件？

(A) 缺页异常
(B) 时钟中断
(C) 管道阻塞
(D) 死锁检测

请先用一句话说明理由，最后一行只输出选项字母。
```

- 来源/资源：代表性测试题，题型参考 [C-Eval](https://github.com/hkust-nlp/ceval)。
- 参考答案：`A`。访问的页不在物理内存时会触发缺页异常，由操作系统调页。

### CMMLU 风格中文多学科题

```md
二十四节气中，紧接在“立春”之后的是哪一个节气？

(A) 雨水
(B) 惊蛰
(C) 春分
(D) 清明

只输出选项字母。
```

- 来源/资源：代表性测试题，题型参考 [CMMLU](https://github.com/haonan-li/CMMLU)。
- 参考答案：`A`（雨水）。
