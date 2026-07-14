# 用户提问

在关键决策点向用户结构化提问。

## AskUserQuestion

仅当你卡在一个确实应由用户决定的决策点时才使用此工具——即你无法从请求、代码或合理默认值中自行解决的问题。

要点:

- 用户始终可以选择 "Other" 进行自定义输入。
- `multiSelect: true` 允许多选。
- 推荐某选项时,将其放在第一位,并在 label 后追加 "(Recommended)"。

**计划模式注意**:进入计划模式请用 `EnterPlanMode`(不是此工具)。进入计划模式之后,可用此工具澄清需求或在多个方案之间选择。不要用此工具询问"我的计划行不行",因为在 `ExitPlanMode` 之前用户看不到计划内容。

**预览功能**:当需要呈现视觉上需要比较的具体产物时,使用 `preview` 字段(如 UI 布局的 ASCII 草图、代码片段、图表变体、配置示例)。`preview` 以等宽框渲染 markdown,多行文本支持换行。只要任一选项带有 `preview`,UI 就会切换为左右布局。简单的偏好类问题不要使用 `preview`。

**参数**:`questions`(1-4 个;每个含 `question` / `header` / `options`(2-4 个) / `multiSelect`)。
