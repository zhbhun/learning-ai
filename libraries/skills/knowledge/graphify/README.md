# Graphify 快速上手

Graphify 将代码、文档等内容生成可查询的知识图谱。

## 安装

```bash
uv tool install --upgrade graphifyy
```

包名是 `graphifyy`，命令名是 `graphify`。

## 首次构建

### 在 Agent 中

```text
/graphify .
```

完整构建当前目录的图谱。

### 在终端中

```bash
graphify extract .
```

直接使用 CLI 执行完整提取。

生成目录：

```text
graphify-out/
├── graph.json            # 图数据
├── graph.html            # 交互式图谱
├── GRAPH_REPORT.md       # 审计报告
├── manifest.json         # 增量更新清单
└── .graphify_labels.json # 社区名称
```

代码 AST 提取不需要 API Key。文档、论文和图片可以由 Agent 处理；也可以配置 Gemini：

```bash
export GEMINI_API_KEY="..."
```

## 限制扫描范围

在项目根目录创建 `.graphifyignore`，只扫描 `src/`：

```gitignore
*
!src/
!src/**
```

修改 `.graphifyignore` 后重新完整构建：

```text
/graphify .
```

## 更新图谱

### Agent 完整增量更新

```text
/graphify --update
```

更新新增或修改的代码、文档、图片等内容，并同步报告和 HTML。

### CLI 代码增量更新

```bash
graphify update .
```

只更新新增或修改的代码文件，不使用 LLM，适合开发时频繁执行。

代码删除较多且 CLI 拒绝缩小图谱时：

```bash
graphify update . --force
```

确认删除是有意的后再使用。

## 查询图谱

```bash
graphify query "前端和后端如何通信？"
```

BFS 查询相关节点。

```bash
graphify query "RPC 请求如何到达后端？" --dfs
```

DFS 追踪更具体的关系路径。

```bash
graphify query "项目启动流程是什么？" --budget 1500
```

限制查询结果长度。

```bash
graphify path "BrowserView" "ClaudeService"
```

查询两个节点之间的最短路径。

```bash
graphify explain "ClaudeService"
```

查看节点及其关联关系。

已有 `graphify-out/graph.json` 时，直接查询即可，不需要重新构建。

## 开发辅助

```bash
graphify watch .
```

监听代码变化并自动更新代码图。

```bash
graphify cluster-only .
```

只重新计算社区和报告。

```bash
graphify hook install
```

安装 Git Hook，在提交或切换代码后自动更新代码图。

```bash
graphify hook status
graphify hook uninstall
```

查看或卸载 Git Hook。升级 Graphify 后建议重新安装 Hook。

## Git 提交规则

建议提交共享图谱结果：

```text
graphify-out/graph.json
graphify-out/graph.html
graphify-out/GRAPH_REPORT.md
graphify-out/manifest.json
graphify-out/.graphify_labels.json
graphify-out/.graphify_labels.json.sig
```

建议加入 `.gitignore`：

```gitignore
graphify-out/cost.json
graphify-out/cache/
graphify-out/.graphify_python
graphify-out/.graphify_root
graphify-out/????-??-??/
```

说明：

- 根目录中的 `graph.json`、报告和 HTML 是当前最新版本；
- `manifest.json` 用于后续增量更新；
- `cost.json` 和 `cache/` 属于本地成本或缓存数据；
- `.graphify_python`、`.graphify_root` 可能包含本机路径；
- `YYYY-MM-DD/` 是更新前的历史备份。

历史备份默认保留在 `graphify-out/` 下，也可以手动关闭：

```bash
GRAPHIFY_NO_BACKUP=1 graphify update .
```

## 推荐工作流

```text
首次使用       → /graphify .
开发改代码     → graphify update .
改文档或图片   → /graphify --update
查询项目       → graphify query "..."
提交前检查     → git status
```

官方仓库：[Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)
