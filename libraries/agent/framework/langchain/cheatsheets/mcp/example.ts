/**
 * 范例介绍：确定性模拟 MCPAdapter 的工具桥接结构——两个 MCP server
 * （filesystem · stdio 与 notes · http，其中 read_file 故意同名）的
 * 工具清单，经过 listTools() 的服务器过滤与服务器名前缀后，进入
 * Agent 工具面时模型实际看到什么；关闭前缀且两个 server 都入选时，
 * 演示真实的 Tool name collision 报错如何让 listTools() 抛出。
 * 输入：prefix（prefixToolNameWithServerName）、filter（listTools 的
 * 服务器过滤）、useLocal（tools 数组里混入本地 tool() 工具）。
 * 预期结果：切换三个控件，右栏清单、来源色点与冲突红条同步变化。
 * 不依赖 @langchain/*：工具目录与冲突文案对齐 @langchain/mcp-adapters
 * v2（MCPAdapter / listTools / prefixToolNameWithServerName）的真实行为，
 * 已在 langchainjs 仓库源码中核对。
 * 阅读主线：先看 SERVERS 与 buildBridge 两组数据，再看 draw 的三栏绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FilterKey = 'all' | 'filesystem' | 'notes';

export interface ExampleOptions {
  prefix: boolean;
  filter: FilterKey;
  useLocal: boolean;
}

export interface ExampleSnapshot {
  prefixLabel: string;
  bridgedTools: number;
  localTools: number;
  modelFaces: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

/** 模拟的 MCP server：进程外进程 / 远端服务，各自暴露一组工具 */
interface ServerSpec {
  name: string;
  /** 展示用传输方式徽标 */
  transport: string;
  /** server 侧原始工具名（故意让两个 server 都有 read_file） */
  tools: string[];
  color: string;
}

const SERVERS: ServerSpec[] = [
  {
    name: 'filesystem',
    transport: 'stdio',
    tools: ['read_file', 'write_file', 'list_directory'],
    color: '#2563eb',
  },
  {
    name: 'notes',
    transport: 'http',
    tools: ['read_file', 'create_note'],
    color: '#7c3aed',
  },
];

/** 模拟的本地 tool() 工具：不经 adapter，不参与前缀与过滤 */
const LOCAL_TOOLS = ['get_weather'];
const LOCAL_COLOR = '#0d9488';

/** 对齐 client.ts assertNoToolNameCollisions 的真实报错文案（分行节选） */
const COLLISION_LINES = [
  'Tool name collision: a tool named',
  '"read_file" is exposed more than',
  'once (filesystem, notes).',
];

interface BridgeEntry {
  serverName: string;
  originalName: string;
  /** 转换后模型看到（或将要看到）的名字 */
  outputName: string;
  color: string;
}

/** listTools() 的一步模拟：过滤 → 命名；冲突时返回 collided = true */
function buildBridge(options: ExampleOptions): {
  entries: BridgeEntry[];
  collided: boolean;
} {
  const selected = SERVERS.filter(
    (server) => options.filter === 'all' || options.filter === server.name,
  );

  const entries: BridgeEntry[] = [];
  for (const server of selected) {
    for (const toolName of server.tools) {
      entries.push({
        serverName: server.name,
        originalName: toolName,
        outputName: options.prefix ? `${server.name}__${toolName}` : toolName,
        color: server.color,
      });
    }
  }

  // 关前缀时跨 server 同名 → listTools() 直接抛 MCPClientError
  const names = entries.map((entry) => entry.outputName);
  const collided =
    !options.prefix && new Set(names).size !== names.length;

  return { entries, collided };
}

