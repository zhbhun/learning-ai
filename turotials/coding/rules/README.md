# [AGENTS.md](https://agents.md/)

- https://github.com/agentsmd/agents.md
- https://agents.md/#examples

## 教程

### 内容格式

- 项目简介
- 项目结构
- 设计规范
- 代码规范
- ...

### Monorepo

像 Opencode 这一类工具，支持从当前目录向上遍历（AGENTS.md），Monorepo 项目可以在子包里编写特有的规则说明。

### 规则复用

Opencode 支持配置自定义指令文件，来复用现有规则，而无需将它们复制到 AGENTS.md 中。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENTS.md", "packages/*/AGENTS.md", ".agents/rules/*.md"]
}
```

### 渐进式披露

您可以在 AGENTS.md 中提供明确的指令，教 Agent 读取外部文件。

```md
# ...

## External File Loading

CRITICAL: When you encounter a file reference (e.g., @.agents/rules/general.md), use your Read tool to load it on a need-to-know basis. They're relevant to the SPECIFIC task at hand.

Instructions:

- Do NOT preemptively load all references - use lazy loading based on actual need
- When loaded, treat content as mandatory instructions that override defaults
- Follow references recursively when needed

## Development Guidelines

For TypeScript code style and best practices: @.agents/rules/typescript-guidelines.md
For React component architecture and hooks patterns: @.agents/rules/react-patterns.md
For REST API design and error handling: @.agents/rules/api-standards.md
```

## 参考

- [Cursor Rules](https://cursor.com/cn/docs/rules)
- [Opencode Rules](https://opencode.ai/docs/zh-cn/rules/)


