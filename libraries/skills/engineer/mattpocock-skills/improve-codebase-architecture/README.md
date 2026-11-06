# improve-codebase-architecture

> 扫描代码库找出「把浅模块做深」的重构机会，生成可视化 HTML 报告，再对你选中的一个候选进行 grilling 深挖（仅手动）

## 场景

sandbox/ 是一个按「拆成小类更好测试」思路刻意拆碎的通知管道小仓库：8 个 TS 文件、一条 ADR（记录「保持五个类」的决定）、7 条提交模拟反复修补的热点历史，无 GLOSSARY.md。发给子代理一条真实用户请求，让它对这个仓库跑一遍架构评审。埋的问题不告知技能：外层 NotificationService 纯透传（接口和实现一样宽）、SMTP/webhook 的传输判断焊死在路由里、所有依赖在类内部 new（没有测试替身）。单轮试用：子代理以「问用户选哪个候选」收尾等待接话，grilling 环节未发生。

## 对话

- /improve-codebase-architecture sandbox/，帮我看看这块代码的架构有没有要改进的地方

  ````md
  架构评审完成，报告已在浏览器打开：

  **报告路径**：`architecture-review-20261104-235104.html`（原文为系统临时目录下的绝对路径，按隐私规则改写为文件名；skill 要求写入 $TMPDIR 且每次运行生成新文件）

  按 skill 流程执行：读取了 SKILL.md、HTML-REPORT.md、codebase-design 词汇表（module/interface/depth/seam/adapter/leverage/locality）和 DEEPENING.md；读遍 sandbox 的 8 个源文件、ADR-0001 和 git 历史。git 历史很能说明问题：`34d28e3` 把 `sendNotification` 拆成 5 个类，之后紧跟 6 个 fix —— 每个 fix 都要跨文件理解管道编排知识，拆分宣称的"可测试性"并未兑现。

  **4 个 deepening candidates**：

  1. **合并管道为一个 deep module**（Strong，in-process）— 5 个浅模块，接口≈实现；核心行为"high priority 跳过限流"散落在 `notification-service.ts:29` 的调用方里，无 locality。合并后 `send(req)` 是唯一 interface，interface 即测试面。⚠ 与 ADR-0001 冲突，但值得重开：ADR 的目标就是可测试性，而拆分恰恰没做到。
  2. **传输语义后撤到 seam 之后**（Strong，ports & adapters）— `ChannelRouter.deliver` 焊死了 SMTP 的 `code === 250` 和 webhook 的 `2xx–4xx` 判断；fix `cbc7d53`（204 误判失败）正说明泄漏。port `deliver(to, body) → ok`，SMTP/webhook 两个 adapter = 真实 seam。
  3. **channel 字符串知识内聚**（Worth exploring，in-process）— "channel" 是领域词但只以裸字符串跨 `ChannelRouter` 和 `RateLimiter` 两个 interface 存在；fix `3055834` 需要同时协调两处。
  4. **DeliveryLog 的隐藏配置显式化**（Speculative，local-substitutable）— 写入路径 `delivery.log`（cwd 相对）是 caller 必须知道的事实却不在 interface 上；注入 sink 后 file/memory 两个 adapter 成真实 seam。

  **Top recommendation**：先做 1，2 作为其内部 seam 自然落地，不必单独重构。

  **给用户的问题**：你想深入探讨哪一个 candidate？选定后我会按 skill 进入 grilling 环节（约束、依赖、deep module 形状、seam 后面放什么、哪些测试存活），期间用 domain-modeling 同步更新 GLOSSARY.md。
  ````

## 依赖

- **codebase-design**：第 1、2 步（扫描 + 出报告）就靠它——整套架构词汇（module、depth、seam、adapter 等）和判断原则全部来自这里，报告措辞被强制使用这套词。
- **grilling**：第 3 步（用户选定候选后的深挖）用它逐轮逼问设计决策；缺失时前半程照常，从深挖环节起中断。本次试用停在这一步之前，未真实触发。
- **domain-modeling**：第 3 步的副作用由它管——更新 GLOSSARY.md、提 ADR；同样只在深挖环节出场。

## 总结

这个技能是一条「架构体检」命令：给它一个代码目录，它先翻 git 提交历史找最近反复在改的文件（哪儿疼检查哪儿），再带着一套固定的结构词汇读代码，最后产出一份能在浏览器打开的 HTML 报告——每张候选卡片带前后对比图和推荐强度徽章，末尾给出「先做哪个」的明确答案。报告阶段对仓库零写入，GLOSSARY、ADR 的落笔都留给后续深挖环节。

对比着看。指着 sandbox 问：「这块代码架构有没有要改进的地方？」

**没装这个 skill，Claude 的回答：（示意）**

> 建议关注职责划分，可以考虑引入服务层解耦，为将来的变化做好抽象……

**装了这个 skill，Claude 的回答是四张可以照着干的卡片。** 最值钱的一幕是处理 ADR 冲突：候选 1（合并五个类）和仓库里 ADR-0001「保持五个类」的决定正面相撞，技能没有回避也没有硬闯，而是在卡片上打了警告框——「ADR 的目标就是可测试性，而拆分恰恰没做到」，用一个自身失败的事实去推翻记录它的决定。候选 2 则拿刚修过的 bug（204 被误判失败）当泄漏的现场证据，判断都有出处。

局限：流程到「你想深挖哪一个？」就停了，后半段的 grilling 深挖需要用户接话才继续；报告写在系统临时目录（每次运行新文件名），不在仓库里，想留存得自己拷贝。

产物：架构评审 HTML 报告写在系统临时目录（`architecture-review-20261104-235104.html`），仓库内零改动；被评审的代码在 [sandbox/](sandbox/)。
