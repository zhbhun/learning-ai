# code-review

> 双轴 diff 审查：**Standards**（是否符合仓库文档规范 + Fowler smell 基线）与 **Spec**（是否忠实实现原始需求）。两轴并行子代理、分开汇报，明确不合并排序。

## 场景

独立 git 仓库 sandbox/，两个提交构成 diff：

- `1b50624` docs: coding standards and price-calculator spec（固定点）
- `20391d0` feat: price calculator page（被审对象，单文件 HTML）

三个文件各司其职：`CODING_STANDARDS.md` 定了 6 条 JS 规范（禁 var、禁 ==、命名、单引号、JSDoc、金额 toFixed(2)）；`specs/price-calculator.md` 是需求（3 件商品表格、满 200 打 9 折、数量必须正整数、两位小数）；`price-calculator.html` 是埋雷实现。

埋的雷（不告知 skill）：

- 规范侧 6 条：全量 `var`、`==` 比较、`fn1`/`t`/`s`/`q` 神秘命名、全文件双引号字符串、零 JSDoc、金额无一处 `toFixed(2)`
- spec 侧 3 条：打折阈值写成 `>= 100`（要求 200）、合计循环 `i < qtyInputs.length - 1` 漏加最后一件商品、数量校验只查空和非数字（漏 0/负数/小数）
- 另有 1 处未刻意埋的行为：点击合计时回写每行小计（spec 只要求初始值）

## 对话

- /code-review 1b50624 — spec 路径 specs/price-calculator.md

  ```md
  ## Standards

  （a）文档规范违规（硬性）：规则 1 全量 var 违规；规则 2 `q == ""`；规则 3 `fn1` 名字无法看出用途；规则 4 整个脚本无单引号；规则 5 `render()`/`fn1()` 均无 JSDoc；规则 6 四处金额未 toFixed(2)。
  （b）基线 smell（判断性）：Duplicated Code（小计公式 render/fn1 两处）；Mysterious Name（t、s）；Primitive Obsession（金额裸 number）；Data Clumps（弱）。
  另注：`i < qtyInputs.length - 1` 漏算最后一行，疑似 off-by-one，建议转交 spec/bug 审查线确认。

  ## Spec

  （a）缺失或部分实现：金额两位小数完全未实现（L5）；数量校验只覆盖 5 种无效情形中的 2 种（L8）。
  （b）超出范围：点击时同步回写每行小计，spec 只要求初始值（L6，轻微）。
  （c）实现可能有误：打折阈值 `t >= 100` 与规格 200 不符（L7）；合计漏加最后一件商品，69.7 算成 59.8（L7）；校验遗漏连带 0/负数/小数进不了错误分支。

  汇总：Standards 轴 10 条发现，最重是金额格式化无一处遵守；Spec 轴 6 条发现，最重是合计漏加最后一件商品。
  ```

## 总结

一句话：给一个带文档规范和书面需求的 git 仓库，它能并行分轴把「写得不合规」和「做得不对」分开抓全——9 处刻意埋的雷全部命中、还额外抓到 1 处没埋的超范围行为，且 Standards 轴发现的 off-by-one 疑点被 Spec 轴独立坐实，验证了双轴交叉印证的设计意图；前提是仓库必须有真实 diff（固定点 + 规范文件 + spec），issue tracker 缺失时需手动指 spec 路径。

产物:[sandbox/](sandbox/)
