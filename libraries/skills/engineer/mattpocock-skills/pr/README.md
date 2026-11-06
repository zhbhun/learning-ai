# pr

> 写 PR 描述时使用

## 场景

给一个购物车优惠券 bug 的修复提交写 PR 描述：`save10` 小写优惠券码原本匹配不上，修复后大小写不敏感。沙箱是一个独立 git 仓库，两个提交构成 diff——功能提交（优惠券算总价）加修复提交（被写 PR 的对象），带一个 node:test 测试套件。

## 对话

- /pr 请为当前仓库 HEAD 提交（fix: coupon code matching is now case-insensitive）写 PR body，工作目录就在当前目录

  ````md
  两个运行都已完成 — 在修复前，新测试会失败 (150 !== 135)，在修复后会通过。以下是遵循该技能模板的 PR 正文：

  ```markdown
  ## Summary

  优惠券匹配器现在在比较前会将输入归一化为大写，因此 `save10` 可以获得与 `SAVE10` 相同的折扣：

  ```diff
   on(checkout)
     total = subtotal
  -  if coupon === 'SAVE10'
  +  normalizedCoupon = coupon is string ? coupon.toUpperCase() : coupon
  +  if normalizedCoupon === 'SAVE10'
       total = subtotal * 0.9
  ```

  非字符串优惠券保持不变（`null` / `undefined` 仍然不匹配）。

  ## Evidence

  - **修改前：** 新测试在父提交的 `cart.js` 上运行失败：

    ```text
    ✔ no coupon returns subtotal
    ✔ coupon SAVE10 applies 10% off
    ✖ coupon code is case-insensitive
      AssertionError: 150 !== 135
    ```

    **修改后：** HEAD 处的全部测试套件（`npm test`）：

    ```text
    ✔ no coupon returns subtotal
    ✔ coupon SAVE10 applies 10% off
    ✔ coupon code is case-insensitive
    ℹ tests 3 · pass 3 · fail 0
    ```

  ## Merge Danger

  **Door:** two-way

  通过 `git revert` 可以轻松回滚；没有数据或配置更改。

  **Blast Radius:** cart

  仅有 `calculateTotal` 的优惠券分支受到影响。实际影响：此前被拒绝的大写/小写输入（`save10`、`Save10`）现在可应用 10% 的折扣——这是预期的修复，但意味着以前无法使用的代码现在可以使用了。
  ```

  使用文件备注：
  - PR 正文针对 sandbox/ 中的 HEAD 提交 `0a74cc8`（无上游/远程，因此没有任何内容被推送或发布）。
  - 证据是基于执行的：「修改前」运行将新测试与临时目录下父提交的 `src/cart.js` 配对（150 !== 135 导致失败），「修改后」运行是在仓库中进行的 `npm test`（3/3 通过）。
  - 该仓库中没有 `GLOSSARY.md`，因此使用了代码自带的术语（cart, coupon, checkout, subtotal）。
  ````

## 总结

它管的就是「让 AI 写出的 PR 描述别人看得懂、敢合」这一件事：固定三段——Summary 用一张小图（diff、伪代码、调用树选最合适的）讲清改了什么，Evidence 摆出修改前失败、修改后通过的真实证据，Merge Danger 标注回滚难度和影响范围。没装的时候（示意），AI 写的 PR 描述通常是一段自然语言流水账，「改了什么」靠读代码猜、「能不能信」没有凭据；装了之后，评审者扫一眼三段就知道改动的形状、证据在哪、合并风险多大。

实际试用里最值钱的是 Evidence：子代理没有编造输出，而是真的把父提交的代码拿到临时目录跑了新测试，拿到 `150 !== 135` 的失败后才写进 PR——红转绿的证据链是真实跑出来的。局限也在这：这个格式的好证据依赖项目有能跑的测试或可截图的界面，纯文档类改动只能降级为文字说明；Summary 选哪种视图则全靠模型自己判断，仓库没有 `GLOSSARY.md` 时它会落回代码自带术语并注明，这点处理得自然。

产物：[sandbox/](sandbox/)
