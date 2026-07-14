# TodoWrite

轻量级会话任务清单。

## TodoWrite

为当前会话创建和更新任务列表,列表会作为你的工作计划渲染给用户。

- 每个 todo 含三个字段:content(任务内容,必填)、status('pending' | 'in_progress' | 'completed')、activeForm(进行中显示的现在时标签)。
- 每次调用都要发送完整列表;新列表会替换上一次的列表。
- 同一时刻只保持一项 in_progress,完成一项后立即标 completed,再开始下一项。

参数:todos(数组,每项含 content/activeForm 必填、status)。
