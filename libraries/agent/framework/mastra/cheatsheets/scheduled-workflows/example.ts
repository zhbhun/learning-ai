/* 演示内容：离线示意 Mastra 定时工作流的 schedule 字段——把 cron 表达式与 IANA 时区
 *   换算成「未来几次触发时刻」，对应正文 Canvas 的 cron 时间线。
 * 输入：预设 cron 表达式、IANA 时区、展望次数（由 Storybook Controls 传入）。
 * 操作：parseCron 解析 5 段表达式 → nextFireTimes 做时区感知的逐日匹配 → describeCron 生成中文解读。
 * 预期结果：切换预设或时区后，时间轴与左下角读数同步更新；下次触发随当前时间推进。
 * 阅读主线：parseCron → nextFireTimes → describeCron → createScheduleTimeline（Canvas 渲染外壳）。
 * 边界：真实触发由 Mastra 内建调度器完成（支持 5/6/7 段 cron 与持久化状态）；本文件只用 Intl
 *   离线近似 5 段语义做演示，不发起网络请求；夏令时切换日的个别时刻可能有 ±1 小时误差，
 *   且演示只覆盖偏移量在 ±12 小时内的时区。 */

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ScheduleTimelineArgs {
  /** schedule.cron：5 段 cron 表达式 */
  cron: string;
  /** schedule.timezone：IANA 时区 */
  timezone: string;
  /** 时间轴上展望的未来触发次数 */
  fires: number;
}

export interface ScheduleSnapshot {
  cron: string;
  description: string; // cron 的中文解读
  timezone: string;
  nextFireLabel: string; // 下次触发的墙钟时刻（所选时区）
  relative: string; // 距当前的相对时间
  fireCount: number;
}

export interface ScheduleInstance {
  update(args: ScheduleTimelineArgs): void;
  dispose(): void;
}

// cron 解析：支持 `*`、数字、`a-b`、`a,b`、步进 `x/n`、范围步进 `a-b/n`

interface FieldSpec {
  values: number[]; // 升序合法取值
  restricted: boolean; // 是否不是 '*'
}

function parseField(part: string, min: number, max: number): FieldSpec {
  const values = new Set<number>();
  for (const chunk of part.split(',')) {
    const [rangePart, stepPart] = chunk.split('/');
    const step = stepPart ? Number(stepPart) : 1;
    let lo = min;
    let hi = max;
    if (rangePart !== '*') {
      const [a, b] = rangePart.split('-');
      lo = Number(a);
      hi = b === undefined ? lo : Number(b);
    }
    for (let v = lo; v <= hi; v += step) {
      values.add(v);
    }
  }
  return { values: [...values].sort((a, b) => a - b), restricted: part !== '*' };
}

export interface ParsedCron {
  minute: FieldSpec;
  hour: FieldSpec;
  dom: FieldSpec;
  month: FieldSpec;
  dow: FieldSpec;
}

export function parseCron(source: string): ParsedCron {
  const parts = source.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`演示仅支持 5 段 cron，收到 ${parts.length} 段：${source}`);
  }
  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dom: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dow: parseField(parts[4], 0, 6), // 0 = 周日；7 需先归一化为 0
  };
}

/** 经典 cron 语义：日与星期都受限时按「或」匹配，否则按「且」 */
function dayMatches(c: ParsedCron, dom: number, dow: number): boolean {
  const domOk = c.dom.restricted ? c.dom.values.includes(dom) : true;
  const dowOk = c.dow.restricted ? c.dow.values.includes(dow) : true;
  if (c.dom.restricted && c.dow.restricted) {
    return domOk || dowOk;
  }
  return domOk && dowOk;
}

/* ---------- 时区感知的下一批触发时刻（用 Intl 离线换算墙钟） ---------- */

const WEEKDAYS: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

interface WallFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dow: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function wallFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

function wallFields(utcMs: number, timeZone: string): WallFields {
  const parts = wallFormatter(timeZone).formatToParts(new Date(utcMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dow: WEEKDAYS[get('weekday')] ?? 0,
  };
}

/** 某 UTC 时刻在目标时区的偏移量（毫秒，东正西负） */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const w = wallFields(utcMs, timeZone);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - Math.floor(utcMs / 60000) * 60000;
}

