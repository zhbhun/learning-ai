# codebase-design

> 深模块设计的共享词汇：小接口压大实现，放在干净的 seam 上，接口即测试面。附 DEEPENING（按依赖分类定 seam）与 DESIGN-IT-TWICE（并行子代理设计多个 radically different 的接口再对比）两个子流程。本次实测跑通 design-it-twice 全程。

## 场景

git 仓库 sandbox/，单 commit，5 个 TS 文件，埋的结构问题（不告知 skill）：

- `order-service.ts`：纯透传层（interface 与实现一样宽，depth≈0）
- `checkout.ts` / `reorder.ts`：各自内联「按行计价→汇总→扣款→落库」四步，计价规则已漂移（满 10 件 95 折 vs 满 5 件 97 折，注释自证「从 checkout 拷贝后漂移」）
- `db.ts`：每次调用 `connect()`，无测试替身
- `stripe-client.ts`：每个 caller 自行 `new`，true external 依赖

skill 未注册为命令，按 SKILL.md → DEEPENING.md → DESIGN-IT-TWICE.md 手动执行全程。

## 对话

- 用 codebase-design 这个技能设计一下这个代码库：sandbox/（源技能位于本机另一 skills 目录，结果输出到 libraries/skills/product/mattpocock-skills/codebase-design；原话含绝对路径，按隐私规则改写）

  ````md
  skill 未注册为命令,按其 SKILL.md → DEEPENING.md → DESIGN-IT-TWICE.md 手动执行全程。

  **Step 1 — 候选定位与依赖分类**(对着 sandbox 代码过 SKILL.md 的删除测试和 DEEPENING.md 的依赖分类):

  - `order-service.ts` 是典型浅模块:接口几乎和实现一样宽,删除后复杂度不会在任何地方重现——纯 pass-through。
  - `checkout.ts` 与 `reorder.ts` 里各有一份「按行计价 + 汇总 + 扣款 + 落库」的流程,且计价规则已经漂移(满 10 件 95 折 vs 满 5 件 97 折)——复杂度分散在 N 个 caller,这正是「深模块」要收的位置。
  - 依赖分类:`db.ts`(Postgres)属 **local-substitutable**(PGLite 可替身);`stripe-client.ts` 属 **true external**(需注入 port + mock)。

  **Step 2 — 问题空间陈述**(DESIGN-IT-TWICE 要求先给用户看的部分):

  候选是把「下单计费」合并成一个深模块。任何新接口都要满足:两条入口(首购、复购)走同一套计价规则;Stripe 是真外部依赖,必须能被 mock;测试面要落在模块接口上而非内部状态。示意现状(约束的具象化,不是提案):

  ```typescript
  // 两个 caller 各自内联了 4 步流程,规则已漂移:
  const lineCents = l.qty >= 10 ? Math.round(l.cents * l.qty * 0.95) : ...; // checkout
  const lineCents = l.qty >= 5  ? Math.round(l.cents * l.qty * 0.97) : ...; // reorder
  ```

  现在并行派 3 个子代理,各按一条互斥约束设计 radically different 的接口:极简接口 / 最大弹性 / 常见调用者优先。

  **Step 3 — 对比(depth / locality / seam placement)+ 推荐**:3 个方案全部返回,且互斥性足够(两个动词 / 三个插头 / 默认值选项,三种完全不同的接口形状)。

  | | 方案 A 极简 | 方案 B 弹性 | 方案 C 常见者优先 |
  |---|---|---|---|
  | 入口 | `placeOrder` / `reorder({orderId})` 两动词 | factory + `place`/`placeMany`/`refund` + 3 插头 | `placeOrder(cart, token, options?)` |
  | 计价 | 完全私有 | 组合根显式配置(保留两套规则) | 默认私有,可显式覆盖 |
  | Postgres seam | **内部**,公共面不开 port | 公开 `OrderStore` port | 公开 `OrderStore` port |

  - **depth**:C 的两参默认调用单点杠杆最高;A 的 `reorder({orderId})` 单入口最深(调用方连存储形状都不用知道);B 的 `place()` 后压的行为最多(还多出今天不存在的幂等/重试),但组装者要学 3 个插头 + 错误 taxonomy,单位接口杠杆被摊薄。
  - **locality**:A 最强——计价无旋钮,漂移机制上不可能;C 次之——漂移要显式写 preset,会出现在 diff 和评审里;B 把漂移升格为组合根两行可见配置,是「合法化的漂移」。
  - **seam placement**:分歧点在 Postgres。B、C 都在公共接口开了 `OrderStore` port;A 按 DEEPENING.md 分类 2 原文(local-substitutable:「seam 是内部的,模块外部接口不开 port」)留内部 seam。三方案里只有 A 与 skill 自己的依赖分类表一致——brief 里「测试需 mock」的措辞把另外两个方案带宽了一档,skill 自己的分类表仲裁了这个分歧。

  **推荐(混合)**:以 C 的入口形状为骨架(最常见 caller 一行调用)+ A 的依赖策略(只有 Stripe 开 port;Postgres 内部 `{ query }` seam、测试跑 PGLite)+ A 的 `reorder({orderId})` 第二动词;计价默认私有(`pricedBy` 仍印在 receipt 上保留可观测性)、C 的「钱动没动」错误契约。B 整体不取,收编三条论证:总额归 module(类型层封死行总不一致)、插头只在两个实现同时需要时才长方法、漂移本身即计价 seam 的存在性证明。三方案一致删除 `order-service.ts`(单满足物的假想 seam),删除测试得到交叉确认。

  三份子代理设计原文见产物:[designs/a-minimal-interface.md](sandbox/designs/a-minimal-interface.md)、[designs/b-max-flexibility.md](sandbox/designs/b-max-flexibility.md)、[designs/c-common-caller-first.md](sandbox/designs/c-common-caller-first.md)。
  ````

