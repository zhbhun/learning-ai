/*
 * 最小 Streamable HTTP MCP server:与 stdio-server.ts 注册同一组能力,
 * 只换「怎么对外服务」——createMcpHandler + node:http 接线。
 * 前置:@modelcontextprotocol/server、@modelcontextprotocol/node 与 zod v4 已安装,Node.js >= 20。
 * 运行:npx tsx http-server.ts —— 进程常驻,监听 http://127.0.0.1:3000/。
 * 调试:不带参数启动 npx @modelcontextprotocol/inspector,在界面选 Streamable HTTP 并填上面的 URL。
 * agent 侧:mcpServers 配 { type: "http", url: "http://127.0.0.1:3000/" }。
 * 预期:工厂每个 HTTP 请求跑一次(默认无状态);跨请求状态放在模块作用域。
 */
import {
  createMcpHandler,
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/server";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import * as z from "zod/v4";
import { createServer } from "node:http";

// 模块作用域:工厂每个请求跑一次,跨请求共享的状态要建在工厂外面
const notes: string[] = [];

function createNotesServer(): McpServer {
  const server = new McpServer({ name: "notes", version: "1.0.0" });

  // 与 stdio-server.ts 完全相同的注册代码
  server.registerTool(
    "add_note",
    {
      description: "保存一条笔记,返回当前笔记总数",
      inputSchema: z.object({
        text: z.string().min(1).describe("笔记内容"),
      }),
    },
    async ({ text }) => {
      notes.push(text);
      return {
        content: [{ type: "text", text: `已保存,当前共 ${notes.length} 条笔记` }],
      };
    },
  );

  server.registerTool(
    "list_notes",
    { description: "列出全部已保存的笔记" },
    async () => ({
      content: [{
        type: "text",
        text: notes.length
          ? notes.map((n, i) => `${i + 1}. ${n}`).join("\n")
          : "(还没有笔记)",
      }],
    }),
  );

  // 资源:应用控制的只读数据,固定 URI
  server.registerResource(
    "notes-stats",
    "notes://stats",
    {
      title: "笔记统计",
      description: "当前笔记数量",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({ count: notes.length }),
      }],
    }),
  );

  // 资源模板:同类资源的一组实例,变量 noteId 从 URI 里解析
  server.registerResource(
    "note",
    new ResourceTemplate("notes://{noteId}", {
      // list 是必填键:这里给枚举回调,实例会出现在 resources/list
      list: async () => ({
        resources: notes.map((_, i) => ({
          uri: `notes://${i}`,
          name: `笔记 ${i + 1}`,
        })),
      }),
    }),
    { title: "一条笔记", mimeType: "text/plain" },
    async (uri, { noteId }) => ({
      contents: [{
        uri: uri.href,
        text: notes[Number(noteId)] ?? "(这条笔记不存在)",
      }],
    }),
  );

  return server;
}

// HTTP 接线:web 标准 handler → node:http;本机部署补 Host / Origin 校验
const mcpHandler = createMcpHandler(createNotesServer);
const nodeHandler = toNodeHandler(mcpHandler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

createServer((req, res) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) return;
  void nodeHandler(req, res);
}).listen(3000, "127.0.0.1");

console.error("notes MCP server listening on http://127.0.0.1:3000/");
