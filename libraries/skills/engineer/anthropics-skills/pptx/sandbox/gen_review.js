const pptxgen = require("pptxgenjs");

// ---- Palette: Midnight Executive + coral accent ----
const NAVY = "1E2761";      // primary
const ICE = "CADCFC";       // secondary
const CORAL = "F96167";     // accent (used sparingly)
const BODY = "36454F";      // body text on light
const MUTED = "6B7686";     // captions
const TINT = "F1F5FB";      // card tint
const GRID = "D8DEE9";      // chart gridlines
const FONT = "Microsoft YaHei";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "产品技术团队";
pres.title = "2026 Q3 团队季度回顾";

// ============ Slide 1: 标题页 ============
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  // motif: translucent circles
  s.addShape(pres.ShapeType.ellipse, { x: 9.4, y: -1.9, w: 6.2, h: 6.2, fill: { color: ICE, transparency: 88 }, line: { type: "none" } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.7, y: 3.4, w: 2.3, h: 2.3, fill: { color: ICE, transparency: 82 }, line: { type: "none" } });
  s.addShape(pres.ShapeType.ellipse, { x: -1.3, y: 5.5, w: 3.4, h: 3.4, fill: { color: ICE, transparency: 90 }, line: { type: "none" } });

  s.addText("产品技术团队 · 2026 Q3", {
    x: 0.9, y: 2.3, w: 8.0, h: 0.45, margin: 0,
    fontFace: FONT, fontSize: 14, color: ICE, charSpacing: 4, align: "left",
  });
  s.addText("团队季度回顾", {
    x: 0.9, y: 2.8, w: 11.5, h: 1.15, margin: 0,
    fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF", align: "left",
  });
  s.addText("关键数据  ·  复盘  ·  下季度计划", {
    x: 0.9, y: 4.1, w: 9.0, h: 0.5, margin: 0,
    fontFace: FONT, fontSize: 16, color: ICE, align: "left",
  });
  s.addText("2026 年 10 月", {
    x: 0.9, y: 6.55, w: 4.0, h: 0.4, margin: 0,
    fontFace: FONT, fontSize: 12, color: ICE, align: "left",
  });

  s.addNotes("开场:回顾 2026 Q3 团队整体情况,先看关键数据,再讲 Q4 计划。");
}

// ============ Slide 2: 本季度关键数据 ============
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };

  s.addText("本季度关键数据", {
    x: 0.6, y: 0.45, w: 8.0, h: 0.75, margin: 0,
    fontFace: FONT, fontSize: 36, bold: true, color: NAVY, align: "left",
  });
  s.addText("2026 Q3 · 7—9 月", {
    x: 9.3, y: 0.68, w: 3.4, h: 0.4, margin: 0,
    fontFace: FONT, fontSize: 12, color: MUTED, align: "right",
  });

  // stat callouts
  const stats = [
    { x: 0.6, num: "86", numColor: NAVY, label: "交付需求（个）", delta: "环比 +18%" },
    { x: 4.85, num: "24", numColor: NAVY, label: "版本发布（次）", delta: "环比 +4 次" },
    { x: 9.1, num: "92%", numColor: CORAL, label: "OKR 完成率", delta: "目标 90%" },
  ];
  stats.forEach((st) => {
    s.addText(st.num, {
      x: st.x, y: 1.5, w: 3.6, h: 1.05, margin: 0,
      fontFace: FONT, fontSize: 60, bold: true, color: st.numColor, align: "left",
    });
    s.addText(st.label, {
      x: st.x, y: 2.62, w: 3.6, h: 0.4, margin: 0,
      fontFace: FONT, fontSize: 14, bold: true, color: BODY, align: "left",
    });
    s.addText(st.delta, {
      x: st.x, y: 3.04, w: 3.6, h: 0.35, margin: 0,
      fontFace: FONT, fontSize: 11, color: MUTED, align: "left",
    });
  });

  // chart: 月度需求吞吐
  s.addChart(pres.ChartType.bar, [
    { name: "需求吞吐", labels: ["7月", "8月", "9月"], values: [26, 29, 31] },
  ], {
    x: 0.6, y: 3.7, w: 6.3, h: 3.2,
    barDir: "col",
    barGapWidthPct: 60,
    chartColors: [NAVY],
    showTitle: true, title: "月度需求吞吐（个）",
    titleColor: BODY, titleFontSize: 13, titleFontFace: FONT,
    showValue: true, dataLabelPosition: "outEnd",
    dataLabelColor: NAVY, dataLabelFontSize: 11, dataLabelFontFace: FONT,
    catAxisLabelColor: MUTED, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT,
    catGridLine: { style: "none" },
    valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisLabelFontFace: FONT,
    valGridLine: { color: GRID, size: 1 },
    valAxisMinVal: 0, valAxisMaxVal: 35,
    showLegend: false,
  });

  // highlights card
  s.addShape(pres.ShapeType.roundRect, {
    x: 7.35, y: 3.7, w: 5.38, h: 3.2, rectRadius: 0.12,
    fill: { color: TINT }, line: { type: "none" },
  });
  s.addText("季度亮点", {
    x: 7.75, y: 4.0, w: 4.6, h: 0.45, margin: 0,
    fontFace: FONT, fontSize: 15, bold: true, color: NAVY, align: "left",
  });
  s.addText([
    { text: "线上 P0/P1 缺陷环比下降 32%", options: { bullet: true, breakLine: true } },
    { text: "需求按期交付率 95%", options: { bullet: true, breakLine: true } },
    { text: "新增自动化测试用例 120+", options: { bullet: true, breakLine: true } },
    { text: "3 个重点项目全部按计划上线", options: { bullet: true } },
  ], {
    x: 7.75, y: 4.5, w: 4.6, h: 2.2, margin: 0,
    fontFace: FONT, fontSize: 13, color: BODY, align: "left",
    paraSpaceAfter: 14, valign: "top",
  });

  s.addNotes("数据口径:需求按迭代交付口径统计;OKR 完成率为团队两级 OKR 加权平均。");
}