## 总结

这技能是干什么的：一份**写给 Claude 的代码结构判断规则手册**，让 Claude 从「说正确的废话」变成「下具体的决定」。

对比着看。指着 sandbox 那两个重复文件问：「checkout 和 reorder 代码差不多，怎么整？」

**没装这个 skill，Claude 的回答：**

> 建议提取公共逻辑，注意单一职责原则，可以考虑引入服务层来解耦，为将来可能的变化做好抽象……

每句都对，听完还是不知道该干嘛。

**装了这个 skill，Claude 的回答：**

1. 两个文件合并成一个，计价规则只留一份
2. 数据库**不要**做接口——它只有一个实现，做接口是白忙
3. 支付**要**做接口——测试时需要一个假的 Stripe
4. 中间那个只转手的 order-service 直接删掉

每条都是可以照着干的**决定**。第 2 条还是反直觉的：一般人和默认的 Claude 都觉得「留个接口以备将来换数据库」是好习惯，这个 skill 明确说——只有一个实现满足的接口就是白忙。

**触发时机**就三种（平时不干活）：代码里同一逻辑出现两份开始漂移；想抽公共层/写接口拿不准该不该；要设计新模块的接口。和 code-review 一句话区分：code-review 查「写错的」，这个治「长歪的」。

实测感受：design-it-twice 能用同一套词汇并行产出三个真正互斥的接口方案，并放到 depth/locality/seam 三轴上可比、可仲裁——最值钱的一幕是三个方案在 Postgres seam 位置上分裂时，skill 自己的依赖分类表当裁判判了最窄的那个。局限：3× 子代理 token、设计质量对 brief 措辞敏感（一次措辞偏差实测把 2/3 方案带宽一档），且全程只到设计为止、不落一行实现代码；module、seam、adapter 那套词汇是装进 Claude 脑子里的判断工具，读者不需要学。

产物：[sandbox/](sandbox/)
