# -*- coding: utf-8 -*-
"""2026 Q1 部门预算表:按月分列,公式计算小计与总计。"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = "/Users/zhanghuabin/Projects/learning/ai/libraries/skills/engineer/anthropics-skills/xlsx/sandbox/2026Q1部门预算表.xlsx"

FONT = "Arial"
blue = Font(name=FONT, size=11, color="0000FF")          # 蓝色 = 硬编码输入
black = Font(name=FONT, size=11, color="000000")          # 黑色 = 公式
bold_black = Font(name=FONT, size=11, bold=True, color="000000")
title = Font(name=FONT, size=14, bold=True, color="000000")
header_fill = PatternFill("solid", fgColor="D9D9D9")
total_fill = PatternFill("solid", fgColor="F2F2F2")
input_fill = PatternFill("solid", fgColor="FFFF00")       # 黄色 = 用户可填写的假设
thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
center = Alignment(horizontal="center", vertical="center")
left = Alignment(horizontal="left", vertical="center")
money = '"¥"#,##0'

wb = Workbook()
ws = wb.active
ws.title = "部门预算"

# 标题
ws["A1"] = "2026年第一季度部门预算(单位:元)"
ws["A1"].font = title
ws.merge_cells("A1:E1")
ws["A1"].alignment = center

# 表头(第2行)
headers = ["费用项", "1月", "2月", "3月", "季度小计"]
for c, h in enumerate(headers, start=1):
    cell = ws.cell(row=2, column=c, value=h)
    cell.font = bold_black
    cell.fill = header_fill
    cell.alignment = center
    cell.border = border

# 输入数据(蓝色+黄色底=可编辑假设;数字为示例,请按实际预算修改)
items = [
    ("人员工资", [80000, 80000, 80000]),
    ("房租",     [20000, 20000, 20000]),
    ("差旅",     [12000,  8000, 15000]),
    ("软件订阅", [ 3000,  3000,  3000]),
]

first_row = 3
for i, (name, vals) in enumerate(items):
    r = first_row + i
    name_cell = ws.cell(row=r, column=1, value=name)
    name_cell.font = bold_black
    name_cell.alignment = left
    name_cell.border = border
    for c, v in enumerate(vals, start=2):
        cell = ws.cell(row=r, column=c, value=v)
        cell.font = blue
        cell.fill = input_fill
        cell.number_format = money
        cell.alignment = center
        cell.border = border
    # 每项小计:E 列 = 三个月之和(公式)
    sub = ws.cell(row=r, column=5, value=f"=SUM(B{r}:D{r})")
    sub.font = black
    sub.number_format = money
    sub.alignment = center
    sub.border = border

# 每月总计(第7行):B7:D7 各列求和,E7 为季度总计
total_row = first_row + len(items)
label = ws.cell(row=total_row, column=1, value="每月总计")
label.font = bold_black
label.fill = total_fill
label.alignment = left
label.border = border
for c in range(2, 6):
    col = get_column_letter(c)
    cell = ws.cell(row=total_row, column=c,
                   value=f"=SUM({col}{first_row}:{col}{total_row - 1})")
    cell.font = bold_black
    cell.fill = total_fill
    cell.number_format = money
    cell.alignment = center
    cell.border = border

# 说明(阅读者可见:标注假设与可编辑单元格)
note_row = total_row + 2
note = ws.cell(row=note_row, column=1,
               value="说明:黄色底、蓝色字的单元格为预算输入(示例数字,可直接修改);"
                     "季度小计、每月总计与季度总计均为 SUM 公式,改动输入后自动重算。")
ws.merge_cells(start_row=note_row, start_column=1, end_row=note_row, end_column=5)
note.font = Font(name=FONT, size=10, italic=True, color="595959")
note.alignment = left

# 列宽
ws.column_dimensions["A"].width = 16
for col in "BCDE":
    ws.column_dimensions[col].width = 14

wb.save(OUT)
print("saved:", OUT)
