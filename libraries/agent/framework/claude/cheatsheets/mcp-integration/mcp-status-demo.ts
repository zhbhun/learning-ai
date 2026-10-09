/*
 * 演示:一次会话里 MCP server 连接状态的核对过程回放。
 * 输入:四种连接场景(全部连上、stdio 拉不起来、远程要认证、缓存列表 pending)。
 * 操作:切换场景,在三个核对点之间步进:init 消息 → mcpServerStatus() → 处理动作后。
 * 预期:init 的 mcp_servers 只带 name 与 status;mcpServerStatus() 才有 serverInfo、
 *       error、tools 等完整状态;pending 不等于失败,failed 要先修配置再重连,
 *       needs-auth 要自己经 headers 带 token。
 * 阅读主线:上半部分是场景核对点数据(纯演示数据;status 取值与官方 mcp_servers /
 *           McpServerStatus 类型一致);下半部分是 Canvas 渲染外壳。
 *           全部为演示数据,不调用 LLM API,不真实连接任何 server。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:四种场景的核对点序列                                       */
/* ------------------------------------------------------------------ */

/** 与官方 mcp_servers / McpServerStatus 的 status 字段一致的五种取值 */
export type ServerStatus =
  | "connected"
  | "failed"
  | "needs-auth"
  | "pending"
  | "disabled";

export interface StatusServerRow {
  /** server 名,来自 mcpServers 的键 */
  name: string;
  status: ServerStatus;
  /** 该核对点值得注意的细节(演示值) */
  detail: string;
}

export interface StatusCheckpoint {
  /** 核对点名称:init 消息 / mcpServerStatus() / 处理动作后 */
  label: string;
  /** 该核对点的判断要点 */
  note: string;
  rows: StatusServerRow[];
}

export type StatusScenarioId =
  | "all-connected"
  | "stdio-failed"
  | "needs-auth"
  | "cached-pending";

export interface StatusScenario {
  id: StatusScenarioId;
  /** 画布标题与选项文案里展示的场景名 */
  label: string;
  /** 场景要点 */
  note: string;
  checkpoints: StatusCheckpoint[];
}

export const STATUS_SCENARIOS: Record<StatusScenarioId, StatusScenario> = {
  "all-connected": {
    id: "all-connected",
    label: "全部连上",
    note: "stdio 本地 server 与 http 远程 server 都配好并放行;",
    checkpoints: [
      {
        label: "init 消息",
        note: "init 的 mcp_servers 只带 name 与 status,先粗看一眼",
        rows: [
          { name: "workspace", status: "connected", detail: "stdio · command: npx -y @modelcontextprotocol/server-filesystem …" },
          { name: "weather", status: "connected", detail: "http · url: https://api.example.com/mcp" },
        ],
      },
      {
        label: "mcpServerStatus()",
        note: "完整状态在这里:serverInfo、server 声明的工具清单都能读到",
        rows: [
          { name: "workspace", status: "connected", detail: "serverInfo: filesystem 0.3.0 · tools: 2 个" },
          { name: "weather", status: "connected", detail: "tools: mcp__weather__get_forecast …" },
        ],
      },
      {
        label: "agent 调用工具",
        note: "工具名 = mcp__server名__工具名,出现在 assistant 的工具调用块",
        rows: [
          { name: "workspace", status: "connected", detail: "调用 mcp__workspace__list_directory 完成" },
          { name: "weather", status: "connected", detail: "调用 mcp__weather__get_forecast 完成" },
        ],
      },
    ],
  },
  "stdio-failed": {
    id: "stdio-failed",
    label: "stdio 拉不起来",
    note: "命令不存在或凭证没进来时,init 就能看出 failed;",
    checkpoints: [
      {
        label: "init 消息",
        note: "failed 是明确失败:server 进程没有起来",
        rows: [
          { name: "workspace", status: "failed", detail: "spawn npx ENOENT:命令不存在" },
          { name: "weather", status: "connected", detail: "http server 正常连接" },
        ],
      },
      {
        label: "mcpServerStatus()",
        note: "error 与原始 config 都在这里,先核对 command / args / env",
        rows: [
          { name: "workspace", status: "failed", detail: "error: spawn npx ENOENT · config: command: npx" },
          { name: "weather", status: "connected", detail: "serverInfo: weather-api 1.2.0" },
        ],
      },
      {
        label: "reconnectMcpServer()",
        note: "根因在配置时重连解决不了:修好 command / env 再重连",
        rows: [
          { name: "workspace", status: "failed", detail: "重连仍失败:命令路径问题没有变化" },
          { name: "weather", status: "connected", detail: "不受影响" },
        ],
      },
    ],
  },
  "needs-auth": {
    id: "needs-auth",
    label: "远程要认证",
    note: "server 要求认证而本地没有可用 token 时报 needs-auth;",
    checkpoints: [
      {
        label: "init 消息",
        note: "needs-auth:会话继续跑,但少这个 server 的工具",
        rows: [
          { name: "workspace", status: "connected", detail: "stdio server 正常连接" },
          { name: "weather", status: "needs-auth", detail: "http · 未提供可用 token" },
        ],
      },
      {
        label: "mcpServerStatus()",
        note: "SDK 不代跑 OAuth 流程,token 要自己带",
        rows: [
          { name: "workspace", status: "connected", detail: "serverInfo: filesystem 0.3.0" },
          { name: "weather", status: "needs-auth", detail: "config: url: https://api.example.com/mcp" },
        ],
      },
      {
        label: "headers 带 token 重跑",
        note: "headers: { Authorization: Bearer … } 注入已有 token,新会话生效",
        rows: [
          { name: "workspace", status: "connected", detail: "不受影响" },
          { name: "weather", status: "connected", detail: "认证通过,工具注册完成" },
        ],
      },
    ],
  },
  "cached-pending": {
    id: "cached-pending",
    label: "缓存列表 pending",
    note: "settings / .mcp.json 来源常见:缓存了工具列表,首次调用才连接;",
    checkpoints: [
      {
        label: "init 消息",
        note: "pending 不等于失败:可能还在连,也可能缓存了列表",
        rows: [
          { name: "workspace", status: "pending", detail: "(.mcp.json 来源 · 缓存了工具列表)" },
          { name: "weather", status: "connected", detail: "http server 正常连接" },
        ],
      },
      {
        label: "mcpServerStatus()",
        note: "仍是 pending:连接推迟到首次使用,不阻塞启动",
        rows: [
          { name: "workspace", status: "pending", detail: "status 保持 pending,等首次调用" },
          { name: "weather", status: "connected", detail: "serverInfo: weather-api 1.2.0" },
        ],
      },
      {
        label: "agent 首次调用工具",
        note: "首次使用触发连接;成功后状态转为 connected",
        rows: [
          { name: "workspace", status: "connected", detail: "首次调用完成,连接就绪" },
          { name: "weather", status: "connected", detail: "不受影响" },
        ],
      },
    ],
  },
};

