/**
 * 测试客户端 —— 拉起 server.js 子进程，依次演练三种原语：
 *   tools/list + tools/call        调用 add-note / delete-note
 *   resources/list + resources/read 读取 note://notes 和 note://notes/{id}
 *   prompts/list + prompts/get     获取 summarize-notes 展开后的消息
 *
 * 运行：npm test
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
});
const client = new Client({ name: "notes-tester-client", version: "0.1.0" });
await client.connect(transport);

// ═══════════ 工具 ═══════════
console.log("═══ Tools ═══");
const { tools } = await client.listTools();
console.log(
  "tools/list:",
  tools.map((t) => `${t.name} —— ${t.description}`)
);

const added = await client.callTool({
  name: "add-note",
  arguments: { title: "健身", content: "晚上八点，带上换洗衣服" },
});
console.log("call add-note:", added.content[0].text);

const removed = await client.callTool({
  name: "delete-note",
  arguments: { id: "2" },
});
console.log("call delete-note:", removed.content[0].text);

// ═══════════ 资源 ═══════════
console.log("\n═══ Resources ═══");
const { resources } = await client.listResources();
console.log(
  "resources/list:",
  resources.map((r) => `${r.uri} —— ${r.name}`)
);

const { resourceTemplates } = await client.listResourceTemplates();
console.log(
  "resources/templates/list:",
  resourceTemplates.map((r) => `${r.uriTemplate} —— ${r.name}`)
);

const list = await client.readResource({ uri: "note://notes" });
console.log("read note://notes:\n" + list.contents[0].text);

const detail = await client.readResource({ uri: "note://notes/1" });
console.log("read note://notes/1:\n" + detail.contents[0].text);

// ═══════════ 提示词 ═══════════
console.log("\n═══ Prompts ═══");
const { prompts } = await client.listPrompts();
console.log(
  "prompts/list:",
  prompts.map((p) => `${p.name} —— ${p.description}`)
);

const prompt = await client.getPrompt({
  name: "summarize-notes",
  arguments: { style: "detailed" },
});
console.log("get summarize-notes:\n" + prompt.messages[0].content.text);

await client.close();
