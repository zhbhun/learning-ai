/**
 * 备忘录 MCP Server —— 演示三种原语：工具(Tools) / 资源(Resources) / 提示词(Prompts)
 *
 * - 工具：add-note / delete-note      —— 类比 POST，有副作用，模型自主决定调用
 * - 资源：note://notes + note://notes/{id} —— 类比 GET，只读，用户/应用选择后注入上下文
 * - 提示词：summarize-notes            —— 参数化模板，用户以 /命令 形式主动触发
 *
 * 传输方式：stdio（客户端拉起子进程，走标准输入/输出）
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─────────────────────────── 数据层（内存存储） ───────────────────────────
const notes = new Map([
  ["1", { title: "买菜", content: "牛奶、鸡蛋、西兰花" }],
  ["2", { title: "周会", content: "周五下午三点，带上季度报表" }],
]);
let nextId = 3;

// ─────────────────────────── 创建 Server ───────────────────────────
const server = new McpServer({
  name: "notes-tester",
  version: "0.1.0",
});

// ══════════════════════════ 1. 工具 Tools ══════════════════════════
// 模型读 description + inputSchema 决定何时调用、传什么参数
server.registerTool(
  "add-note",
  {
    title: "添加备忘录",
    description: "新增一条备忘录，返回新备忘录的 id",
    inputSchema: {
      title: z.string().describe("标题"),
      content: z.string().describe("正文内容"),
    },
  },
  async ({ title, content }) => {
    const id = String(nextId++);
    notes.set(id, { title, content });
    return {
      content: [{ type: "text", text: `已添加备忘录 #${id}「${title}」` }],
    };
  }
);

server.registerTool(
  "delete-note",
  {
    title: "删除备忘录",
    description: "按 id 删除一条备忘录",
    inputSchema: {
      id: z.string().describe("备忘录 id"),
    },
  },
  async ({ id }) => {
    if (!notes.delete(id)) {
      // isError: true 告诉模型调用失败，模型会据此调整后续行为
      return {
        isError: true,
        content: [{ type: "text", text: `备忘录 #${id} 不存在` }],
      };
    }
    return {
      content: [{ type: "text", text: `已删除备忘录 #${id}` }],
    };
  }
);

// ══════════════════════════ 2. 资源 Resources ══════════════════════════
// 静态资源：固定 URI，返回备忘录总览
server.registerResource(
  "notes-list",
  "note://notes",
  {
    title: "备忘录列表",
    description: "全部备忘录的 id 与标题",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(
          [...notes.entries()].map(([id, n]) => ({ id, title: n.title })),
          null,
          2
        ),
      },
    ],
  })
);

// 资源模板：参数化 URI，按 id 读取单条备忘录
server.registerResource(
  "note-detail",
  new ResourceTemplate("note://notes/{id}", {
    // list 回调让客户端能通过 resources/templates/list 枚举出当前所有可用 URI
    list: async () => ({
      resources: [...notes.entries()].map(([id, n]) => ({
        uri: `note://notes/${id}`,
        name: `备忘录 #${id}：${n.title}`,
        mimeType: "text/markdown",
      })),
    }),
  }),
  {
    title: "备忘录详情",
    description: "按 id 读取一条备忘录的完整内容",
    mimeType: "text/markdown",
  },
  async (uri, { id }) => {
    const note = notes.get(id);
    if (!note) throw new Error(`备忘录 #${id} 不存在`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: `# ${note.title}\n\n${note.content}`,
        },
      ],
    };
  }
);

// ══════════════════════════ 3. 提示词 Prompts ══════════════════════════
// 用户触发（常表现为 /summarize-notes），模板展开为一条发给模型的消息
server.registerPrompt(
  "summarize-notes",
  {
    title: "总结备忘录",
    description: "把全部备忘录内容整理成一份摘要",
    argsSchema: {
      style: z
        .enum(["brief", "detailed"])
        .optional()
        .describe("摘要风格：brief 一句话 / detailed 逐条展开，默认 brief"),
    },
  },
  ({ style = "brief" }) => {
    const all = [...notes.entries()]
      .map(([id, n]) => `#${id} ${n.title}：${n.content}`)
      .join("\n");
    const requirement =
      style === "detailed"
        ? "请逐条展开，说明每条的要点和待办"
        : "请用一句话概括核心事项";
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `以下是我的备忘录：\n\n${all}\n\n${requirement}。`,
          },
        },
      ],
    };
  }
);

// ─────────────────────────── 启动（stdio） ───────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
// 注意：日志必须走 stderr，stdout 被 JSON-RPC 消息占用
console.error("notes-tester MCP server 已通过 stdio 启动");
