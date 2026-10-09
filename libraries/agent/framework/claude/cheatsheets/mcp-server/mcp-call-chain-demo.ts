/*
 * 演示:agent 调用自建 MCP server 的一次完整链路回放。
 * 输入:两种传输(stdio 本地子进程、Streamable HTTP 端点),注册代码相同。
 * 操作:切换传输,在六站之间步进:mcpServers 配置 → 拉起/连接 → initialize →
 *       工具发现(tools/list)→ 工具调用(tools/call)→ 结果回传。
 * 预期:stdio 与 HTTP 只在「怎么被拿到」上不同(子进程管道 vs HTTP 请求-响应),
 *       注册形态与工具全名完全一致;每站都标出该环最常见的断点。
 * 阅读主线:上半部分是两种传输的站点数据(纯演示数据;JSON-RPC 方法名与官方
 *           协议一致);下半部分是 Canvas 渲染外壳。
 *           不真实启动 server,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:两种传输的链路站点数据                                     */
/* ------------------------------------------------------------------ */

export type TransportId = "stdio" | "http";

export interface ChainStation {
  /** 站名(时间线标签) */
  label: string;
  /** 跨边界动作:谁与谁之间发生了什么 */
  boundary: string;
  /** 线上内容:JSON-RPC 方法 / HTTP 形态 */
  wire: string;
  /** agent 侧可见证据 */
  agentSees: string;
  /** 这一环最常见的断点 */
  breakNote: string;
}

export const TRANSPORT_LABELS: Record<TransportId, string> = {
  stdio: "stdio 本地进程",
  http: "Streamable HTTP",
};

export const CHAIN_STATIONS: Record<TransportId, ChainStation[]> = {
  stdio: [
    {
      label: "mcpServers 配置",
      boundary: "options.mcpServers 写下启动命令;键名 notes 就是 server 名",
      wire: "—(尚未发生通信)",
      agentSees: "配置键决定工具前缀 mcp__notes__*",
      breakNote: "command 不在 PATH、缺 npx:子进程拉不起来",
    },
    {
      label: "拉起子进程",
      boundary: "CLI 子进程 spawn 命令,接通 stdin / stdout 两条管道",
      wire: "进程启动,尚无协议消息",
      agentSees: "init 消息的 mcp_servers 报 notes · connected",
      breakNote: "启动即崩溃 → failed;console.log 污染 stdout 会弄坏整条协议流",
    },
    {
      label: "initialize 握手",
      boundary: "agent 经 stdin 发 initialize,server 回 serverInfo 与能力清单",
      wire: "JSON-RPC initialize",
      agentSees: "mcpServerStatus().serverInfo:notes 1.0.0",
      breakNote: "自建 SDK 版本过旧,协议版本协商失败",
    },
    {
      label: "工具发现",
      boundary: "agent 发 tools/list,server 返回每个工具的 name / description / inputSchema",
      wire: "JSON-RPC tools/list",
      agentSees: "agent 工具列表出现 mcp__notes__add_note 等全名",
      breakNote: "inputSchema 换算失败,该工具从清单里缺席",
    },
    {
      label: "工具调用",
      boundary: "模型发 tool_use(全名 + 入参),agent 经 stdin 转发 tools/call;校验通过才执行 handler",
      wire: "JSON-RPC tools/call",
      agentSees: "assistant 工具调用块:name: mcp__notes__add_note",
      breakNote: "入参不满足 schema → 校验层挡下,handler 不执行",
    },
    {
      label: "结果回传",
      boundary: "server 回 content 块,作为 tool_result 进入模型上下文,agent loop 继续",
      wire: "JSON-RPC 响应",
      agentSees: "模型组织最终回答,result 消息收尾",
      breakNote: "单次调用超时由 agent 侧 MCP_TOOL_TIMEOUT 控制",
    },
  ],
  http: [
    {
      label: "mcpServers 配置",
      boundary: "options.mcpServers 写下 type: http 与 url",
      wire: "—(尚未发生通信)",
      agentSees: "配置键决定工具前缀 mcp__notes__*",
      breakNote: "url 端口或路径写错:端点不可达",
    },
    {
      label: "建立 HTTP 连接",
      boundary: "agent 向 url 发出首个请求,建立连接",
      wire: "HTTP 请求 → 端点",
      agentSees: "init 消息的 mcp_servers 报 notes · connected",
      breakNote: "端点不可达 → failed;要求认证且无 token → needs-auth",
    },
    {
      label: "initialize 握手",
      boundary: "initialize 以 HTTP 请求-响应完成,server 回 serverInfo 与能力清单",
      wire: "JSON-RPC initialize",
      agentSees: "mcpServerStatus().serverInfo:notes 1.0.0",
      breakNote: "server 默认不校验 Host / Origin,对外部署要自己加防护",
    },
    {
      label: "工具发现",
      boundary: "agent 发 tools/list,server 返回每个工具的 name / description / inputSchema",
      wire: "JSON-RPC tools/list",
      agentSees: "agent 工具列表出现 mcp__notes__add_note 等全名",
      breakNote: "inputSchema 换算失败,该工具从清单里缺席",
    },
    {
      label: "工具调用",
      boundary: "模型发 tool_use(全名 + 入参),agent 经 HTTP 请求转发 tools/call;校验通过才执行 handler",
      wire: "JSON-RPC tools/call",
      agentSees: "assistant 工具调用块:name: mcp__notes__add_note",
      breakNote: "认证过期或网络中断 → 单次调用报错",
    },
    {
      label: "结果回传",
      boundary: "server 在 HTTP 响应里回 content 块,作为 tool_result 进入模型上下文",
      wire: "HTTP 响应(JSON,或中途有通知时升级为 SSE 流)",
      agentSees: "模型组织最终回答,result 消息收尾",
      breakNote: "超过 25,000 token 的输出被存成文件,结果替换为路径文本",
    },
  ],
};

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface ChainSnapshot {
  transportLabel: string;
  stationLabel: string;
  boundaryLabel: string;
  agentSees: string;
}

