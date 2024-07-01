## 词库

- https://promptbase.com/
- https://publicprompts.art/
- https://prompthero.com/

## 语法

### 正向提示词

#### 画质和风格

- 画质

  - 8K
  - masterpiece: 杰作
  - highly detailed: 画面精细
  - highest quality: 最高画质

- 类型

  - photography: 摄影
  - painting: 绘画
  - illustration: 插图
  - sculpture: 雕塑
  - doodle: 涂鸦
  - manuscript: 手稿
  - 3D: 三维
  - cartoon: 卡通
  - sketch: 素描
  - print: 版画

- 风格

  - realistic: 写实主义
  - 古典主义: classicism
  - 抽象主义: abstraction
  - 地区：在提示词中加入国家名称可以有效引导作品的呈现。例如，加入中国作为提示词，人物可能会穿着中国的传统服装，作品中可能会出现亭台楼阁等具有中国特色的元素。

    - chinese streets
    - ...

  - 作家：通过加入著名画家的名字，如毕加索、达芬奇、梵高等，作品将带有鲜明的个人特色。

    - a paintingby Van Gogh：梵高的画风
    - ...

  - 软件：通过输入特定的设计软件名称，也可以引导作品的艺术风格倾向。

    - Blender: 三维软件 Blender
    - Octane: Octane渲染器
    - redshift: redshift 渲染器
    - unreal engine 5: 虚幻引擎5

  - 游戏：输入游戏名称也能带来该游戏的风格

    - Age of empire: 帝国时代
    - ...

#### 画面内容

- 主体

  - 人物：描述身份、样貌、表情神态、着装、姿势动作等。

    - 发型
    
      - bob cut: 波波头
      - straight hair: 直发
      - ponytail: 马尾辫
      - pigtail braids: 双麻花辫
      - curly hair: 卷发
      - shoulder-length hair: 披肩发
      - low bun: 低丸子头
      - short hair: 短发
      - high bun: 高丸子头
      - shoulder-length hair: 披肩发

    - 衣服

      - blouse: 女装衬衫
      - leggings: 紧身裤
      - dress: 连衣裙
      - pajamas: 睡衣
      - undershirt: 背心
      - jeans: 牛仔裤
      - sunglasses: 太阳镜  
      - capris: 七分裤
      - high heels: 高跟鞋
      - panty hose: 连裤袜

    - 身份
    - 表情
    - 神态
    - 姿势
    - 皮肤
    - 光泽

  - 实物：

    - 名称
    - 造型
    - 颜色
    - 材质：玻璃、金属、陶瓷、玉石等。

  - 风景：也可以作为背景

- 环境：灰暗的街道、下雨、早晨、夜晚、花园、树林、水中

#### 画面表现

- 画面构图: 中心位置或使用黄金分割构
- 拍摄视角

  - full length shot: 全身
  - portrait: 肖像
  - side: 侧视图
  - look down: 俯视
  - look up: 仰视
  - POV: 第一人称拍摄
  - look at viewer: 面向观众
  - face away from the camera: 背对镜头
  - profile picture: 半身像
  - underwater shooting: 水下拍摄
  - shot with a fisheye lens: 用鱼眼镜头拍摄

- 镜头焦距: 景深、
  
  - DSLR: 单反
  - telephoto lens: 长焦
  - bokeh: 背景虚化

- 色彩: 明暗、饱和度、对比度、亮调与暗调、单一背景

  - 夜间

- 光影

  - dappled shadows: 斑驳的阴影

- 设备: 佳能、尼康、GoPro、iPhone、蔡司

  - 5D Mark IV

- 景别：绘画中一个重要的概念，它涉及主体与背景之间的远近关系。

  - close-up: 特写, 近景
  - long shot: 远景, 远距离镜头
  - extreme close-up: 特写, 极近
  - wide-angle lens: 广角镜头
  - medium shot: 中景, 中距离镜头
  - cowboy shot: 七分身镜头
  - satellite imagery: 卫星图像
  - panorama: 全景
  - aerial view: 鸟瞰图
  - macro photography: 微距摄影

#### 特殊功能

- LoRA：`<lora:模型名称:权重>`
- Hypernetwork：`<hypernetwofk:模型名称:权重>`
- Embeddings格式：输入“模型名称”就启用

#### 权重与符号

