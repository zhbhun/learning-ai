# OpenCode Plugin Tester

OpenCode 插件，包含文件操作工具和自动加载的技能。

## 特性

- 🛠️ **文件工具**: 批量重命名、高级搜索
- 🎯 **自动技能**: 代码审查、测试生成、快速重构
- 🪝 **事件钩子**: Session 日志记录
- ⚡ **零配置**: 技能自动注册

## 安装

```bash
npm install opencode-plugin-tester
```

## 使用

```bash
opencode

# 自动显示可用技能：
Available skills:
- code-review: 代码质量审查
- test-helper: 测试文件生成
- quick-refactor: 快速代码重构

# 使用技能：
> Use code-review skill to review src/file.ts
> Use test-helper skill to generate tests for src/utils.ts
> Use quick-refactor skill to modernize src/legacy.ts
```

## 工具

### fileBatchRename

批量重命名文件，支持正则表达式和预览模式。

```
Use fileBatchRename to rename test_*.ts to spec_*.ts
```

### fileSearch

高级文件搜索，支持类型过滤和深度控制。

```
Use fileSearch to find all .ts files in src/
```

## 技能

### code-review

代码质量审查：
- TypeScript 类型检查
- 性能分析
- 安全漏洞检测
- 改进建议

### test-helper

测试文件生成：
- 自动生成测试模板
- 识别测试场景
- 创建边缘情况测试

### quick-refactor

快速代码重构：
- 一致性重命名
- 提取函数
- 简化逻辑
- 现代化代码

## 开发

### 项目结构

```
opencode-plugin-tester/
├── src/                # 源代码
│   ├── index.ts       # 插件入口
│   ├── tools/         # 工具实现
│   ├── hooks/         # 事件钩子
│   └── skills/        # 技能定义
│       ├── code-review/
│       ├── test-helper/
│       └── quick-refactor/
└── dist/               # 编译产物
    └── skills/        # 技能文件（自动复制）
```

### 构建

```bash
npm run build
```

### 本地测试

```bash
# 创建测试项目
mkdir test-project && cd test-project

# 链接插件
mkdir -p .opencode/plugins
ln -s ../opencode-plugin-tester/dist/index.js .opencode/plugins/tester.js

# 测试
opencode
```

## 技能实现原理

通过 `config` 钩子自动注入技能路径，用户无需配置。

详见 [SKILLS.md](./SKILLS.md)

参考实现：https://github.com/obra/superpowers

## 许可证

MIT