export const SCENARIO_IDS: StatusScenarioId[] = [
  "all-connected",
  "stdio-failed",
  "needs-auth",
  "cached-pending",
];

export const STATUS_LABELS: Record<ServerStatus, string> = {
  connected: "已连接",
  failed: "失败",
  "needs-auth": "需认证",
  pending: "未定",
  disabled: "已停用",
};

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface StatusSnapshot {
  scenarioLabel: string;
  checkpointLabel: string;
  statusReadout: string;
}

export function buildStatusSnapshot(
  scenario: StatusScenario,
  checkpointIndex: number,
): StatusSnapshot {
  const checkpoint =
    scenario.checkpoints[checkpointIndex] ?? scenario.checkpoints[0];

  return {
    scenarioLabel: scenario.label,
    checkpointLabel: checkpoint.label,
    statusReadout: checkpoint.rows
      .map((row) => `${row.name}=${row.status}`)
      .join(" · "),
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:连接状态核对面板(Canvas 演示载体)                        */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

/** 五种状态的着色(与画布上方图例一一对应) */
const STATUS_COLORS: Record<ServerStatus, string> = {
  connected: "#16a34a",
  failed: "#dc2626",
  "needs-auth": "#7c3aed",
  pending: "#d97706",
  disabled: "#64748b",
};

export interface StatusDemoOptions {
  scenario: number;
  step: number;
}

export interface StatusDemoInstance {
  update(options: StatusDemoOptions): void;
  dispose(): void;
}

export function createMcpStatusDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StatusSnapshot) => void,
): StatusDemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: StatusDemoOptions = { scenario: 0, step: 0 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scenarioId =
      SCENARIO_IDS[clamp(current.scenario, 0, SCENARIO_IDS.length - 1)];
    const scenario = STATUS_SCENARIOS[scenarioId];
    const step = clamp(current.step, 0, scenario.checkpoints.length - 1);
    const checkpoint = scenario.checkpoints[step];
    const margin = 16;
    const titleTop = 24;

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`MCP 连接状态核对:${scenario.label}(演示数据)`, margin, titleTop);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      truncate(`${checkpoint.label} — ${checkpoint.note}`, 88),
      margin,
      titleTop + 17,
    );

    // 图例:五种状态
    const legendTop = titleTop + 36;
    let legendX = margin;
    (Object.keys(STATUS_LABELS) as ServerStatus[]).forEach((status) => {
      ctx.fillStyle = STATUS_COLORS[status];
      ctx.fillRect(legendX, legendTop - 8, 10, 10);
      ctx.fillStyle = "#334155";
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(STATUS_LABELS[status], legendX + 14, legendTop);
      legendX += 14 + ctx.measureText(STATUS_LABELS[status]).width + 16;
    });

    // server 行:状态色条 + 名字 + 状态 pill + 细节
    const listTop = legendTop + 14;
    const bottomPad = 26;
    const rowHeight = Math.min(
      72,
      (height - listTop - bottomPad) / checkpoint.rows.length,
    );

    checkpoint.rows.forEach((row, index) => {
      const rowTop = listTop + index * rowHeight;
      const color = STATUS_COLORS[row.status];

      ctx.fillStyle = color;
      ctx.fillRect(margin + 4, rowTop + 4, 4, rowHeight - 10);

      let x = margin + 20;
      ctx.fillStyle = "#334155";
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(row.name, x, rowTop + rowHeight * 0.38);
      x += ctx.measureText(row.name).width + 8;

      const label = STATUS_LABELS[row.status];
      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      const pillWidth = ctx.measureText(label).width + 14;
      ctx.fillStyle = color;
      roundRect(x, rowTop + rowHeight * 0.38 - 11, pillWidth, 15, 7);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 7, rowTop + rowHeight * 0.38 + 1);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(
        truncate(row.detail, Math.floor((width - margin - 40) / 6.2)),
        margin + 20,
        rowTop + rowHeight * 0.78,
      );
    });

    // 底部来源说明
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      "status 取值对应官方 mcp_servers / McpServerStatus 类型;纯演示数据,不真实连接",
      margin,
      height - 10,
    );

    emit(buildStatusSnapshot(scenario, step));
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function truncate(text: string, maxChars: number): string {
    return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options: StatusDemoOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
