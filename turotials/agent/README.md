- [Agentic Design Patterns](https://adp.xindoo.xyz/)

## 模式

### ReAct

旨在在将推理和行动深度融合，形成思考到观察的闭环

- 优点：通过强制模型依赖外部真实信息，大幅减少错误输出
- 缺点：推理质量依赖外部工具 API 的稳定性和可靠性
- 场景：开发领域问答、交互决策、软件工程自动化
- 原理：

  ReAct 原理很简单，没有 ReAct 之前，Reasoning 和 Act 是分割开来的。

  ```mermaid
  flowchart LR
      subgraph reason["Reason Only\n(e.g. Chain-of-thought)"]
          LM1(["LM"]) -->|Reasoning Traces| LM1
      end

      subgraph act["Act Only\n(e.g. SayCan, WebGPT)"]
          LM2(["LM"]) -->|Actions| Env2(["Env"])
          Env2 -->|Observations| LM2
      end

      subgraph react["ReAct"]
          RT(["Reasoning\nTraces"]) --> LM3(["LM"])
          LM3 -->|Actions| Env3(["Env"])
          Env3 -->|Observations| LM3
          LM3 --> RT
      end

      reason ~~~ act
      act -->|"⟹"| react
  ```


  举个例子，你让孩子帮忙去厨房里拿一个瓶胡椒粉，告诉 ta 一步步来（COT 提示词策略）：

  1. 先看看台面上有没有；
  2. 再拉开灶台底下抽屉里看看；
  3. 再打开油烟机左边吊柜里看看。

  **没有 ReAct 的情况就是：**

  不管在第几步找到胡椒粉，ta 都会把这几个地方都看看（Action）。

  **有 ReAct 的情况是：**

  - Action1：先看看台面上有没有；
  - Observation1：台面上没有胡椒粉，执行下一步；
  - Action2：再拉开灶台底下抽屉里看看；
  - Observation2：抽屉里找到了胡椒粉，任务完成，停止执行。

  每一步 Action 之后都会观察（Observation）结果，再决定是否继续下一步，从而形成推理与行动的闭环。

### Plan and Solve

旨在通过强制 LLM 在解题前先进行系统性规划

- 优点：处理复杂任务能力强，能够抑制模型幻觉
- 缺点：对规划质量高度依赖，架构复杂会导致系统延迟
- 场景：自动化流程、多模块代码生成、系统研究分析
- 原理：

  这种设计模式是**先有计划再来执行**。如果说 ReAct 更适合完成"厨房拿胡椒粉"的任务，那么 Plan & Solve 更适合完成"西红柿炒鸡蛋"的任务：需要计划，并且过程中计划可能会变化（比如你打开冰箱发现没有西红柿时，你将购买西红柿作为新的步骤加入计划）。

  提示词模板方面，论文《[Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models》](https://arxiv.org/abs/2305.04091) / https://github.com/agi-edgerunners/plan-and-solve-prompting 简言之就是 Zero-shot 的提升。

  架构上由以下模块组成：

  ```mermaid
  flowchart TD
      User(["User"]) -->|"1. User Request"| Plan(["Plan"])
      Plan -->|"2. Generate Tasks"| TaskList["Task List\n1. ···\n2. ···\n3. ···"]
      TaskList -->|"3. Exec Tasks"| Agent(["Single-Task\nAgent"])
      Agent -->|"Loop to\nsolve task"| Tools[/"Tools"/]
      Tools --> Agent
      Agent -->|"4. Update state\nwith task results"| Replan(["Replan"])
      Replan -->|"5a. Replan more tasks"| TaskList
      Replan -->|"5b. Respond to user"| User
  ```

### ReWOO(Reason without Observation)

将逻辑推理与工具观察解耦，根本上改变传统式循环

- 优点：大幅度降低 token 的消耗，推理清晰稳定
- 缺点：灵活性不足，应对动态环境能力较弱，对规划器质量高度依赖
- 场景：复杂推理问答、金融行业分析、智能客服
- 原理：

  ReWOO 这种方法是相对 ReAct 中的 Observation 来说的，ReAct 提示词结构是 Thought → Action → Observation，而 ReWOO 把 Observation 去掉了。但实际上，ReWOO 只是将 Observation 隐式地嵌入到下一步的执行单元中了，即由下一步骤的执行器自动去 observe 上一步执行器的输出。

### LLM Compiler

通过将任务表示为有向无环图，实现多行函数  调用的自动编排

- 优点：能够自动为函数调用生成最佳编排方案
- 缺点：动态适应性较弱，严格按计划执行，不够灵活
- 场景：查询多个 API、复杂推理问题、自动化数据分析
- 原理：提示词里对 Planner 的要求是这样的，重点是希望生成一个 DAG(Direct Acyclic Graph)，有向无环图。

### Basic Reflection

通过自我批评和迭代优化来提升生成质量

- 优点：成本低，批评内容本身就是对错误的分析，可通过 prompt 自动优化生成质量
- 缺点：受限于模型自身，可能会过度修改而增加延迟和成本，无法跳出模型的认知边界
- 场景：代码生成、文本润色、数学问题对话系统
- 原理：Basic Reflection 可以类比于学生(Generator)写作业，老师(Reflector)来批改建议，学生根据批改建议来修改，如此反复。

  ```mermaid
  flowchart TB
    User(["User"])
    Generate["Generate\n(LLM)"]
    InitialResponse["Initial response"]
    Reflect["Reflect\n(LLM)"]
    Reflections["Reflections\nCritique: ...\nMerits: ...\nRecs: ...\n..."]

    User -->|"1. User Request"| Generate
    Generate -->|"2."| InitialResponse
    InitialResponse -->|"3."| Reflect
    Reflect -->|"4."| Reflections
    Reflections -->|"5. Repeat N times"| Generate
    Reflections -->|"End. Respond to user"| User
  ```

### Reflexion

是一种强化学习与自我反思向结合的 Agent 架构

- 优点：能有效避免重复犯错，可解释性强，能通过持续学习提高决策质量
- 缺点：LLM 作为判别器标准模糊不定，难以通过调参形成稳定的分界线，调元消耗多成本高
- 场景：自动化流程、多模块代码生成、系统研究分析
- 原理：Reflexion 是 Basic Reflection 的升级版，相应论文标题是《Reflexion: Language Agents with Verbal Reinforcement Learning》，本质上是强化学习的思路。和 Basic Reflection 相比，引入了外部数据来评估回答是否准确，并强制生成响应中多余和缺失的方方面面，这使得反思的内容更具建设性。

### LATS(Language Agent Tree Search)

将经典人工智能中的树搜索算法与 LLM 深度融合，形成先进决策框架

- 优点：通过溯回避免陷入局部最优，提升决策质量，解决了 LLM 作为判别器标准模糊的问题
- 缺点：LLM 作为判别器的标准仍不稳定，限制了搜索的有效性；虽然多样性决策，但样本多样性决策
- 场景：交互式任务、网页导航、API 调用
- 原理：

  LATS 相应论文标题是《Language Agent Tree Search Unifies Reasoning Acting and Planning in Language Models》，很直白：是 Tree Search + ReAct + Plan & Solve 的融合体。
  
  在原作的图中，我们也看到 LATS 中通过树搜索的方式进行 Reward（强化学习的思路），同时还会融入 Reflection，从而拿到最佳结果。所以：LATS = Tree Search + ReAct + Plan & Solve + Reflection + 强化学习。

  架构上，就是多轮的 Basic Reflection，多个 Generator 和 FReflector。

### Self-Discover

让大预言模型为特定任务定制推理框架的先进模式

- 优点：性能高、成本低，推理结构可迁移，可用于验证数据分析、战略规划
- 缺点：在纯算法问题上限制明显，需要多次调用 LLM 来构造计划，纯算法问题无法套用逻辑
- 场景：数学证明、复杂数据分析、战略规划
- 原理：Self-Discover 的核心是让大模型在更小粒度上对 task 本身进行反思，比如前文中的 Plan & Solve 是反思 task 是不是需要补充，而 Self-Discover 是对 task 本身进行反思。