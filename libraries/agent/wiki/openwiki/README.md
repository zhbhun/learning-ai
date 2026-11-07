# OpenWiki

GitHub: <https://github.com/langchain-ai/openwiki> — 扫描仓库源码，用 LLM 生成并维护一套 wiki 文档（`openwiki/` 目录），可随代码更新自动刷新。

## 安装

- 全局安装 CLI，要求 Node.js ≥ 22.22.0。

  ```bash
  npm install -g openwiki
  ```

- 给编码代理装集成（

  ```bash
  openwiki integrations install claude
  ```

  把 OpenWiki 检索/生命周期工具注册进代理）。`claude` 可换 `codex` / `opencode` / `cursor` / `bob` / `kiro` / `omp` / `antigravity` / `copilot`；加 `--project` 装到仓库级。


- 查看已装集成状态。

  ```bash
  openwiki integrations list
  ```

- 卸载某个代理集成。

  ```bash
  openwiki integrations uninstall <host>
  ```

## 配置

```bash
export OPENAI_API_KEY=sk-...
```

默认 provider 是 OpenAI（模型 `gpt-5.6-terra`），有这一个 key 就能跑。

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

换 Claude 时需要的 key。

```bash
export OPENWIKI_PROVIDER=anthropic
export OPENWIKI_MODEL_ID=claude-sonnet-5
```

切换 provider 和模型。常用 provider：`openai`（默认）/ `anthropic` / `gemini` / `bedrock` / `openrouter` / `copilot` / `openai-compatible`。

```bash
export OPENAI_COMPATIBLE_API_KEY=ollama
export OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
export OPENWIKI_MODEL_ID=llama3.2
```

接任意 OpenAI 兼容端点（如本地 Ollama）。

```bash
export OPENWIKI_PAGE_CONCURRENCY=4
```

并行生成页数，1–8（默认 1）。

```bash
export OPENWIKI_TELEMETRY_DISABLED=1
```

关闭遥测（或用 `DO_NOT_TRACK=1`）。

## 使用

### 初始化（首次生成 wiki）

```bash
openwiki code --init
```

扫描当前仓库源码和测试，生成整套 `openwiki/` 文档。

```bash
OPENWIKI_PROVIDER=openai-chatgpt openwiki code --init
```

用 ChatGPT 订阅账号（OAuth）跑初始化，不消耗 API key。

```bash
openwiki personal --init
```

初始化"个人大脑" wiki（跨仓库的个人笔记），对应 `openwiki personal` 交互模式。

也可以不敲命令，直接对装了集成的代理说提示词：

```text
Initialize this repository's OpenWiki from the current source and tests.
```

让代理走 MCP 生命周期（`openwiki_begin` → `submit_plan` → 逐页 `next_page`/`submit_page` → `finish`）完成生成。

### 更新（代码变了之后）

```bash
openwiki code --update
```

对比上次生成时的 commit（记录在 `openwiki/.page-manifest.json` 的 `gitHead`），只重写受影响的页面。

```bash
OPENWIKI_PAGE_CONCURRENCY=4 openwiki --update
```

并行更新，加快多页面仓库的刷新。

```text
Update this repository's OpenWiki for changes since its last successful run.
```

让代理完成同样的更新。

### 日常查询

```bash
openwiki
```

进入交互式聊天（code 模式，绑定当前仓库）。

```bash
openwiki personal
```

进入个人大脑的交互式聊天。

```bash
openwiki -p "这个项目的重试逻辑在哪?"
```

一次性问答：打印答案后退出，不进交互。

```text
Search this repository's OpenWiki for how retry handling works, then read the relevant sections.
```

提示词版查询：让代理 `openwiki_search` 定位 + `openwiki_read` 读完整小节。

### 可视化

```bash
openwiki visualize
```

本地起网页（默认 `127.0.0.1:4321`），图形化浏览 wiki 页面关系图。

```bash
openwiki visualize --export docs/site
```

导出可视化站点到指定目录，不启服务。

### 工作区（多仓库共享 wiki）

```bash
openwiki link ~/dev/other-repo
```

把其他仓库链接进命名工作区，跨仓库一起检索。

```bash
openwiki workspace use <name>
```

设置当前仓库的活动工作区；`workspace current` 查看，`workspace clear` 清除。

### 连接器（外部数据源）

```bash
openwiki auth notion
```

给连接器做 OAuth 认证（支持 `slack` / `gmail` / `x` / `notion`）。

```bash
openwiki ingest all
```

执行连接器数据拉取（可指定单个连接器）。

## CI 定时更新（GitHub Actions）

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0   # 必须:浅克隆看不到上次 gitHead,diff 为空
- run: npm install --global openwiki@0.7.2
- run: openwiki code --update --print
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    OPENWIKI_MODEL_ID: "gpt-5.6-terra"
```

定时跑更新的最小骨架；配合 `peter-evans/create-pull-request` 把 `openwiki/` 变更自动开成 PR。完整实例见 clotho 仓库 `.github/workflows/openwiki-update.yml`。

## 仓库内文件

| 文件 | 作用 |
| --- | --- |
| `openwiki/index.md` | wiki 入口/目录页 |
| `openwiki/.page-manifest.json` | 每页的 `gitHead`（生成时 commit）、页面哈希、源码指纹 |
| `openwiki/.last-update.json` | 上次运行时间、命令、状态 |
| `openwiki/.claims/` | 每页断言及其源码证据位置 |
| `openwiki/.run.json` | 运行中临时状态，结束即删（CI 里记得 `rm`） |

## 代理提示词速查

```text
Initialize this repository's OpenWiki from the current source and tests.
```

首次生成。

```text
Update this repository's OpenWiki for changes since its last successful run.
```

增量更新。

```text
Search this repository's OpenWiki for <topic>, then read the relevant sections.
```

检索 + 深读。