// 超出可用宽度时截断加省略号，保证文字不溢出卡片
function clipText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let clipped = text;
  while (
    clipped.length > 1 &&
    context.measureText(`${clipped}…`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

// 用 arcTo 手绘圆角矩形，不依赖较新的 roundRect API
function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  dimmed: boolean,
): void {
  context.fillStyle = dimmed ? '#f1f5f9' : '#ffffff';
  context.strokeStyle = dimmed ? '#e2e8f0' : '#dbe3f0';
  context.lineWidth = 1;
  roundedRectPath(context, x, y, width, height, 8);
  context.fill();
  context.stroke();

  context.fillStyle = dimmed ? '#94a3b8' : '#475569';
  context.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  context.fillText(clipText(context, title, width - 20), x + 12, y + 22);
}

function drawDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, 4, 0, Math.PI * 2);
  context.fill();
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleOptions = { prefix: true, filter: 'all', useLocal: true };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const { entries, collided } = buildBridge(current);
    const monoFont = '11.5px ui-monospace, SFMono-Regular, Menlo, monospace';

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        'MCP 工具桥接：server → listTools() → Agent 工具面',
        width - 96,
      ),
      48,
      40,
    );

    const filterLabel =
      current.filter === 'all'
        ? "listTools()  ·  全部 server"
        : `listTools('${current.filter}')`;
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        `确定性模拟 · prefixToolNameWithServerName: ${current.prefix} · ${filterLabel}`,
        width - 96,
      ),
      48,
      62,
    );

    // 三栏：左 = server（进程外），中 = adapter（发现与命名），右 = 模型看到的
    const margin = 48;
    const gap = 16;
    const panelWidth = Math.max(
      90,
      Math.floor((width - margin * 2 - gap * 2) / 3),
    );
    const topY = 84;
    const bottomReserve = 56;
    const panelHeight = height - topY - bottomReserve;
    const leftX = margin;
    const midX = leftX + panelWidth + gap;
    const rightX = midX + panelWidth + gap;

    // 左栏：server 卡片，filter 排除的 server 整卡变淡并标注
    drawPanel(
      drawingContext,
      leftX,
      topY,
      panelWidth,
      panelHeight,
      'MCP server · 进程外',
      false,
    );
    let cursorY = topY + 42;
    for (const server of SERVERS) {
      const selected =
        current.filter === 'all' || current.filter === server.name;
      const cardHeight = 26 + server.tools.length * 17;

      drawingContext.fillStyle = selected ? '#f8fafc' : '#f1f5f9';
      drawingContext.strokeStyle = selected ? '#dbe3f0' : '#e8edf4';
      if (!selected) {
        drawingContext.setLineDash([5, 4]);
      }
      roundedRectPath(drawingContext, leftX + 10, cursorY, panelWidth - 20, cardHeight, 6);
      drawingContext.fill();
      drawingContext.stroke();
      drawingContext.setLineDash([]);

      const titleColor = selected ? server.color : '#94a3b8';
      drawingContext.fillStyle = titleColor;
      drawingContext.font = `600 12px ui-sans-serif, system-ui, sans-serif`;
      drawingContext.fillText(server.name, leftX + 22, cursorY + 17);
      // 名字宽度要在当前 sans 字体下量，再切到 mono 画传输徽标
      const nameWidth = drawingContext.measureText(server.name).width;

      drawingContext.font = '10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillStyle = selected ? '#64748b' : '#b6c2d2';
      const badge = server.transport + (selected ? '' : ' · 未选中');
      drawingContext.fillText(
        clipText(
          drawingContext,
          badge,
          panelWidth - 48 - nameWidth - 24,
        ),
        leftX + 22 + nameWidth + 24,
        cursorY + 17,
      );

      drawingContext.font = monoFont;
      server.tools.forEach((toolName, toolIndex) => {
        const rowY = cursorY + 36 + toolIndex * 17;
        drawDot(
          drawingContext,
          leftX + 24,
          rowY - 4,
          selected ? server.color : '#cbd5e1',
        );
        drawingContext.fillStyle = selected ? '#334155' : '#b6c2d2';
        drawingContext.fillText(
          clipText(drawingContext, toolName, panelWidth - 62),
          leftX + 34,
          rowY,
        );
      });

      cursorY += cardHeight + 10;
    }

    // 行距按可用高度自适应，工具多的组合在矮面板里也不会溢出
    const mapLineHeight = Math.max(
      12,
      Math.min(17, Math.floor((panelHeight - 108) / Math.max(1, entries.length))),
    );

    // 中栏：adapter 的过滤与命名规则 + 转换映射
    drawPanel(
      drawingContext,
      midX,
      topY,
      panelWidth,
      panelHeight,
      'MCPAdapter · 发现与命名',
      false,
    );

    drawingContext.font = monoFont;
    drawingContext.fillStyle = '#0f766e';
    drawingContext.fillText(
      clipText(
        drawingContext,
        current.filter === 'all'
          ? 'listTools()'
          : `listTools('${current.filter}')`,
        panelWidth - 24,
      ),
      midX + 12,
      topY + 42,
    );
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(
      clipText(
        drawingContext,
        `prefixToolNameWithServerName: ${current.prefix}`,
        panelWidth - 24,
      ),
      midX + 12,
      topY + 60,
    );
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.fillText(
      current.prefix ? '命名：服务器名__原名' : '命名：保留原名',
      midX + 12,
      topY + 77,
    );

    let mapY = topY + 100;
    for (const entry of entries) {
      const isCollisionRow =
        collided && entry.outputName === 'read_file';
      drawingContext.font = monoFont;
      drawingContext.fillStyle = isCollisionRow ? '#dc2626' : '#64748b';
      drawingContext.fillText(
        clipText(drawingContext, entry.originalName, (panelWidth - 36) / 2 - 8),
        midX + 12,
        mapY,
      );
      drawingContext.fillStyle = isCollisionRow ? '#dc2626' : '#94a3b8';
      drawingContext.fillText('→', midX + panelWidth / 2 - 4, mapY);
      drawDot(drawingContext, midX + panelWidth / 2 + 8, mapY - 4, entry.color);
      drawingContext.fillStyle = isCollisionRow ? '#dc2626' : '#334155';
      drawingContext.fillText(
        clipText(
          drawingContext,
          entry.outputName,
          (panelWidth - 36) / 2 - 12,
        ),
        midX + panelWidth / 2 + 18,
        mapY,
      );
      mapY += mapLineHeight;
    }

    // 右栏：Agent 工具面——冲突时整栏换成报错条
    drawPanel(
      drawingContext,
      rightX,
      topY,
      panelWidth,
      panelHeight,
      'Agent 工具面 · 模型看到的',
      collided,
    );

    if (collided) {
      const boxX = rightX + 10;
      const boxY = topY + 36;
      const boxW = panelWidth - 20;
      drawingContext.fillStyle = '#fef2f2';
      drawingContext.strokeStyle = '#fca5a5';
      drawingContext.lineWidth = 1.5;
      drawingContext.setLineDash([6, 4]);
      roundedRectPath(drawingContext, boxX, boxY, boxW, 108, 6);
      drawingContext.fill();
      drawingContext.stroke();
      drawingContext.setLineDash([]);

      drawingContext.fillStyle = '#dc2626';
      drawingContext.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('MCPClientError（listTools() 抛出）', boxX + 10, boxY + 20);

      drawingContext.font = monoFont;
      drawingContext.fillStyle = '#991b1b';
      COLLISION_LINES.forEach((line, index) => {
        drawingContext.fillText(
          clipText(drawingContext, line, boxW - 20),
          boxX + 10,
          boxY + 40 + index * 16,
        );
      });

      drawingContext.fillStyle = '#b45309';
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '模型什么也看不到：开启前缀即可避免',
        boxX + 10,
        boxY + 94,
      );
    } else {
      // 右栏清单行距同样按可用高度自适应
      const rowCount = entries.length + (current.useLocal ? 3 : 0);
      const listLineHeight = Math.max(
        13,
        Math.min(18, Math.floor((panelHeight - 50) / Math.max(1, rowCount))),
      );

      let listY = topY + 44;
      for (const entry of entries) {
        drawDot(drawingContext, rightX + 20, listY - 4, entry.color);
        drawingContext.font = monoFont;
        drawingContext.fillStyle = '#334155';
        drawingContext.fillText(
          clipText(drawingContext, entry.outputName, panelWidth - 44),
          rightX + 30,
          listY,
        );
        listY += listLineHeight;
      }

      if (current.useLocal) {
        listY += 6;
        drawingContext.fillStyle = LOCAL_COLOR;
        drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText('本地 tool() 工具', rightX + 12, listY);
        listY += 16;
        for (const toolName of LOCAL_TOOLS) {
          drawDot(drawingContext, rightX + 20, listY - 4, LOCAL_COLOR);
          drawingContext.font = monoFont;
          drawingContext.fillStyle = '#334155';
          drawingContext.fillText(
            clipText(drawingContext, toolName, panelWidth - 44),
            rightX + 30,
            listY,
          );
          listY += listLineHeight;
        }
      }
    }

    emit({
      prefixLabel: current.prefix ? '开（默认）' : '关',
      bridgedTools: entries.length,
      localTools: current.useLocal ? LOCAL_TOOLS.length : 0,
      modelFaces: collided
        ? 'listTools() 抛错'
        : String(entries.length + (current.useLocal ? LOCAL_TOOLS.length : 0)),
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
