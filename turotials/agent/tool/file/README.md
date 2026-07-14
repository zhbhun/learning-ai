# 文件

本地文件的读取、写入与编辑。

## Read

读取本地文件系统中的文件。

- `file_path` 必须是绝对路径。
- 默认最多读取 2000 行。
- 当你已知只需文件的某一部分时,只读那一部分;这对大文件尤其重要。
- 结果以 `cat -n` 格式返回,行号从 1 开始。
- 支持读取图片(PNG、JPG 等)并以视觉方式呈现。
- PDF 通过 `pages` 参数读取(例如 `"1-5"`),每次最多 20 页;文件超过 10 页时必须使用 `pages`。
- Jupyter notebook(`.ipynb`)以单元格加输出的形式读取。
- 读取目录、缺失文件或空文件会返回错误。
- 不要重读刚刚编辑过的文件来验证——Edit/Write 失败时会报错,且 harness 会自动为你跟踪文件状态。

参数:`file_path`(必填)、`offset`、`limit`、`pages`。

## Write

将文件写入本地文件系统;若文件已存在则覆盖。

何时使用:

- 创建新文件。
- 完整替换一个你已经 Read 过的文件。

注意:覆盖一个未曾 Read 过的现有文件会失败。如需部分改动,请改用 Edit。

参数:`file_path`(必填)、`content`(必填)。

## Edit

在文件中执行精确的字符串替换。

- 编辑前,你必须在本对话中用 Read 读取过该文件,否则调用失败。
- `old_string` 必须精确匹配文件内容(包括缩进)且保持唯一,否则编辑失败。匹配前请先剥掉 Read 输出的行前缀(行号 + tab)。
- 设置 `replace_all: true` 可替换所有匹配项,而非仅替换第一处。

参数:`file_path`(必填)、`old_string`(必填)、`new_string`(必填)、`replace_all`。

## NotebookEdit

对 Jupyter notebook(`.ipynb`)的单个单元格执行替换、插入或删除。

- 编辑前必须用 Read 工具读取过该 notebook,否则调用失败。
- `notebook_path` 必须是绝对路径。
- `cell_id` 对应 Read 输出中 `<cell id="...">` 显示的 id 属性;在 `replace` 和 `delete` 模式下必填。
- `edit_mode` 默认为 `replace`:
  - `replace`:替换指定单元格的内容。
  - `insert`:在给定 `cell_id` 的单元格之后插入新单元格(省略 `cell_id` 则插入到开头);此模式下 `cell_type` 必填。
  - `delete`:删除指定单元格。

参数:`notebook_path`(必填)、`new_source`(必填)、`cell_id`、`edit_mode`(`replace`/`insert`/`delete`,默认 `replace`)、`cell_type`(`code`/`markdown`,`insert` 时必填)。
