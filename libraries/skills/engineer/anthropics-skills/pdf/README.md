# pdf

> 处理 PDF 文件的万能技能（可自动、仅手动）：读取或提取文本与表格、合并、拆分、旋转、加水印、创建新 PDF、填写表单、加解密、提取图片，以及对扫描件做 OCR。只要提到 .pdf 文件或要产出 PDF，就用它。

## 场景

我手上有一份 Workshop 报名表 PDF，它是纯绘制出来的（没有可填写的表单字段），要填五个文本项并勾选一个复选框。

## 对话

- /pdf 帮我填一下 libraries/skills/engineer/anthropics-skills/pdf/sandbox/workshop-signup.pdf 这份报名表：Full Name 填 Zhang Bin，Email 填 zhangbin@example.com，Company / School 填 Hangzhou No.2 High School，Phone 填 13857001234，Experience (years) 填 3，下面两个复选框只勾「I will attend the hands-on lab」，酒店那个不用勾。填好的文件保存为同目录下的 workshop-signup-filled.pdf。

  ```md
  填表完成，文件已保存为 `sandbox/workshop-signup-filled.pdf`。

  按 pdf skill 的流程执行：
  1. 检测到该 PDF 没有可填写的表单字段（AcroForm），走注解方式
  2. 用 `extract_form_structure.py` 提取出标签、横线和复选框的精确 PDF 坐标（Approach A，结构提取，无需目测估算）
  3. 构建 fields.json 并通过 `check_bounding_boxes.py` 校验，再用 `fill_pdf_form_with_annotations.py` 写入 6 条注解
  4. 转图验证：5 个文本项均落在各自横线上方、与标签对齐，「I will attend the hands-on lab」复选框已打 X，「I need a hotel booking」保持空白，无错位或重叠

  填写内容：Full Name: Zhang Bin / Email: zhangbin@example.com / Company / School: Hangzhou No.2 High School / Phone: 13857001234 / Experience (years): 3，仅勾选动手实验场次。原表 workshop-signup.pdf 未改动。
  ```

## 总结

这是 Anthropic 官方的 PDF 处理技能，像一个装齐了工具的 PDF 工作台：合并拆分、提取文字表格、从零生成 PDF、加密、OCR 这些常规活儿，SKILL.md 里都备好了现成代码，照抄就能跑。

这次试用的是它最有分量的一条链路——填表。很多 PDF 表单（尤其打印后扫描、或程序画出来的）根本没有可填写的字段，光标点上去什么都不会出现。这个技能先跑脚本判断表单有没有字段：有就走字段写入；没有（本次场景）就先提取表单结构拿到每条标签、横线、复选框的精确坐标，构造坐标清单并校验重叠，再以文本注解的方式把内容「写」到对应位置，最后转成图片逐项核对。整个过程只靠一轮对话，6 处内容全部落位准确，原表毫发无损。

实际用下来唯一的磕绊：文档里给的个别命令有笔误（脚本名少了 .py）、临时输出目录需要自己建，agent 遇到报错都自己纠正了，没有影响结果。另外「把 PDF 转图片」这一步依赖 pdf2image + poppler，本机环境需预装。填写成品见 sandbox/workshop-signup-filled.pdf，可与同目录的原表对照查看。
