# -*- coding: utf-8 -*-
"""Sprint 42 复盘 — Anthropic brand-styled 3-slide deck.

Brand (from brand-guidelines skill):
  Dark #141413 | Light #faf9f5 | Mid Gray #b0aea5 | Light Gray #e8e6dc
  Accent: Orange #d97757 | Blue #6a9bcc | Green #788c5d
Type: Headings Poppins (Arial fallback), Body Lora (Georgia fallback).
CJK runs additionally pin PingFang SC as the East-Asian typeface.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ---- brand tokens -----------------------------------------------------------
DARK    = "141413"
LIGHT   = "faf9f5"
MIDGRAY = "b0aea5"
LTGRAY  = "e8e6dc"
ORANGE  = "d97757"
BLUE    = "6a9bcc"
GREEN   = "788c5d"

HEAD_FONT = "Poppins"   # fallback Arial (viewer-side)
BODY_FONT = "Lora"      # fallback Georgia (viewer-side)
EA_FONT   = "PingFang SC"

SLIDE_W, SLIDE_H = Inches(13.333), Inches(7.5)

prs = Presentation()
prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
BLANK = prs.slide_layouts[6]


# ---- helpers ----------------------------------------------------------------
def set_run(run, text, size, color, font=BODY_FONT, bold=False, italic=False):
    run.text = text
    f = run.font
    f.size = Pt(size)
    f.bold = bold
    f.italic = italic
    f.name = font
    f.color.rgb = RGBColor.from_string(color)
    # pin an East-Asian typeface so Chinese glyphs render consistently
    rPr = run._r.get_or_add_rPr()
    ea = rPr.find(qn("a:ea"))
    if ea is None:
        ea = rPr.makeelement(qn("a:ea"), {})
        rPr.append(ea)
    ea.set("typeface", EA_FONT)
    return run


def add_textbox(slide, x, y, w, h, lines, anchor=MSO_ANCHOR.TOP,
                align=PP_ALIGN.LEFT):
    """lines: list of paragraphs; each paragraph is a list of run-spec dicts."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, runs in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = 1.15
        p.space_after = Pt(runs.get("space_after", 0) if isinstance(runs, dict) else 0)
        specs = runs["runs"] if isinstance(runs, dict) else runs
        for spec in specs:
            set_run(p.add_run(), **spec)
    return box


def add_rect(slide, x, y, w, h, color, rounded=False, radius=0.12):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    sp = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        try:
            sp.adjustments[0] = radius
        except Exception:
            pass
    sp.fill.solid()
    sp.fill.fore_color.rgb = RGBColor.from_string(color)
    sp.line.fill.background()
    sp.shadow.inherit = False
    return sp


def new_slide(bg):
    slide = prs.slides.add_slide(BLANK)
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = RGBColor.from_string(bg)
    return slide


def header_block(slide, kicker, title):
    add_textbox(slide, 0.9, 0.55, 11.5, 0.35,
                [[dict(text=kicker, size=12, color=ORANGE,
                       font=HEAD_FONT, bold=True)]])
    add_textbox(slide, 0.9, 0.92, 11.5, 0.7,
                [[dict(text=title, size=30, color=DARK,
                       font=HEAD_FONT, bold=True)]])
    add_rect(slide, 0.9, 1.72, 0.85, 0.055, ORANGE)


# ============================== SLIDE 1 — cover ==============================
s = new_slide(DARK)

# accent trio, top-left
add_rect(s, 0.9, 0.9, 0.22, 0.22, ORANGE)
add_rect(s, 1.24, 0.9, 0.22, 0.22, BLUE)
add_rect(s, 1.58, 0.9, 0.22, 0.22, GREEN)

add_textbox(s, 0.9, 2.55, 11.5, 1.4,
            [[dict(text="Sprint 42 复盘", size=54, color=LIGHT,
                   font=HEAD_FONT, bold=True)]])
add_rect(s, 0.95, 3.95, 1.4, 0.06, ORANGE)
add_textbox(s, 0.9, 4.3, 11.5, 0.5,
            [[dict(text="迭代周期：2026.10.26 – 11.06 · 平台研发团队",
                   size=18, color=MIDGRAY, font=BODY_FONT)]])
add_textbox(s, 0.9, 6.75, 11.5, 0.35,
            [[dict(text="RETROSPECTIVE · 2026-11-06", size=11, color=MIDGRAY,
                   font=HEAD_FONT, bold=True)]])

