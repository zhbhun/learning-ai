/**
 * 范例一（BackendRouting）：backend 选择对文件去向与持久性的确定性模拟器。
 * 输入 backend 配置（StateBackend 单一 / CompositeBackend 草稿+Store /
 * FilesystemBackend 本地磁盘）与 write_file 目标路径，按官方路由规则
 * （长前缀优先、未匹配走默认 backend、harness 内部数据写默认 backend）判定
 * 文件落到哪个 backend、作用域是 thread 内还是跨 thread、生命周期如何。
 * 范例二（PermissionCheck）：permissions 声明与工具调用拦截关系的确定性
 * 模拟器。输入工具（write_file / read_file）与目标路径，对一组三明治规则
 * （deny 具体 → allow 工作区 → deny 兜底）按声明顺序逐条求值，首个命中的
 * 规则生效，未匹配默认允许——展示同一调用在允许 / 拒绝路径下的结果差异。
 * 输入或前置状态：Controls 提供的配置与路径；纯本地 TS 模拟，glob 匹配、
 * 路由与错误文本为示意实现（真实行为以 deepagents 运行时为准），不依赖
 * @langchain/*。
 * 主要操作：切换 backend 配置 / 写入路径；切换工具 / 目标路径。
 * 预期结果：路由目标、作用域、生命周期读数随配置切换；命中规则与调用结果
 * （已写入 / 已拒绝）随路径与操作切换。
 * 阅读主线：BACKEND_PRESETS、BACKEND_PATHS、PERMISSION_RULES 三张查表，
 * 以及 routeFile() 与 evaluatePermission() 的判定逻辑。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// ---------- 共享绘制 ----------

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const PANEL = '#eef3ff';
const GREEN = '#1a7f54';
const RED = '#b3362b';
const GREEN_BG = '#e8f5ee';
const RED_BG = '#fbeeea';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text.length;
  while (cut > 1 && ctx.measureText(`${text.slice(0, cut)}…`).width > maxWidth) {
    cut -= 1;
  }
  return `${text.slice(0, cut)}…`;
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(text, x, y);
}

// ---------- 范例一：backend 路由与持久性 ----------

export interface BackendOptions {
  backendPreset: 'state' | 'composite' | 'filesystem';
  backendPath: string;
}

export interface BackendSnapshot {
  backendLabel: string;
  routedTo: string;
  scopeLabel: string;
  lifetimeLabel: string;
}

export interface BackendInstance {
  update(options: BackendOptions): void;
  dispose(): void;
}

interface PathSim {
  path: string;
  kind: string;
}

// 写入路径查表：草稿 / 记忆 / 交付产物 / harness 内部数据四类典型文件
const BACKEND_PATHS: PathSim[] = [
  { path: '/notes/draft.md', kind: '草稿：计划与中间产物' },
  { path: '/memories/agent.md', kind: '跨 thread 记忆' },
  { path: '/project/report.md', kind: '交付产物' },
  { path: '/conversation_history/0002.md', kind: 'harness 内部数据' },
];

const PRESET_LABELS: Record<BackendOptions['backendPreset'], string> = {
  state: 'StateBackend（默认）',
  composite: 'CompositeBackend：State + Store',
  filesystem: 'FilesystemBackend',
};

interface BackendRoute {
  target: 'state' | 'store' | 'disk';
  backendName: string;
  scope: string;
  lifetime: string;
  note: string;
  conclusion: string;
}

// 路由判定：模拟 CompositeBackend 的前缀匹配与「内部数据进默认 backend」
function routeFile(
  preset: BackendOptions['backendPreset'],
  path: string,
): BackendRoute {
  const internal =
    path.startsWith('/conversation_history/') ||
    path.startsWith('/large_tool_results/');

  if (preset === 'state') {
    return {
      target: 'state',
      backendName: 'StateBackend',
      scope: 'thread 内（subagent 共享）',
      lifetime: '随 checkpointer 留在本 thread',
      note: '默认形态：草稿区，不是持久层',
      conclusion:
        '所有文件都进本 thread 的状态：thread 结束即归档，新 thread 看不到——默认形态只是草稿机',
    };
  }

  if (preset === 'filesystem') {
    return {
      target: 'disk',
      backendName: 'FilesystemBackend',
      scope: '宿主机磁盘 rootDir',
      lifetime: '进程与磁盘存活即在',
      note: '部署红线：直接访问宿主机',
      conclusion: internal
        ? '内部数据直接混进宿主项目目录——官方因此建议用 CompositeBackend 包装 FilesystemBackend'
        : '文件落到宿主磁盘：本地 CLI / CI 可用，面向网络的部署禁止（默认 virtualMode:false 无安全边界）',
    };
  }

  // CompositeBackend：/memories/ 前缀进 Store，其余（含内部数据）进默认 State
  if (path.startsWith('/memories/')) {
    return {
      target: 'store',
      backendName: "StoreBackend（'/memories/' 前缀）",
      scope: '跨 thread（namespace 隔离）',
      lifetime: '持久保留，新 thread 可读',
      note: '生产持久层',
      conclusion:
        '记忆文件路由到 StoreBackend：thread 结束仍在，新 thread 按 namespace 可见',
    };
  }
  return {
    target: 'state',
    backendName: 'StateBackend（默认 backend）',
    scope: 'thread 内',
    lifetime: '随 thread 归档，内部数据保持短暂',
    note: '默认 backend 兜住其余前缀',
    conclusion: internal
      ? '内部数据写进默认 backend（官方建议默认用 State，保持内部数据短暂）'
      : '草稿留在默认 StateBackend：thread 结束即归档，不污染持久层',
  };
}

export function createBackendExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BackendSnapshot) => void,
): BackendInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: BackendOptions = {
    backendPreset: 'composite',
    backendPath: '/memories/agent.md',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(420, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const route = routeFile(current.backendPreset, current.backendPath);
    const pathSim =
      BACKEND_PATHS.find((p) => p.path === current.backendPath) ??
      BACKEND_PATHS[0];
    const pad = 36;

    // 头部：标题 + 配置摘要
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('backend 路由：同一 write_file 的去向与生命周期', pad, pad + 6);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `配置：${PRESET_LABELS[current.backendPreset]} · write_file('${pathSim.path}')`,
      pad,
      pad + 30,
    );

    // 左侧：目标路径面板
    const leftW = 236;
    const boxTop = 104;
    const leftH = 92;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    roundedRect(ctx, pad, boxTop, leftW, leftH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('write_file 目标', pad + 14, boxTop + 22);

    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(fitText(ctx, pathSim.path, leftW - 28), pad + 14, boxTop + 44);

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(fitText(ctx, pathSim.kind, leftW - 28), pad + 14, boxTop + 66);

    // 右侧：backend 面板（composite 两个成员，其余一个）
    const rightX = pad + leftW + 88;
    const rightW = width - pad - rightX;
    const memberH = 54;
    const memberGap = 12;
    const members: Array<{
      name: string;
      sub: string;
      active: boolean;
      danger?: boolean;
    }> =
      current.backendPreset === 'composite'
        ? [
            {
              name: 'StateBackend（默认 backend）',
              sub: 'thread 内草稿 · 内部数据',
              active: route.target === 'state',
            },
            {
              name: "StoreBackend · '/memories/'",
              sub: '跨 thread 持久 · namespace 隔离',
              active: route.target === 'store',
            },
          ]
        : current.backendPreset === 'state'
          ? [
              {
                name: 'StateBackend',
                sub: 'thread 内草稿 · subagent 共享',
                active: true,
              },
            ]
          : [
              {
                name: 'FilesystemBackend · rootDir',
                sub: '宿主机磁盘 · virtualMode:true 仅路径沙箱',
                active: true,
                danger: true,
              },
            ];

    const membersTop = boxTop + Math.max(
      0,
      (leftH - members.length * memberH - (members.length - 1) * memberGap) / 2,
    );

    members.forEach((member, index) => {
      const y = membersTop + index * (memberH + memberGap);
      const active = member.active;
      ctx.fillStyle = active ? PANEL : '#ffffff';
      ctx.strokeStyle = active
        ? member.danger
          ? RED
          : BLUE
        : LINE;
      ctx.lineWidth = active ? 2 : 1.2;
      roundedRect(ctx, rightX, y, rightW, memberH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = `600 12px ${MONO}`;
      ctx.fillStyle = active ? (member.danger ? RED : BLUE) : MUTED;
      ctx.fillText(fitText(ctx, member.name, rightW - 24), rightX + 14, y + 22);

      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(
        fitText(ctx, member.sub, rightW - 24),
        rightX + 14,
        y + 40,
      );
    });

    // 路径面板到命中成员的箭头
    const activeIndex = members.findIndex((m) => m.active);
    const arrowEndY =
      membersTop + activeIndex * (memberH + memberGap) + memberH / 2;
    const arrowStartX = pad + leftW + 14;
    const arrowEndX = rightX - 12;
    ctx.strokeStyle = route.target === 'disk' ? RED : BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowStartX, boxTop + leftH / 2);
    ctx.lineTo(arrowEndX - 8, arrowEndY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(arrowEndX - 10, arrowEndY - 5);
    ctx.lineTo(arrowEndX - 10, arrowEndY + 5);
    ctx.closePath();
    ctx.fillStyle = route.target === 'disk' ? RED : BLUE;
    ctx.fill();

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('前缀路由', (arrowStartX + arrowEndX) / 2 - 20, boxTop + leftH / 2 - 8);

    // 中部：作用域 / 生命周期 / 说明三行读数
    const rowsTop = boxTop + leftH + 42;
    const rows: Array<[string, string]> = [
      ['路由目标', route.backendName],
      ['作用域', route.scope],
      ['生命周期', route.lifetime],
    ];
    rows.forEach(([label, value], index) => {
      const y = rowsTop + index * 26;
      drawLabel(ctx, label, pad, y, MUTED);
      ctx.font = `600 13px ${FONT}`;
      ctx.fillStyle = INK;
      ctx.fillText(value, pad + 96, y);
    });

    if (current.backendPreset === 'filesystem') {
      ctx.font = `600 12px ${FONT}`;
      ctx.fillStyle = RED;
      ctx.fillText(
        '部署红线：直接访问宿主机，已部署的 agent 禁止使用 FilesystemBackend / LocalShellBackend',
        pad,
        rowsTop + 3 * 26 + 4,
      );
    }

    // 底部结论
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, route.conclusion, width - pad * 2),
      pad,
      height - 18,
    );

    emit({
      backendLabel: PRESET_LABELS[current.backendPreset],
      routedTo: route.backendName,
      scopeLabel: route.scope,
      lifetimeLabel: route.lifetime,
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

// ---------- 范例二：permissions 求值与拦截 ----------

export interface PermissionOptions {
  permissionTool: 'write_file' | 'read_file';
  permissionPath: string;
}

export interface PermissionSnapshot {
  toolLabel: string;
  path: string;
  hitRule: string;
  resultLabel: string;
}

export interface PermissionInstance {
  update(options: PermissionOptions): void;
  dispose(): void;
}

interface RuleSim {
  id: string;
  operations: Array<'read' | 'write'>;
  paths: string[];
  mode: 'allow' | 'deny';
  note: string;
}

// 三明治规则集：先挡敏感（含一条只挡写的规则演示 operations 过滤），
// 再放行工作区，最后兜底拒绝——正文与 Show code 的规则与此一致
const PERMISSION_RULES: RuleSim[] = [
  {
    id: 'R1',
    operations: ['write'],
    paths: ['/workspace/README.md'],
    mode: 'deny',
    note: '只挡写：README 可读不可改',
  },
  {
    id: 'R2',
    operations: ['read', 'write'],
    paths: ['/workspace/.env', '/workspace/secrets/**'],
    mode: 'deny',
    note: '敏感文件读写全拒',
  },
  {
    id: 'R3',
    operations: ['read', 'write'],
    paths: ['/workspace/**'],
    mode: 'allow',
    note: '放行工作区其余路径',
  },
  {
    id: 'R4',
    operations: ['read', 'write'],
    paths: ['/**'],
    mode: 'deny',
    note: '兜底：工作区之外全部拒绝',
  },
];

// 极简 glob 匹配：精确匹配或 '<base>/**' 前缀匹配（官方 paths 支持 ** 与 {a,b}）
function matchGlob(path: string, pattern: string): boolean {
  if (pattern === '/**') {
    return true;
  }
  if (pattern.endsWith('/**')) {
    const base = pattern.slice(0, -3);
    return path === base || path.startsWith(`${base}/`);
  }
  return path === pattern;
}

interface PermissionEvaluation {
  operation: 'read' | 'write';
  rows: Array<{ rule: RuleSim; matched: boolean }>;
  hitIndex: number;
  allowed: boolean;
}

// 求值逻辑：按声明顺序找首个「操作匹配且路径匹配」的规则；未命中默认允许
function evaluatePermission(
  tool: PermissionOptions['permissionTool'],
  path: string,
): PermissionEvaluation {
  const operation: 'read' | 'write' =
    tool === 'write_file' ? 'write' : 'read';
  const rows = PERMISSION_RULES.map((rule) => ({
    rule,
    matched:
      rule.operations.includes(operation) &&
      rule.paths.some((pattern) => matchGlob(path, pattern)),
  }));
  const hitIndex = rows.findIndex((row) => row.matched);
  return {
    operation,
    rows,
    hitIndex,
    allowed: hitIndex === -1 ? true : rows[hitIndex].rule.mode === 'allow',
  };
}

export function createPermissionExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PermissionSnapshot) => void,
): PermissionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: PermissionOptions = {
    permissionTool: 'write_file',
    permissionPath: '/workspace/README.md',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(460, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const evaluation = evaluatePermission(
      current.permissionTool,
      current.permissionPath,
    );
    const pad = 36;

    // 头部：标题 + 求值摘要
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('permissions 求值：首个命中的规则生效', pad, pad + 6);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `${current.permissionTool} → operations 里的 '${evaluation.operation}' 语义 · 按声明顺序求值，未匹配默认允许`,
      pad,
      pad + 30,
    );

    // 规则列表：每行 = 模式徽标 + 规则文本 + 求值状态
    const ruleTop = 100;
    const ruleH = 46;
    const ruleGap = 8;
    const badgeW = 52;

    evaluation.rows.forEach((row, index) => {
      const y = ruleTop + index * (ruleH + ruleGap);
      const afterHit =
        evaluation.hitIndex >= 0 && index > evaluation.hitIndex;
      const isHit = evaluation.hitIndex === index;

      ctx.fillStyle = isHit
        ? row.rule.mode === 'deny'
          ? RED_BG
          : GREEN_BG
        : '#ffffff';
      ctx.strokeStyle = isHit
        ? row.rule.mode === 'deny'
          ? RED
          : GREEN
        : LINE;
      ctx.lineWidth = isHit ? 2 : 1.2;
      roundedRect(ctx, pad, y, width - pad * 2, ruleH, 8);
      ctx.fill();
      ctx.stroke();

      // 模式徽标
      ctx.fillStyle = row.rule.mode === 'deny' ? RED : GREEN;
      ctx.font = `700 11px ${MONO}`;
      ctx.fillText(row.rule.mode.toUpperCase(), pad + 12, y + 19);

      // 规则文本两行：operations / paths + 用途注释
      ctx.fillStyle = afterHit ? '#9aa6b6' : INK;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(
        fitText(
          ctx,
          `operations: [${row.rule.operations.join(', ')}] · paths: [${row.rule.paths.join(', ')}]`,
          width - pad * 2 - badgeW - 150,
        ),
        pad + badgeW + 12,
        y + 19,
      );

      ctx.fillStyle = afterHit ? '#9aa6b6' : MUTED;
      ctx.font = `11px ${FONT}`;
      ctx.fillText(row.rule.note, pad + badgeW + 12, y + 36);

      // 求值状态
      ctx.textAlign = 'right';
      ctx.font = `600 11px ${FONT}`;
      if (isHit) {
        ctx.fillStyle = row.rule.mode === 'deny' ? RED : GREEN;
        ctx.fillText('命中 · 生效', width - pad - 14, y + 28);
      } else if (afterHit) {
        ctx.fillStyle = '#9aa6b6';
        ctx.fillText('不再检查', width - pad - 14, y + 28);
      } else {
        ctx.fillStyle = '#9aa6b6';
        ctx.fillText('未命中', width - pad - 14, y + 28);
      }
      ctx.textAlign = 'left';
    });

    // 工具调用与结果
    const callTop = ruleTop + evaluation.rows.length * (ruleH + ruleGap) + 14;
    const callH = 56;
    const callW = (width - pad * 2 - 20) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    roundedRect(ctx, pad, callTop, callW, callH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(
      fitText(ctx, `${current.permissionTool}(...)`, callW - 24),
      pad + 14,
      callTop + 24,
    );
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(
        ctx,
        `file_path: '${current.permissionPath}'`,
        callW - 24,
      ),
      pad + 14,
      callTop + 42,
    );

    const resultX = pad + callW + 20;
    ctx.fillStyle = evaluation.allowed ? GREEN_BG : RED_BG;
    ctx.strokeStyle = evaluation.allowed ? GREEN : RED;
    ctx.lineWidth = 1.6;
    roundedRect(ctx, resultX, callTop, callW, callH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 12px ${FONT}`;
    ctx.fillStyle = evaluation.allowed ? GREEN : RED;
    ctx.fillText(
      evaluation.allowed ? '工具结果：已写入 / 已读取' : '工具结果：操作被拒绝',
      resultX + 14,
      callTop + 24,
    );
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = evaluation.allowed ? GREEN : RED;
    const hitText =
      evaluation.hitIndex >= 0
        ? `命中 ${evaluation.rows[evaluation.hitIndex].rule.id}（${evaluation.rows[evaluation.hitIndex].rule.mode}）`
        : '未匹配任何规则（默认允许）';
    ctx.fillText(
      fitText(
        ctx,
        evaluation.allowed ? hitText : `Permission denied · ${hitText}`,
        callW - 24,
      ),
      resultX + 14,
      callTop + 42,
    );

    // 底部结论
    let conclusion: string;
    if (evaluation.hitIndex >= 0) {
      const rule = evaluation.rows[evaluation.hitIndex].rule;
      conclusion = evaluation.allowed
        ? `命中 ${rule.id} allow：调用放行，继续交给 backend 路由（见上一处范例）`
        : `命中 ${rule.id} deny：调用在 backend 之前就被拦下，文件系统不发生变化`;
    } else {
      conclusion = '未匹配任何规则：宽松默认放行——生产环境用 deny 兜底关掉这条默认';
    }
    if (
      current.permissionPath === '/workspace/README.md' &&
      evaluation.hitIndex === 0
    ) {
      conclusion =
        'R1 只声明 operations: [write]：写 README 被拒，切到 read_file 则由 R3 放行——operations 是独立过滤维度';
    }

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, conclusion, width - pad * 2),
      pad,
      height - 18,
    );

    emit({
      toolLabel: `${current.permissionTool} → ${evaluation.operation}`,
      path: current.permissionPath,
      hitRule:
        evaluation.hitIndex >= 0
          ? `${evaluation.rows[evaluation.hitIndex].rule.id} ${evaluation.rows[evaluation.hitIndex].rule.mode}`
          : '未匹配（默认允许）',
      resultLabel: evaluation.allowed ? '放行' : '拒绝',
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