// ============ Slide 3: 下季度计划 ============
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };

  s.addText("下季度计划", {
    x: 0.6, y: 0.45, w: 8.0, h: 0.75, margin: 0,
    fontFace: FONT, fontSize: 36, bold: true, color: NAVY, align: "left",
  });
  s.addText("2026 Q4 · 10—12 月", {
    x: 9.3, y: 0.68, w: 3.4, h: 0.4, margin: 0,
    fontFace: FONT, fontSize: 12, color: MUTED, align: "right",
  });

  const cards = [
    { x: 0.6, n: "1", circle: CORAL, title: "稳定性专项", lines: ["目标可用性 99.95%", "P0 缺陷清零", "告警响应 SLA 15 分钟", "值班复盘机制落地"] },
    { x: 3.76, n: "2", circle: NAVY, title: "交付提效", lines: ["CI 耗时降低 50%", "需求前置时间 ≤ 3 天", "自动化测试覆盖 80%", "灰度发布流程标准化"] },
    { x: 6.92, n: "3", circle: NAVY, title: "会员体系上线", lines: ["11 月灰度发布", "12 月全量上线", "会员数据模型迁移", "配套增长数据看板"] },
    { x: 10.08, n: "4", circle: NAVY, title: "团队建设", lines: ["引入 2 名工程师", "双周技术分享", "新人导师制度", "季度 OKR 全员对齐"] },
  ];
  cards.forEach((c) => {
    s.addShape(pres.ShapeType.roundRect, {
      x: c.x, y: 1.7, w: 2.65, h: 3.7, rectRadius: 0.12,
      fill: { color: TINT }, line: { type: "none" },
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: c.x + 0.28, y: 2.0, w: 0.55, h: 0.55,
      fill: { color: c.circle }, line: { type: "none" },
    });
    s.addText(c.n, {
      x: c.x + 0.28, y: 2.0, w: 0.55, h: 0.55, margin: 0,
      fontFace: FONT, fontSize: 18, bold: true, color: "FFFFFF",
      align: "center", valign: "middle",
    });
    s.addText(c.title, {
      x: c.x + 0.28, y: 2.78, w: 2.3, h: 0.45, margin: 0,
      fontFace: FONT, fontSize: 15, bold: true, color: NAVY, align: "left",
    });
    s.addText(c.lines.map((t, i) => ({
      text: t, options: i < c.lines.length - 1 ? { breakLine: true } : {},
    })), {
      x: c.x + 0.28, y: 3.3, w: 2.15, h: 2.0, margin: 0,
      fontFace: FONT, fontSize: 12, color: BODY, align: "left",
      paraSpaceAfter: 12, valign: "top",
    });
  });

  s.addText("关键节点:目标对齐会 10-09 · 中期检查 11-20 · Q4 复盘会 2027-01-08", {
    x: 0.6, y: 5.85, w: 12.13, h: 0.4, margin: 0,
    fontFace: FONT, fontSize: 11, color: MUTED, align: "left",
  });

  s.addNotes("四条主线各有 Owner(会上口头指定),关键节点写进团队日历。");
}

pres.writeFile({ fileName: "2026-Q3-团队季度回顾.pptx" }).then((f) => console.log("written:", f));