# ========================== SLIDE 2 — overview ===============================
s = new_slide(LIGHT)
header_block(s, "OVERVIEW", "本周期回顾")

stats = [
    ("34", "完成任务", ORANGE),
    ("92%", "计划完成率", BLUE),
    ("38 pts", "交付速率", GREEN),
    ("2", "线上缺陷", DARK),
]
tile_w, gap, x0, tile_y, tile_h = 2.7025, 0.24, 0.9, 2.05, 1.35
for i, (value, label, color) in enumerate(stats):
    x = x0 + i * (tile_w + gap)
    add_rect(s, x, tile_y, tile_w, tile_h, LTGRAY, rounded=True, radius=0.10)
    add_textbox(s, x + 0.25, tile_y + 0.18, tile_w - 0.5, 0.6,
                [[dict(text=value, size=30, color=color,
                       font=HEAD_FONT, bold=True)]])
    add_textbox(s, x + 0.25, tile_y + 0.88, tile_w - 0.5, 0.35,
                [[dict(text=label, size=12, color=DARK, font=BODY_FONT)]])

cards = [
    (0.9, GREEN, "做得好", [
        "支付网关重构按期交付，零回滚",
        "缺陷收敛，回归测试通过率 98%",
        "站会精简到 15 分钟，信息同步更高效",
    ]),
    (6.81, ORANGE, "待改进", [
        "需求中途变更频繁，两次任务返工",
        "联调环境不稳定，累计阻塞 1.5 天",
        "代码评审周期偏长，平均 1.8 天",
    ]),
]
card_y, card_h, card_w = 3.75, 3.05, 5.62
for x, color, title, items in cards:
    add_rect(s, x, card_y, card_w, card_h, LTGRAY, rounded=True, radius=0.06)
    add_textbox(s, x + 0.35, card_y + 0.28, card_w - 0.7, 0.4,
                [[dict(text=title, size=17, color=color,
                       font=HEAD_FONT, bold=True)]])
    lines = []
    for it in items:
        lines.append([dict(text="•  ", size=13, color=color, font=BODY_FONT, bold=True),
                      dict(text=it, size=13, color=DARK, font=BODY_FONT)])
        lines[-1] = dict(runs=lines[-1], space_after=10)
    add_textbox(s, x + 0.35, card_y + 0.85, card_w - 0.7, card_h - 1.1, lines)

# ========================= SLIDE 3 — action items ============================
s = new_slide(LIGHT)
header_block(s, "ACTION ITEMS", "行动项与下一步")

actions = [
    (ORANGE, "冻结 Sprint 内需求范围，变更需集体评审",
     "产品 · 本周五前"),
    (BLUE, "搭建独立联调环境，纳入每日巡检",
     "李工 · 下周三前"),
    (GREEN, "评审拆小批量，目标周期缩短至 1 天内",
     "架构组 · 下周五前"),
]
row_y, row_gap = 2.15, 1.1
for i, (color, text, meta) in enumerate(actions):
    y = row_y + i * row_gap
    add_rect(s, 0.95, y + 0.16, 0.16, 0.16, color)
    add_textbox(s, 1.35, y, 7.4, 0.5,
                [[dict(text=text, size=16, color=DARK,
                       font=BODY_FONT, bold=True)]])
    add_textbox(s, 9.0, y + 0.04, 3.4, 0.4,
                [[dict(text=meta, size=13, color=MIDGRAY, font=BODY_FONT)]])
    if i < len(actions) - 1:
        add_rect(s, 1.35, y + 0.72, 11.05, 0.012, LTGRAY)

# bottom dark band — next-sprint goal
add_rect(s, 0, 6.25, 13.333, 1.25, DARK)
add_rect(s, 0.95, 6.78, 0.16, 0.16, ORANGE)
add_textbox(s, 1.35, 6.63, 11.0, 0.5,
            [[dict(text="下一目标：", size=15, color=MIDGRAY, font=BODY_FONT),
              dict(text="Sprint 43 完成订单中心服务化拆分",
                   size=15, color=LIGHT, font=BODY_FONT, bold=True)]])

out = "/Users/zhanghuabin/Projects/learning/ai/sandbox/Sprint-42-复盘.pptx"
prs.save(out)
print("saved:", out)

