# MCP 资源

MCP 服务器资源的列出与读取,以及各 MCP 工具集索引。

## ListMcpResourcesTool

列出已配置 MCP 服务器上的可用资源。

- 每个返回的资源都包含全部标准 MCP 字段,并额外附带一个 `server` 字段,用于标明该资源所属的服务器。
- 可按服务器名称进行筛选。

参数:server(可选,按服务器名称过滤结果)。

## ReadMcpResourceDirTool

列出 MCP 服务器上某个目录资源的直接子项(对应 `resources/directory/read` 操作)。

- **非递归**:仅返回当前目录的直接子项,不展开更深层级。
- 每个条目都带有自己的 `uri`;其中子目录条目的 `mimeType` 为 `"inode/directory"`——如需查看其内容,对该 `uri` 再次调用本工具即可下钻一层。
- **仅对声明支持目录列表能力的服务器可用**;不支持该能力的服务器调用会返回错误。

参数:

- `server`(必填,MCP 服务器名称)。
- `uri`(必填,要列举子项的目录资源 URI)。

## ReadMcpResourceTool

按服务器名称和资源 URI,读取 MCP 服务器上的某个特定资源。

参数:

- `server`(必填,MCP 服务器名称)。
- `uri`(必填,目标资源的 URI)。

## MCP 工具集

MCP 工具按服务器分组,数量大、完整说明按需提供。

| 组 | 工具数 | 工具前缀 |
| --- | --- | --- |
| CodeGraph | 1 | mcp__codegraph__codegraph_explore |
| Pencil 设计(.pen) | 11 | mcp__pencil__* |
| Chrome DevTools | ~30 | mcp__plugin_chrome-devtools-mcp_chrome-devtools__* |
| Context7 文档 | 2 | mcp__plugin_context7_context7__* |
| Web Reader | 2 | mcp__web-reader__webReader / mcp__web_reader__webReader |
| Web Search Prime | 1 | mcp__web-search-prime__web_search_prime |
| 4_5v 图片分析 | 1 | mcp__4_5v_mcp__analyze_image |
| ZAI 多模态 | 8 | mcp__zai-mcp-server__* |
| Zread GitHub | 3 | mcp__zread__* |