export function nextFireTimes(
  cron: ParsedCron,
  timeZone: string,
  count: number,
  fromMs = Date.now(),
): number[] {
  const startMinute = Math.floor(fromMs / 60000) + 1; // 从下一个整分钟起算
  const day0 = (startMinute - (((startMinute % 1440) + 1440) % 1440)) * 60000; // 所在 UTC 日 0 点
  const out: number[] = [];

  for (let d = 0; d < 400 && out.length < count; d++) {
    const dayStartUtc = day0 + d * 86400000;
    const noonUtc = dayStartUtc + 43200000;
    // 用正午代表这一天读取月/日/星期（假设时区偏移在 ±12 小时内）
    const ref = wallFields(noonUtc, timeZone);
    if (!cron.month.values.includes(ref.month) || !dayMatches(cron, ref.day, ref.dow)) {
      continue;
    }

    // 墙钟午夜对应的 UTC 时刻；先按正午偏移近似，夏令时切换日再逐点校正
    const midnightWallUtc = Date.UTC(ref.year, ref.month - 1, ref.day);
    const offNoon = zoneOffsetMs(noonUtc, timeZone);
    const offA = zoneOffsetMs(midnightWallUtc, timeZone);
    const offB = zoneOffsetMs(midnightWallUtc + 86400000, timeZone);
    const hasTransition = offA !== offNoon || offNoon !== offB;

    for (const h of cron.hour.values) {
      for (const mi of cron.minute.values) {
        const wallMs = midnightWallUtc + (h * 60 + mi) * 60000;
        const offset = hasTransition ? zoneOffsetMs(wallMs, timeZone) : offNoon;
        const t = wallMs - offset;
        if (t / 60000 >= startMinute) {
          out.push(t);
        }
      }
    }
  }

  out.sort((a, b) => a - b);
  return out.slice(0, count);
}

/* ---------- 中文解读 ---------- */

const WEEK_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
const pad2 = (n: number) => String(n).padStart(2, '0');

function isUniformStep(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const step = values[1] - values[0];
  for (let i = 2; i < values.length; i++) {
    if (values[i] - values[i - 1] !== step) {
      return null;
    }
  }
  return step;
}

function dowList(values: number[]): string {
  return values.map((d) => `周${WEEK_SHORT[d % 7]}`).join('、');
}

function describeDay(c: ParsedCron): string {
  if (c.dom.restricted && c.dow.restricted) {
    return `每月 ${c.dom.values.join('、')} 日或 ${dowList(c.dow.values)}`;
  }
  if (c.dom.restricted) {
    return `每月 ${c.dom.values.join('、')} 日`;
  }
  if (c.dow.restricted) {
    const dows = c.dow.values;
    if (dows.length === 5 && dows[0] === 1 && dows[4] === 5) {
      return '工作日（周一至周五）';
    }
    if (isUniformStep(dows) === 1 && dows.length > 1) {
      return `周${WEEK_SHORT[dows[0]]}至周${WEEK_SHORT[dows[dows.length - 1]]}`;
    }
    return dowList(dows);
  }
  return '每天';
}

function describeTime(c: ParsedCron): string {
  const mins = c.minute.values;
  const hours = c.hour.values;
  if (!c.minute.restricted && !c.hour.restricted) {
    return '每分钟';
  }
  if (!c.hour.restricted && mins.length === 1) {
    return `每小时第 ${mins[0]} 分`;
  }
  if (mins.length === 1 && hours.length === 1) {
    return `${pad2(hours[0])}:${pad2(mins[0])}`;
  }
  if (mins.length === 1) {
    const step = isUniformStep(hours);
    if (step !== null && hours[0] % step === 0) {
      return `每 ${step} 小时（${pad2(hours[0])}:${pad2(mins[0])} 起）`;
    }
    return hours.map((h) => `${pad2(h)}:${pad2(mins[0])}`).join('、');
  }
  return `分钟 ${mins.join('、')}，小时 ${hours.join('、')}`;
}

export function describeCron(source: string): string {
  return `${describeDay(parseCron(source))} ${describeTime(parseCron(source))}`;
}

/* ---------- 展示辅助 ---------- */

export function formatWall(utcMs: number, timeZone: string): string {
  const w = wallFields(utcMs, timeZone);
  return `${pad2(w.month)}-${pad2(w.day)} ${pad2(w.hour)}:${pad2(w.minute)}`;
}

