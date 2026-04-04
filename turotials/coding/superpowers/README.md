https://github.com/obra/superpowers

## 原理

```mermaid
flowchart LR
  A["brainstorming (design)"] --> B["writing-plans (planning)"]
  B --> C["subagent-driven-development (implementation)"]
```

### `using-superpowers`

该技能是引导 Agent 发现并应用所有其他技能的引导技能。

- 强制执行技能使用的 1% 调用阈值
- 定义指令优先级层级（用户 > 技能 > 系统提示）
- 设定技能类型优先级（优先处理流程技能，再处理实现技能）
- 为基于清单的技能指定 TodoWrite 清单集成

### `/brainstorming`

```mermaid
flowchart TD
  A["Explore project context"] --> B{"Visual questions ahead?"}
  B -->|yes| C["Offer Visual Companion<br>(own message, no other content)"]
  B -->|no| D["Ask clarifying questions"]
  C --> D
  D --> E["Propose 2-3 approaches"]
  E --> F["Present design sections"]
  F --> G{"User approves design?"}
  G -->|no, revise| F
  G -->|yes| H["Write design doc"]
  H --> I["Spec self-review<br>(fix inline)"]
  I --> J{"User reviews spec?"}
  J -->|changes requested| H
  J -->|approved| K(["Invoke writing-plans skill"])
```

### `/writing-plans`

### `/subagent-driven-development`

```mermaid
flowchart TB
  subgraph PerTask["Per Task"]
    A1["Dispatch implementer subagent (./implementer-prompt.md)"] 
    A2{"Implementer subagent asks questions?"} 
    A3["Answer questions, provide context"] 
    A4["Implementer subagent implements, tests, commits, self-reviews"] 
    A5["Dispatch spec reviewer subagent (./spec-reviewer-prompt.md)"] 
    A6{"Spec reviewer subagent confirms code matches spec?"} 
    A7["Implementer subagent fixes spec gaps"] 
    A8["Dispatch code quality reviewer subagent (./code-quality-reviewer-prompt.md)"] 
    A9{"Code quality reviewer subagent approves?"} 
    A10["Implementer subagent fixes quality issues"] 
    A11["Mark task complete in TodoWrite"]

    A1 --> A2
    A2 -->|yes| A3
    A3 --> A1
    A2 -->|no| A4
    A4 --> A5
    A5 --> A6
    A6 -->|no| A7
    A7 -->|re-review| A5
    A6 -->|yes| A8
    A8 --> A9
    A9 -->|no| A10
    A10 -->|re-review| A8
    A9 -->|yes| A11
  end

  B["Read plan, extract all tasks with full text, note context, create TodoWrite"] --> A1
  A11 --> C{"More tasks remain?"}
  C -->|yes| A1
  C -->|no| D["Dispatch final code reviewer subagent for entire implementation"]
  D --> E["Use superpowers:finishing-a-development-branch"]
```

## 优缺点

- 优点：访谈式完善需求，有详细的设计文档和任务规划
- 缺点：

  - 规划和执行任务时会提交代码，会出现较多 commit，有些东西没有生成最终效果可能得二次修改。
  - 一个简单的需求会过度设计，并且任务拆分过细，导致生成成本较高且时间较长
  - 没有维护一份完整的技术设计文档，每次都要查看全部代码来完成访谈，Token 消耗过高
  - 默认为英文，对英文不熟练的开发者不够友好
