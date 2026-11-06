# mcp-builder

> 指导创建高质量 MCP（Model Context Protocol）服务器，让 LLM 通过设计良好的工具与外部服务交互；适用于集成外部 API 或服务时构建 MCP 服务器，Python（FastMCP）或 Node/TypeScript（MCP SDK）均可。

## 场景

给无需 API key 的 Open Library 开放图书 API 做一个 TypeScript stdio MCP server，从零建在 [sandbox/open-library-mcp-server](sandbox/open-library-mcp-server) 下，正好走完技能的「调研 → 实现 → 构建自检 → 评估」全流程。

## 对话

- /mcp-builder 帮我给 Open Library API（https://openlibrary.org/developers/api，无需 API key）做一个 MCP server：TypeScript、stdio 传输，项目建在 libraries/skills/engineer/anthropics-skills/mcp-builder/sandbox/open-library-mcp-server 下。

  ```md
  MCP server 已完成并通过全部验证。按 mcp-builder skill 四阶段流程执行：

  ## 完成内容

  **项目位置**： `sandbox/open-library-mcp-server`

  **技术栈**： TypeScript + MCP TypeScript SDK **v2**（`@modelcontextprotocol/server` 2.4.0）+ Zod 4，stdio 传输，无需 API key。

  **6 个工具**（全部 `openlibrary_` 前缀、只读标注、markdown/json 双格式、limit/offset 分页返回 `next_offset`、25k 字符上限靠减少条目而非截断）：
  - `openlibrary_search_books` — 按 query/title/author/subject 搜索，带排序
  - `openlibrary_search_authors` — 作者搜索（生卒年、代表作、作品数）
  - `openlibrary_get_work` — 作品详情 + 版本列表（ISBN、全文链接），`outputSchema` + `structuredContent`
  - `openlibrary_get_edition` — 按 ISBN-10/13 或 OLID 查版本
  - `openlibrary_get_author` — 作者详情（bio 归一化字符串/`{value}` 两种形态）
  - `openlibrary_get_works_by_author` — 按作者列作品

  **验证结果**：
  - `npm run build` 无错误；`npm run smoke` 自检脚本通过（启动子进程、调用全部 6 个工具、验证 JSON/Markdown 两种格式、验证非法 ID 返回可读错误）
  - `evaluations/open-library-evaluation.xml` — 10 道 multi-hop 评估题，每道答案均已通过 API 亲手验证（如 Turing 的 OLID `OL770877A`、Animal Farm 首版年 `1945`、Signet Classic 出版社等）

  ## 关键发现

  1. **本机 DNS 污染**：openlibrary.org 被解析到假 IP（31.13.67.33），真实 IP 为 207.241.239.14（covers 子域 207.241.239.55）。服务器代码本身干净，workaround 放在 smoke 测试侧：`scripts/dns-fix.cjs` 通过 `NODE_OPTIONS --require` 给子进程打 dns.lookup 补丁（`OL_DNS_OVERRIDE` 指定映射）。日常使用若同样遇到污染，README 的 "DNS-polluted networks" 一节有启动命令。**网络正常时可删掉该文件**。
  2. **Books API 会 302**：`/isbn/{isbn}.json` 重定向到 `/books/OLxxxM.json`，fetch 自动跟随；404 返回 HTML 而非 JSON，代码里对 404 和非 JSON content-type 都做了处理。
  3. **work 的 authors 字段是 `{author: {key}}` 嵌套**（不是 v1 文档常写的 `{key}`），schema 已兼容两种形态。
  ```

## 总结

这个技能是一份「从零造 MCP server」的全程施工手册：先把该抓的文档抓到手（MCP 协议规范、所选语言的 SDK 文档），再按四阶段推进——调研规划、写实现、构建加自检、最后出一份评估题。试用里最有价值的是它把一堆最佳实践变成了默认动作，不用使用者自己记住：工具名带服务前缀、markdown/json 双输出格式、分页返回 `next_offset`、响应按字符上限靠减条目而不是截断、每个工具标只读/破坏性等注记、写完必配一个冒烟自检脚本、最后还要出 10 道多跳评估题并亲手验证答案。子代理全程照做，产出的 6 个工具、构建产物、自检脚本和评估文件一一核对属实。

局限一是流程重：给一个中等规模的 server，子代理跑了九十一轮工具调用、约二十六分钟，只是想要两个工具的场合会显得用力过猛。二是硬依赖外部网络：拉 SDK 文档、验证评估题答案都要访问目标 API，这次就撞上本机 DNS 污染，子代理自己排查出假 IP 并在自测侧做了补丁——技能没教这步，属于环境问题的自行发挥，但也说明用它时得备一个能正常访问目标服务的网络。