export function relativeFrom(fromMs: number, targetMs: number): string {
  const totalMinutes = Math.round(Math.max(0, targetMs - fromMs) / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟后`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const restMinutes = totalMinutes % 60;
  if (hours < 48) {
    return restMinutes ? `${hours} 小时 ${restMinutes} 分后` : `${hours} 小时后`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} 天 ${restHours} 小时后` : `${days} 天后`;
}

/* ---------- Canvas 渲染外壳：cron 时间线 ---------- */

const TICK_STEPS = [
  60000, 300000, 900000, 1800000, 3600000, 21600000, 43200000, 86400000, 604800000,
];

const FONT_SANS = '12px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const FONT_MONO = '13px ui-monospace, SFMono-Regular, Menlo, monospace';

export function createScheduleTimeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScheduleSnapshot) => void,
): ScheduleInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  let args: ScheduleTimelineArgs = { cron: '0 10 * * 1-5', timezone: 'Asia/Shanghai', fires: 5 };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    const dpr = window.devicePixelRatio || 1;
    const backingW = Math.floor(width * dpr);
    const backingH = Math.floor(height * dpr);
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const now = Date.now();
    const parsed = parseCron(args.cron);
    const fires = nextFireTimes(parsed, args.timezone, Math.max(1, Math.round(args.fires)), now);
    const description = describeCron(args.cron);
    const nextFire: number | undefined = fires.length > 0 ? fires[0] : undefined;

    emit({
      cron: args.cron,
      description,
      timezone: args.timezone,
      nextFireLabel: nextFire === undefined ? '—' : formatWall(nextFire, args.timezone),
      relative: nextFire === undefined ? '—' : relativeFrom(now, nextFire),
      fireCount: fires.length,
    });

    drawHeader(description);
    if (fires.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = FONT_SANS;
      ctx.textAlign = 'left';
      ctx.fillText('未来 13 个月内没有匹配的触发时刻。', 24, 120);
      return;
    }
    drawTimeline(now, fires);
    drawRows(now, fires);
    drawFootnote();
  }

  function drawHeader(description: string) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${FONT_MONO}`;
    ctx.fillText(`schedule.cron   ${args.cron}`, 24, 32);
    ctx.fillStyle = '#475569';
    ctx.font = FONT_SANS;
    ctx.fillText(`解读：${description}`, 24, 54);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(`schedule.timezone   ${args.timezone}`, width() - 24, 32);
  }

  function width(): number {
    return readCanvasSize(canvas).width;
  }

  function height(): number {
    return readCanvasSize(canvas).height;
  }

  function drawTimeline(now: number, fires: number[]) {
    const w = width();
    const x0 = 64;
    const x1 = w - 28;
    const axisY = 116;
    const span = Math.max(60000, fires[fires.length - 1] - now);
    const toX = (t: number) => x0 + ((t - now) / span) * (x1 - x0);

    // 刻度：选能让刻度数不超过 7 的最小步长
    const step = TICK_STEPS.find((s) => span / s <= 7) ?? TICK_STEPS[TICK_STEPS.length - 1];
    ctx.strokeStyle = '#cbd5e1';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, axisY);
    ctx.lineTo(x1, axisY);
    ctx.stroke();
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    for (let t = Math.ceil(now / step) * step; t <= now + span; t += step) {
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 5);
      ctx.stroke();
      const w = wallFields(t, args.timezone);
      const label = step < 86400000 ? `${pad2(w.hour)}:${pad2(w.minute)}` : `${pad2(w.month)}-${pad2(w.day)}`;
      ctx.fillText(label, x, axisY + 20);
    }

    // 「现在」标记
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(x0, axisY - 24);
    ctx.lineTo(x0, axisY + 6);
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'left';
    ctx.fillText('现在', x0 - 8, axisY - 30);

    // 触发点：虚线柄 + 序号圆点
    fires.forEach((t, i) => {
      const x = Math.min(Math.max(toX(t), x0 + 10), x1 - 10);
      ctx.strokeStyle = '#93c5fd';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, axisY - 2);
      ctx.lineTo(x, axisY - 34);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(x, axisY - 44, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText(String(i + 1), x, axisY - 43);
      ctx.textBaseline = 'alphabetic';
    });
  }

  function drawRows(now: number, fires: number[]) {
    const top = 158;
    const rowH = Math.min(36, (height() - top - 34) / fires.length);
    fires.forEach((t, i) => {
      const y = top + i * rowH + rowH / 2;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(40, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText(String(i + 1), 40, y + 1);
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#1e293b';
      ctx.font = FONT_MONO;
      ctx.textAlign = 'left';
      ctx.fillText(formatWall(t, args.timezone), 60, y + 4);
      ctx.fillStyle = '#94a3b8';
      ctx.font = FONT_SANS;
      ctx.fillText(`（${relativeFrom(now, t)}）`, 158, y + 4);
    });
  }

  function drawFootnote() {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `以浏览器当前时间推算（${pad2(wallFields(Date.now(), args.timezone).month)}-${pad2(wallFields(Date.now(), args.timezone).day)}）·真实触发由 Mastra 内建调度器执行`,
      24,
      height() - 12,
    );
  }

  draw();
  const observer = createResizeObserver(canvas, draw);

  return {
    update(next: ScheduleTimelineArgs) {
      args = { ...args, ...next };
      draw();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
