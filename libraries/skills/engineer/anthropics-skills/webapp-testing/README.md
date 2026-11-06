# webapp-testing

> 用 Playwright 与本地 Web 应用交互并测试的工具箱，支持验证前端功能、调试 UI 行为、截取浏览器截图、查看浏览器日志。

## 场景

一个全靠 JS 渲染的待办小页面，让 agent 起服务、真实点一遍：添加两条待办、勾掉一条、核对剩余计数和控制台报错。

## 对话

- 我的待办小应用在 learning/ai 仓库的 libraries/skills/engineer/anthropics-skills/webapp-testing/sandbox 下,server.py 起服务(端口 8931),页面全靠 JS 渲染。帮我把它跑起来实际测一遍:添加两条待办、点选其中一条完成,确认剩余计数是否正确更新,再看看浏览器控制台有没有报错。Python 环境用 sandbox 同目录的 .venv。

  ```md
  测试完成，应用功能正常，全部符合预期。

  **测试过程**：用技能自带的 `with_server.py` 拉起 `server.py`（端口 8931），Playwright headless Chromium 按「先侦察后操作」模式跑完整个流程，结束后服务器已自动停止。测试脚本在 `/tmp/todo_mini_test.py`，截图在 `/tmp/todo_mini_result.png`。

  **结果**：

  1. **添加两条待办** — "Buy milk" 和 "Write report" 均成功加入列表，计数显示 `2 item(s) left`，正确。
  2. **点选第一条完成** — "Buy milk" 的 `li` 拿到 `done` class，截图里可见删除线灰化样式；第二条未受影响。
  3. **剩余计数** — 点击后立即更新为 `1 item(s) left`，正确（2 条减 1 条已完成）。
  4. **控制台** — 无任何 error / pageerror，只有 4 条预期日志：`Todo Mini loaded`、两条 `todo added:`、一条 `todo toggled: 0`。

  **结论**：`sandbox/app/index.html` 的待办应用工作正常，未发现 bug。

  一个与被测应用无关的小插曲：第一次直接把 `/tmp/todo_mini_test.py` 作为可执行文件传给 `with_server.py` 报 `PermissionError`（macOS /tmp 挂载 noexec），改为 `.venv/bin/python /tmp/todo_mini_test.py` 显式用解释器运行即可。
  ```

## 总结

这个技能教 agent 用 Playwright 测试本地 web 应用：SKILL.md 很短，核心是一棵决策树——静态 HTML 直接读选择器，动态页面先用自带脚本起服务、等页面加载完再侦察 DOM、然后才动手操作——外加一个自动起停服务器的辅助脚本，让 agent 不用自己管服务进程。

没装时：agent 只能读源码推断前端行为，JS 有没有跑对、点击之后状态对不对，全靠猜。（示意）
装了之后：agent 写十几行 Python 真实打开页面，点按钮、填表单、读计数，截图和 console 日志都是真实运行结果——本次试用四项检查（添加、勾选、计数、控制台）全部有据，从派发到出结论不到两分钟。

局限：需要预装 playwright 包和浏览器内核；技能只提供方法不含断言框架，检查逻辑要 agent 自己写。
