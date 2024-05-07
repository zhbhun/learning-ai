
## 技巧

- Start Simple：从简单开始
- The Instruction：使用指令
- Specificity：具体性
- Avoid Impreciseness：精确性
- To do or not to do?：做还是不做？

## 技术

- Zero-Shot：零样本提示
- Few-Shot：少样本提示
- Chain-of-Thought：链式思考（CoT）提示

  - Manual-CoT
  - Zero-Manual-CoT

  示例

  - Bad
  
    ```
    这组数中的奇数加起来是偶数：4、8、9、15、12、2、1。
    A：将所有奇数相加（9、15、1）得到25。答案为False。
    这组数中的奇数加起来是偶数：17、10、19、4、8、12、24。
    A：将所有奇数相加（17、19）得到36。答案为True。
    这组数中的奇数加起来是偶数：15、32、5、13、82、7、1。
    A：
    ---
    将所有奇数相加（15、5、13、7、1）得到41。答案为False。
    ```

  - Good

    ```
    这组数中的奇数加起来是偶数：4、8、9、15、12、2、1。
    A：将所有奇数相加（9、15、1）得到25。答案为False。
    这组数中的奇数加起来是偶数：15、32、5、13、82、7、1。
    A：
    ---
    将所有奇数相加（15、5、13、7、1）得到41。答案为False。
    ```

- Self-Consistency：自我一致性
- Generated Knowledge：生成知识提示
- Prompt Chaining：链式提示
- Tree of Thoughts (ToT)：思维树 (ToT)
- Retrieval Augmented Generation (RAG)：检索增强生成 (RAG)
- Automatic Reasoning and Tool-use (ART)：自动推理并使用工具 (ART)
- Automatic Prompt Engineer (APE)：自动提示工程师（APE）
- Active-Prompt
- Directional Stimulus Prompting：方向性刺激提示
- PAL (Program-Aided Language Models)：程序辅助语言模型
- ReAct：ReAct 框架
- Reflexion：自我反思（Reflexion）
- Multimodal CoT：多模态思维链提示方法

## 安全

### 对抗性提示

存在问题

- 提示注入
- 提示泄漏

解决方案

- 在指令中添加防御
- 参数化提示组件
- 引用和其他格式
- 对抗提示检测器

### 真实性

### 偏见

存在问题

LLM 模型有时会生成听起来连贯且令人信服但有时是虚构的回答。

解决方案

- 在上下文中提供基本事实（例如相关文章段落或维基百科条目），以减少模型生成虚构文本的可能性。
- 通过降低概率参数并指示模型在不知道答案时承认（例如，“我不知道”）来配置模型以生成更少样式的响应。
- 在提示中提供问题和答案的组合示例，其中可能知道和不知道的问题和答案。

## 应用

### 创造

- 写文章
- 写故事
- 写代码
- 写...

### 改写

- 翻译
- 润色

### 缩写

- 提取：提取信息里的某一段内容，比如从一大段文字中，找到关键内容，并分类。
- 解释：这个跟改写内容有点像，但这个更偏向于解释与总结。
- 总结：对一堆信息进行总结。

### 扩写