export function buildChainSnapshot(
  transport: TransportId,
  stationIndex: number,
): ChainSnapshot {
  const stations = CHAIN_STATIONS[transport];
  const station = stations[stationIndex] ?? stations[0];

  return {
    transportLabel: TRANSPORT_LABELS[transport],
    stationLabel: `${stationIndex + 1} / ${stations.length} · ${station.label}`,
    boundaryLabel: station.boundary,
    agentSees: station.agentSees,
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:调用链路时间线(Canvas 演示载体)                          */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const TRANSPORT_COLORS: Record<TransportId, string> = {
  stdio: "#2563eb",
  http: "#16a34a",
};

export interface ChainDemoOptions {
  transport: TransportId;
  station: number;
}

export interface ChainDemoInstance {
  update(options: ChainDemoOptions): void;
  dispose(): void;
}

export function createMcpChainDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChainSnapshot) => void,
): ChainDemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ChainDemoOptions = { transport: "stdio", station: 0 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const transport: TransportId =
      current.transport === "http" ? "http" : "stdio";
    const color = TRANSPORT_COLORS[transport];
    const stations = CHAIN_STATIONS[transport];
    const stationIndex = clamp(current.station, 0, stations.length - 1);
    const station = stations[stationIndex];
    const margin = 16;
    const titleTop = 24;

    // 标题与当前站副标题
    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("自建 MCP server:agent 调用链路回放(演示数据)", margin, titleTop);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      truncate(`第 ${stationIndex + 1} 站 · ${station.label} — ${station.wire}`, 84),
      margin,
      titleTop + 17,
    );

    // 传输图例:当前传输高亮
    const legendTop = titleTop + 36;
    let legendX = margin;
    (Object.keys(TRANSPORT_LABELS) as TransportId[]).forEach((id) => {
      const active = id === transport;
      ctx.fillStyle = active ? TRANSPORT_COLORS[id] : "#cbd5e1";
      ctx.fillRect(legendX, legendTop - 8, 10, 10);
      ctx.fillStyle = active ? "#334155" : "#94a3b8";
      ctx.font = `${active ? "600 " : ""}11px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(TRANSPORT_LABELS[id], legendX + 14, legendTop);
      legendX += 14 + ctx.measureText(TRANSPORT_LABELS[id]).width + 16;
    });

    // 左列:六站时间线
    const listTop = legendTop + 16;
    const bottomPad = 24;
    const rowHeight = Math.min(
      56,
      (height - listTop - bottomPad) / stations.length,
    );
    const railX = margin + 10;

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX, listTop + 10);
    ctx.lineTo(railX, listTop + rowHeight * (stations.length - 1) + 10);
    ctx.stroke();

    stations.forEach((item, index) => {
      const rowTop = listTop + index * rowHeight;
      const centerY = rowTop + 10;
      const active = index === stationIndex;
      const done = index < stationIndex;

      ctx.beginPath();
      ctx.arc(railX, centerY, active ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = active ? color : done ? "#94a3b8" : "#e2e8f0";
      ctx.fill();

      ctx.fillStyle = active ? "#0f172a" : "#64748b";
      ctx.font = `${active ? "600 " : ""}12px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(`${index + 1}. ${item.label}`, railX + 18, centerY + 4);
    });

    // 右侧详情面板:跨边界动作 / 线上内容 / agent 侧可见 / 常见断点
    const panelX = railX + 150;
    const panelWidth = width - panelX - margin;
    if (panelWidth > 220) {
      const panelTop = listTop - 4;
      const panelHeight = rowHeight * stations.length - 6;
      ctx.fillStyle = "#f8fafc";
      roundRect(panelX, panelTop, panelWidth, panelHeight, 10);
      ctx.fill();

      const rows: Array<[string, string, string]> = [
        ["跨边界动作", station.boundary, "#334155"],
        ["线上内容", station.wire, "#334155"],
        ["agent 侧可见", station.agentSees, "#0f172a"],
        ["常见断点", station.breakNote, "#b45309"],
      ];

      const detailRowHeight = (panelHeight - 20) / rows.length;
      rows.forEach(([label, text, textColor], index) => {
        const rowTop = panelTop + 12 + index * detailRowHeight;
        ctx.fillStyle = color;
        ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(label, panelX + 12, rowTop + 8);
        wrapText(
          text,
          panelX + 12,
          rowTop + 22,
          panelWidth - 24,
          14,
          textColor,
          3,
        );
      });
    }

    // 底部来源说明
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      "JSON-RPC 方法名与官方协议一致;同一份注册代码,两种传输只换「怎么被拿到」",
      margin,
      height - 8,
    );

    emit(buildChainSnapshot(transport, stationIndex));
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function truncate(text: string, maxChars: number): string {
    return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
  }

  function wrapText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    color: string,
    maxLines: number,
  ) {
    ctx.fillStyle = color;
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";

    const lines: string[] = [];
    let line = "";
    for (const char of text) {
      if (line && ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
    if (line) {
      lines.push(line);
    }

    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length > 0) {
      visible[maxLines - 1] = `${visible[maxLines - 1]}…`;
    }
    visible.forEach((row, index) => {
      ctx.fillText(row, x, y + index * lineHeight);
    });
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
    update(options: ChainDemoOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
