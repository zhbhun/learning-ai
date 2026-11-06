# domain-modeling

> 构建并打磨项目的领域模型。适用于讨论代码库术语、编写或修改 GLOSSARY.md、记录或修改 ADR 时使用。

## 场景

一个只有 `order.ts` 一个文件的 billing 模块,请技能理清两件混的事:口头说的 "account" 到底指客户还是登录用户;产品说的「按 item 部分取消」和代码里「只能整单取消」的矛盾。沙箱里没有 GLOSSARY.md,代码也刻意只实现了整单取消、字段叫 `customerId`。

## 对话

- /domain-modeling 我想把我们 billing 模块的领域语言定下来。代码在 sandbox/src/billing/order.ts。两个问题:一是大家平时把客户说成 "account",但有时候又指登录用户,我觉得混了;二是订单取消,产品说可以按 item 部分取消,但代码里好像只能整单取消。帮我把这些概念理清楚,该写下来的写下来。

  ```md
  完成了。先说清楚一件事：你给的路径 `sandbox/src/billing/order.ts` 在当前仓库里不存在，我找到了实际位置——skill 工作区内的 `libraries/skills/engineer/mattpocock-skills/domain-modeling/sandbox/src/billing/order.ts`， Glossary 建在了 `libraries/skills/engineer/mattpocock-skills/domain-modeling/sandbox/GLOSSARY.md`（原本没有，按需新建）。

  **代码证实了你的两个疑问，尤其第二个：**

  - `order.ts` 只有 `cancelEntireOrder(order)`，直接把整个 `Order.status` 置为 `cancelled`；`OrderItem` 上没有任何状态字段。所以"按 item 部分取消"目前代码里不存在，产品和代码确实矛盾。
  - "account" 混用的问题代码里看不出来——`Order` 上只有 `customerId`。代码用的是 Customer，混用发生在口头语言里。

  **我已在 GLOSSARY.md 写下的裁决（opinionated，可推翻）：**

  - **Customer** = 下单付费的一方，`customerId` 指向它；**User** = 登录身份，不属于 billing 概念；两者都把 **account** 列入 _Avoid_。规则是：说 "account" 之前先想清楚指哪个。
  - **Cancellation** = 整单作废（现有代码的行为）；**Item Cancellation** = 单个 OrderItem 作废（产品想要的行为）。两个词分开立目，避免"取消"一个词扛两种含义。

  **还需要你拍板的场景（这决定了 Glossary 是否要改）：**

  1. 一个 Customer（比如公司）下能不能有多个 User？如果能，"account 的订单"这种说法就必须禁掉。
  2. Item Cancellation 之后订单状态是什么？`Order` 只有一个整体 status：取消 3 个 item 中的 1 个，订单还是 `paid` 吗？全部 item 都取消了，算 `cancelled` 吗？——这基本意味着要把状态从"订单级单枚举"改成"item 级状态 + 订单派生状态"，是一次真正的模型改动。
  3. 按 quantity 部分取消算不算 Item Cancellation（同一种商品买 3 件退 1 件）？

  **ADR**：第 2 点一旦定了（尤其是选 per-item），满足"难逆转 + 令人意外 + 真实取舍"三条，值得一条 ADR（`docs/adr/0001-...`）——但决策还没做，所以现在没写。你回答场景 2/3 后我再落。
  ```

技能当场产出了 [sandbox/GLOSSARY.md](sandbox/GLOSSARY.md),内容如下:

```md
# Billing

管理订单生命周期与取消的模块。这里的词是团队口头讨论、代码命名和产品沟通的统一用语。

## Language

**Order**:
客户一次下单产生的整体,由一个或多个 OrderItem 组成。
_Avoid_: purchase, transaction

**OrderItem**:
Order 中的一种商品及其数量与单价,是取消的最小单位。
_Avoid_: line item, product

### People

**Customer**:
下单并为之付费的一方,订单通过 customerId 关联它。与谁能登录无关。
_Avoid_: account, buyer, client

**User**:
登录身份,属于账号体系,不是 billing 的概念。说 "account" 之前,先想清楚指的是 Customer 还是 User。
_Avoid_: account

### Cancellation

**Cancellation**:
把整个 Order 作废,其全部 OrderItem 一并失效。
_Avoid_: refund, close

**Item Cancellation**:
把 Order 中选定的 OrderItem 作废,其余 OrderItem 不受影响。
_Avoid_: partial refund
```

## 总结

这个技能是给项目「定行话」用的:当团队里同一个东西有好几种叫法、或者嘴上说的和代码做的不一致时,它逼着 agent 先把词裁清楚、再拿代码对证、然后把定下来的词当场写进 GLOSSARY.md,而不是边聊边含糊过去。没装的话(示意),agent 大概率顺着「部分取消」的提法直接动手改代码,或者给个两头讨好的解释,混用的 "account" 会原样留在讨论和命名里。

实际效果:它没有替用户做主,而是先给出有倾向的裁决(标注「可推翻」),再把三个真正需要人拍板的边界问题(一个客户能否多个登录用户、部分取消后订单状态算什么、按数量退算不算 item 级取消)以具体场景抛回来——技能里「问用户」的环节在这个单轮试用里表现为「先裁决 + 留问题清单」,不会卡住等回答。ADR 的克制也如实体现:决策还没做,一条都不写,只预告了哪条够格。局限是它产出的是语言层面的共识,Item Cancellation 要落地仍是代码里一次实打实的模型改动,技能不会替你改代码。
