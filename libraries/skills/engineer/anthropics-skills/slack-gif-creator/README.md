# slack-gif-creator

> 为 Slack 优化的动图制作知识与工具集，提供规格约束、校验工具和动画概念。

## 场景

用户要一个「撒彩纸庆祝」主题的 Slack emoji 动图。工作目录是空沙箱（下文写作 `sandbox/`，派发时只给了仓库内一个叫 sandbox 的位置），没有预置任何材料——子代理自行解读位置、建目录、写动画脚本。子代理把 sandbox 目录建在了仓库根下，报告收尾时产物已挪入本目录的 `sandbox/`，路径按此书写。

## 对话

- /slack-gif-creator 帮我做一个 Slack emoji 动图，主题是撒彩纸庆祝，GIF 保存到 sandbox 目录下

  ```md
  动画四帧目检效果良好：彩纸向内汇聚 → 中心金星爆开 → 彩纸四散下落 → 淡出回到循环起点。任务完成。

  **产出文件**

  - GIF：`sandbox/confetti-celebration.gif`（28.9 KB）
  - 生成脚本：`sandbox/make_confetti_gif.py`
  - 预览图（第 1/5/7/10 帧）：`sandbox/preview.png`

  **动画设计**（128x128 emoji，12 帧 @10fps，约 1.2 秒，无限循环）

  - 深紫渐变背景衬托彩纸，7 色彩纸混合三种形状（旋转彩条、圆点、五角星），共 30 个粒子
  - 前 2 帧：彩纸环向中心螺旋汇聚，光晕膨胀蓄力
  - 第 2 帧起：中心金星以 back_out 过冲弹出，彩纸四散飞出并受重力下落，伴随闪烁十字星光
  - 末 3 帧整体淡出，旋转总量取 2π 整数倍，保证循环首尾衔接无缝

  **Slack 校验**：skill 自带 `validate_gif` 结果为 `SLACK_READY`——128x128 最优尺寸、48 色、12 帧、1.2 秒，可直接作为 Slack emoji 上传。
  ```

## 依赖

无被依赖技能，但需要 Python 包：`pip install pillow imageio numpy`（技能自带 requirements.txt）。三者缺一 GIFBuilder 就跑不起来——本次试用环境缺 imageio，主会话先行装好；缺了它，流程在「组帧保存 GIF」这一步直接报 ModuleNotFoundError。

## 总结

这个技能解决的问题是：Slack 对动图有一堆硬规格（emoji 要 128x128、低于 3 秒、文件要小），自己从零写 PIL 代码很容易做出「能播但传不上去」的东西。装了这个技能，agent 拿到的不只是规格说明，还有一套现成工具——GIFBuilder 负责组帧、压色、按 emoji 模式自动降帧缩尺寸，`validate_gif` 生成后立即校验并给出 `SLACK_READY` 这样的明确结论，缓动函数库让弹跳、过冲这些动效不用手写数学。实测从一句「撒彩纸庆祝」到产出 28.9 KB、校验通过的成品 GIF，全程约 4 分钟，无需任何人工介入。局限也明显：环境必须预装三个 pip 包；画面全靠 agent 用 PIL 基元手写绘制逻辑，技能只给「怎么画好看」的指导而不给素材，成片观感随 agent 的绘制水平浮动——本次产出的彩纸爆开动画在 128x128 下观感完整，但复杂场景（人物、文字特效）就会吃力。
