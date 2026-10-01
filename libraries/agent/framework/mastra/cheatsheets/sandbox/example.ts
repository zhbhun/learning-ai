// 演示内容：Workspace「挂载与隔离视图」——离线示意 agent 在不同 Sandbox 后端与挂载配置下看到的文件树与工具集。
// 输入：backend（LocalSandbox / E2B / Daytona）、mountMode（单提供者 filesystem / mounts 多前缀）、networkBlockAll。
// 操作：切换控件，观察隔离方式、挂载机制、agent 可见文件树、命令与文件工具集合、网络状态的变化。
// 预期结果：单提供者时根目录直接映射一个 provider；mounts 时看到 /data、/reports、/workspace 多前缀；
//           本地后端靠 Seatbelt/Bubblewrap 隔离并以 symlink 挂载，远程后端隔离在云端、以 FUSE 挂载。
// 阅读主线：左栏实际存储 → 中栏 Workspace 与沙箱 → 右栏 agent 可见的文件树与工具。

import { readCanvasSize } from '../../assets/canvas-runtime.js';

export type Backend = 'local' | 'e2b' | 'daytona';
export type MountMode = 'single' | 'mounts';

export interface SandboxArgs { backend: Backend; mountMode: MountMode; networkBlockAll: boolean }
export interface SandboxSnapshot {
  backend: string; isolation: string; mounts: string;
  commandTools: number; fileTools: number; network: string;
}

const COMMAND_TOOLS = ['execute_command', 'get_process_output', 'kill_process'];
const FILE_TOOLS = ['read_file', 'write_file', 'edit_file', 'list_files', 'grep'];

const BACKENDS: Record<Backend, { label: string; isolation: string; remote: boolean }> = {
  local: { label: 'LocalSandbox', isolation: 'Seatbelt / Bubblewrap', remote: false },
  e2b: { label: 'E2BSandbox', isolation: '云端微 VM', remote: true },
  daytona: { label: 'DaytonaSandbox', isolation: '云端沙箱', remote: true },
};

// single = filesystem 单提供者（根目录直接映射）；mounts = 多前缀 CompositeFilesystem
const MOUNTS: Record<MountMode, Array<{ path: string; provider: string; real: string }>> = {
  single: [{ path: '/', provider: 'S3Filesystem', real: 's3://agent-data' }],
  mounts: [
    { path: '/data', provider: 'S3Filesystem', real: 's3://agent-data' },
    { path: '/reports', provider: 'GCSFilesystem', real: 'gs://agent-reports' },
    { path: '/workspace', provider: 'LocalFilesystem', real: './workspace' },
  ],
};

export function snapshotOf(args: SandboxArgs): SandboxSnapshot {
  const network = args.networkBlockAll ? '出站封锁' : args.backend === 'local' ? '宿主机网络' : '允许出站';
  return {
    backend: BACKENDS[args.backend].label,
    isolation: BACKENDS[args.backend].isolation,
    mounts: MOUNTS[args.mountMode].map((m) => `${m.path}←${m.provider}`).join(' '),
    commandTools: COMMAND_TOOLS.length,
    fileTools: FILE_TOOLS.length,
    network,
  };
}

export interface SandboxInstance { update: (args: SandboxArgs) => void; dispose: () => void }

export function createSandboxExample(canvas: HTMLCanvasElement, emit: (s: SandboxSnapshot) => void): SandboxInstance {
  const ctx = canvas.getContext('2d')!;
  let args: SandboxArgs = { backend: 'daytona', mountMode: 'mounts', networkBlockAll: false };

  function panel(x: number, w: number, title: string) {
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(x, 30, w, canvas.height - 44);
    ctx.fillStyle = '#0f172a'; ctx.font = '600 13px sans-serif'; ctx.fillText(title, x + 10, 52);
  }
  function text(t: string, x: number, y: number, color: string, bold = false, size = 12) {
    ctx.fillStyle = color; ctx.font = `${bold ? 600 : 400} ${size}px sans-serif`; ctx.fillText(t, x, y);
  }
  function mono(items: string[], x: number, y: number, color: string) {
    ctx.fillStyle = color; ctx.font = '12px ui-monospace, monospace';
    items.forEach((t, i) => ctx.fillText(t, x, y + i * 17));
  }

  function draw() {
    const { width: w, height: h } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, w, h);
    const b = BACKENDS[args.backend];
    const mounts = MOUNTS[args.mountMode];
    const pw = w / 3 - 16;
    const x1 = 8, x2 = w / 3 + 8, x3 = (2 * w) / 3 + 8;

    // 左栏：实际存储（真实位置，agent 不直接接触，只能看到挂载前缀）
    panel(x1, pw, '实际存储');
    mono(mounts.map((m) => m.provider), x1 + 12, 80, '#475569');
    mono(mounts.map((m) => m.real), x1 + 12, 100, '#94a3b8');

    // 中栏：Workspace 解析出的沙箱（隔离方式 / 网络）与挂载前缀
    panel(x2, pw, 'Workspace / Sandbox');
    ctx.strokeStyle = b.remote ? '#2563eb' : '#b45309'; ctx.lineWidth = 2;
    ctx.strokeRect(x2 + 10, 62, pw - 20, 88);
    text(`sandbox: ${b.label}`, x2 + 20, 82, '#0f172a', true);
    text(`隔离：${b.isolation}`, x2 + 20, 102, '#475569');
    text(`网络：${args.networkBlockAll ? '出站封锁' : b.remote ? '允许出站' : '宿主机网络'}`,
      x2 + 20, 122, args.networkBlockAll ? '#b91c1c' : '#15803d');
    text(b.remote ? '挂载机制：FUSE' : '挂载机制：symlink', x2 + 20, 140, '#64748b', false, 11);
    text('挂载前缀', x2 + 10, 176, '#0f172a', true);
    mono(mounts.map((m) => `${m.path} ← ${m.provider}`), x2 + 18, 196, '#2563eb');

    // 右栏：agent 可见的文件树与工具集
    panel(x3, pw, 'Agent 可见');
    text('文件树（文件工具路径）', x3 + 10, 62, '#0f172a', true);
    const tree = args.mountMode === 'single'
      ? ['/', '├─ reports.csv', '└─ docs/']
      : ['/', ...mounts.map((m, i) => `${i < mounts.length - 1 ? '├─' : '└─'} ${m.path}`)];
    mono(tree, x3 + 18, 82, '#0f172a');
    text('命令工具（经沙箱执行）', x3 + 10, 156, '#0f172a', true);
    mono(COMMAND_TOOLS, x3 + 18, 176, '#b45309');
    text(`文件工具（${FILE_TOOLS.length} 个，经 SDK 直连）`, x3 + 10, 240, '#0f172a', true);
    mono(['read_file / write_file / edit_file', 'list_files / grep / …'], x3 + 18, 260, '#475569');

    emit(snapshotOf(args));
  }

  draw();
  return {
    update(next) { args = next; draw(); },
    dispose() {},
  };
}
