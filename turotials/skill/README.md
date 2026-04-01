# Skill

- https://agentskills.io/home
- https://code.claude.com/docs/en/skills

## 构建

- [Claude Skills 完整构建指南](https://github.com/libukai/awesome-agent-skills/blob/main/docs/Claude-Skills-%E5%AE%8C%E5%85%A8%E6%9E%84%E5%BB%BA%E6%8C%87%E5%8D%97.md)

### 原则

- 渐进式披露：YAML =》SKILL.md =》链接文件
- 可组合性：可以同时加载多个 Skills，不同的 Skills 协同工作
- 可移植性：创建一次，即可在所有平台使用

### 格式

```
your-skill-name/
├── SKILL.md                  # 必须——带有 YAML frontmatter 的 Markdown 格式指令
├── scripts/                  # 可选——可执行代码（Python、Bash 等）
│    ├── process_data.py      # 示例
│    └── validate.sh          # 示例
├── references/               # 可选——按需加载的文档
│    ├── api-guide.md         # 示例
│    └── examples/            # 示例
└── assets/                   # 可选——输出中使用的模板、字体、图标
     └── report-template.md  # 示例
```

#### `SKILL.md`

```
---
name: your-skill-name
description: [它做什么] + [何时使用] + [核心能力]
[license]: MIT
[compatibility]: 说明环境要求
[metadata]: author、version、mcp-server
---

[## Instructions]

[### Step 1]

...

[## Common Issues]

[### MCP Connection Failed]

...
```

- 脚本执行

  ```bash
  Run `python scripts/validate.py --input {filename}` to check data format.
  ```

- 资源引用

  ```
  Before writing queries, consult `references/api-patterns.md` for: ...
  ```

#### `scripts`

...

#### `references`

...

#### `assets`

...

### 测试

- 触发测试: 在正确时机加载。
- 功能测试：能产生正确的输出。
- 性能测试：相比基线有所改善。

## 使用

- 查找：`npx skills find [query]`
- 罗列：`npx skills list`
- 安装：`npx skills add owner/repo`
- 删除：`npx skills remove [skills]`
- 更新：`npx skills update`
- 创建：`npx skills init [name]`
