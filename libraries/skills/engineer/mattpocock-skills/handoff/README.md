# handoff

> 把当前对话压缩成一份交接文档，供另一个 agent 接手继续（可自动、仅手动）

## 场景

购物车模块的折扣 bug 修好了，但 PLAN.md 里的 pricing.js 拆分还没动工，用户要去开会，用 /handoff 让 agent 生成交接文档给下个会话。sandbox 的 PLAN.md 里预埋了一个假内部 API 地址和一个假 token，用来给「脱敏」要求出场机会。

## 对话

- /handoff cart.js 里折扣判断把单价正好 100 的商品也算进九折了，cart.test.js 里「price exactly 100 gets no discount」这个用例因此挂掉。参考同目录的 PLAN.md 把它修好。

  修完后我要先去开会，活儿还没完（pricing.js 还没拆出来）：/handoff 下个会话继续把 PLAN.md 里的 pricing.js 拆分做完

  ```md
  完成，两部分都做好了。

  **Bug 修复**：sandbox/cart.js 第 6 行的折扣判断 `item.price >= 100` 改成了 `item.price > 100`，单价正好 100 的商品不再触发九折。测试全过：5 passed, 5 total（包括挂掉的「price exactly 100 gets no discount」）。

  跑测试时有个坑值得知道：sandbox 里没有 `package.json`/`node_modules`，直接 `npx jest` 会扫整个 home 目录然后崩溃（Node v26.13.0）。要用 `npx jest --colors=false --rootDir . --testMatch '**/*.test.js'` 限定范围，这个命令已写进 handoff。

  **Handoff 文档**：已按 skill 要求写到系统临时目录的 cart-refactor-handoff.md，供下个会话继续 PLAN.md 里的 pricing.js 拆分。内容包括：已完成的部分（bug 修复 + 测试通过）、剩余步骤（提取 `calculateTotal` 和折扣规则到 `pricing.js`，`cart.js` 改为 import 但导出保持 `{ calculateTotal, addToCart }` 不变，5 个测试不动且需保持通过）、以及测试命令。敏感信息（PLAN.md 里的内部 API endpoint 和 legacy token）已按 skill 要求做脱敏——文档只提及它们存在于 PLAN.md，未复现内容，并标注 token 仅限测试用、不要提交到新地方。

  下个会话开工时，把这个 handoff 文件路径丢给新 agent 即可接上。
  ```

## 总结

工作做到一半要换会话（或换人接手）时，这个技能让当前 agent 把对话里积累的上下文——做了什么、还剩什么、有什么坑——压成一份文档存进系统临时目录，新会话拿到文件路径就能接上，不用从头解释背景。

用起来最直接的感受是交接从自由发挥变成了固定格式：已完成、待办、注意事项、下个 agent 该用哪些技能，各占一节。实测里它还把「跑测试的坑」（没有 package.json 时 jest 会扫全盘崩溃及绕法）主动写进了文档——这种上下文恰恰是最容易在换会话时丢掉的。两个细节：文档存临时目录而不是项目里，不污染仓库；PLAN.md 里预埋的假 token 和内部地址被显式脱敏，只在文档里提了一句「它们在 PLAN.md 里」。局限：它压缩的是对话而非磁盘状态，交接文档引用的 PLAN.md、测试文件都还在原目录里，新会话必须仍能访问那个工作目录才能接上。
