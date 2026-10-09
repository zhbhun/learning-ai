/*
 * 最小 stdio MCP server:两个工具,进程守着 stdin 等 agent 来连。
 * 前置:@modelcontextprotocol/server 与 zod v4 已安装,Node.js >= 20。
 * 运行:npx tsx stdio-server.ts —— stderr 打出启动横幅,之后进程等待协议消息。
 * 调试:npx @modelcontextprotocol/inspector npx tsx stdio-server.ts。
 * agent 侧:mcpServers 配 { command: "npx", args: ["tsx", "<本文件的绝对路径>"] }。
 * 阅读主线:注册能力(registerTool)与对外服务(serveStdio)是两段独立的关注点;
 *           stdout 是 JSON-RPC 协议通道,日志一律走 console.error。
 */
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

// 状态归 server 进程所有:agent 侧看不到这些变量,只能通过工具读写
const notes: string[] = [];

function createNotesServer(): McpServer {
  const server = new McpServer({ name: "notes", version: "1.0.0" });

  server.registerTool(
    "add_note",
    {
      description: "保存一条笔记,返回当前笔记总数",
      inputSchema: z.object({
        text: z.string().min(1).describe("笔记内容"), // describe 会进模型看到的 JSON Schema
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
    {
      description: "列出全部已保存的笔记",
      // 无入参的工具直接省略 inputSchema
    },
    async () => ({
      content: [{
        type: "text",
        text: notes.length
          ? notes.map((n, i) => `${i + 1}. ${n}`).join("\n")
          : "(还没有笔记)",
      }],
    }),
  );

  return server;
}

// serveStdio 接管传输:调一次工厂得到服务实例,读 stdin、写 stdout
void serveStdio(createNotesServer);
console.error("notes MCP server running on stdio");
