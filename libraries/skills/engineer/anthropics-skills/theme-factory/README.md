# theme-factory

> 为 artifact 套用主题的工具包，适用于幻灯片、文档、报告、HTML 落地页等，内置 10 套预设主题（配色 + 字体），也支持即时生成新主题

## 场景

让 agent 给一个团队协作产品的落地页套一套专业主题，页面此前完全没有任何样式。

## 对话

- /theme-factory 请给我的产品落地页 sandbox/index.html 应用一个合适的主题，让它看起来更专业。

  ```md
  完成。要点如下：

  **前提说明**：项目里原本不存在 `sandbox/index.html`（全项目也未搜到该文件），因此按请求内容在 `sandbox/index.html` 新建了一个产品落地页示例，并应用了主题。若你已有现成页面，告诉我路径即可改为在原页面上套用主题。

  **主题选择**：从 theme-factory 的 10 个预设主题中选了 **Ocean Depths**（深海蓝），理由是主题规范中明确定位为 "Professional and calming"、"trust-building content"，与"让落地页更专业"的目标最匹配。备选是 Modern Minimalist（灰阶极简），如需换成它或其他 8 个主题（Sunset Boulevard、Tech Innovation、Midnight Galaxy 等）可直接说。

  **应用内容**（严格按 `themes/ocean-depths.md` 规范）：
  - 配色全部来自主题四色板：Deep Navy `#1a2332`（页头/Hero/CTA 区背景）、Teal `#2d8b8b`（强调色、按钮、功能卡顶边）、Seafoam `#a8dadc`（导航/次级文本、引言带背景）、Cream `#f1faee`（正文背景）
  - 字体按规范用 DejaVu Sans Bold 标题 + DejaVu Sans 正文，中文回退到 PingFang SC / Microsoft YaHei
  - 落地页结构：导航栏 → Hero（主 CTA）→ 三项功能卡片 → 客户引言 → 底部 CTA → 页脚，均为占位文案，可直接替换成真实产品内容

  skill 里的 `theme-showcase.pdf` 预览流程适用于交互式会话；本会话非交互，故由我直接选型并应用。
  ```

产物见 [sandbox/index.html](sandbox/index.html)：整页只用了主题四色板定义的 CSS 变量，页头、Hero、功能卡、引言带、页脚均按 Ocean Depths 的角色分配颜色，样式顶部注释直接标明主题名与四色值。

## 总结

theme-factory 相当于一套现成的「视觉装修方案库」：十套主题各有一份规范文件，写明四个颜色的色值、各自用在哪、标题和正文用什么字体。没有它，让 agent「把页面弄好看」全凭模型自由发挥，每次配色都不一样，也谈不上体系；装了它，agent 会读规范、按角色套色，产出稳定且成体系的风格。请求里不用指定主题，agent 会根据内容性质自己挑——本次它就从 10 套里选了定位「专业、建立信任」的深海蓝。

两点实际体验：其一，技能流程设计了「展示主题清单 PDF → 问用户 → 等确认」的交互环节，非交互运行时 agent 自行选型并说明理由、留出备选，是合理降级；其二，本次测试中 agent 没找到预置页面，转而自己建了一页再套主题，可见主题规范对它是硬约束（产物严格只用四色板），而对「目标文件是什么」这类场景信息则比较宽容——给页面套主题时最好把文件路径说清楚。