- 提示词顺序：提示词越靠前，其权重就越大，就越能影响生成的图像。
- 括号的作用

  - 默认情况下关键词的权重系数为 1。
  - 将关键词用小括号括起来即`(关键词)`这种格式，代表强调这个关键词。加一层括号，关键词的权重为原始权重的 1.1 倍，即关键词权重 × 1.1；两层括号，关键词的权重为原始权重的 1.1 × 1.1 倍；N 层括号，关键词的权重为原始权重乘以 1.1 的 N 次方。
  - 将关键词用方括号括起来即使用`[关键词]`这种格式，可以降低关键词的权重。每套一层方括号，关键词的权重 × 0.95，即减少 0.05 倍。因此 N 层方括号，关键词的权重为原始权重乘以 0.95 的 N 次方。
  - 还可以使用`(关键词:N)`的格式来直接指定关键词的权重，其中 N 是一个数字，表示关键词的权重为原始权重的倍数。例如，`(关键词:1.5)`表示关键词的权重为原始权重的1.5倍。

- `a AND b`：这个格式实现 a 和 b 关键词的混合（就是逻辑“与”运算），香蕉和西瓜的混合体。
- `a | b`: 表示提示词 a 和提示词 b 交替计算（就是逻辑“或”运算），可以理解为提示词 a 采样 1 步，提示词 b 再采样 1 步，然后提示词 a 再采样，提示词b再采样……依次轮流采样，最后的效果也是混合。
- BREAK：

  - [进化你的stable diffusion提示词 一些可能你尚未了解的提示词技巧](https://zhuanlan.zhihu.com/p/638421908)
  - [Stable Diffusion 提示词中的“BREAK”有什么用？](https://medium.com/@h.zuomin/%E5%9C%A8%E8%89%BA%E6%9C%AF%E5%92%8Cai%E7%94%9F%E6%88%90%E5%9B%BE%E5%83%8F%E7%9A%84%E4%B8%96%E7%95%8C%E4%B8%AD-%E6%8F%90%E7%A4%BA%E8%AF%8D-prompt-%E8%B5%B7%E7%9D%80%E8%87%B3%E5%85%B3%E9%87%8D%E8%A6%81%E7%9A%84%E4%BD%9C%E7%94%A8-%E7%89%B9%E5%88%AB%E6%98%AF%E5%9C%A8%E4%BD%BF%E7%94%A8stable-diffusion%E7%AD%89%E6%A8%A1%E5%9E%8B%E6%97%B6-%E6%8F%90%E7%A4%BA%E8%AF%8D%E7%9A%84%E9%80%89%E6%8B%A9%E5%92%8C%E6%8E%92%E5%88%97%E6%96%B9%E5%BC%8F%E5%8F%AF%E4%BB%A5%E6%9E%81%E5%A4%A7%E5%9C%B0%E5%BD%B1%E5%93%8D%E7%94%9F%E6%88%90%E5%9B%BE%E5%83%8F%E7%9A%84%E8%B4%A8%E9%87%8F%E5%92%8C%E7%89%B9%E7%82%B9-39c9dca20f3a)

### 反向提示词

类型和功能

- 提升质量：

  - worstquality: 最差画质
  - low quality: 低画质

- 排除物体
- 控制风格

  - 在反向提示词中加入三维、照片和写实等词，生成的图像就倾向于手绘风格

- 避免错误

  - 在反向提示词中加入三维、照片和写实等词，生成的图像就倾向于手绘风格。在反向提示词中加入三维、照片和写实等词，生成的图像就倾向于手绘风格。

- 避免色情、暴力和版权等问题：“nsfw”（不适宜工作场所）、naked（裸体）、violence（暴力）、terror（恐怖）

---

通用模板

- 通用的提示词：worst quality, low quality, lowres, error, cropped, jpeg artifacts, out of frame, watermark, signature.

  ps: 最差画质，低画质，低分辨率，错误，裁剪，jpeg伪影，超出画面，水印，签名。

- 人物肖像的负面提示词: deformed, ugly, mutilated, disfigured, text, extralimbs, face cut, head cut, extra fingers, extra arms,poorly drawn face, mutation, bad proportions, cropped head, malformed limbs, mutated hands,fused fingers, long neck.

  ps: 畸形的，丑陋的，残缺的，毁容的，文字，多余的四肢，脸部被切割，头部被切割，多余的手指，多余的手臂，绘制不佳的脸，突变，比例不好，头部被裁剪，四肢畸形，变异的手，手指粘连，长脖子。

- 照片写实图像的负面提示词：illustration, painting, drawing, art, sketch.

### 微调模型提示词

- EasyNegative
