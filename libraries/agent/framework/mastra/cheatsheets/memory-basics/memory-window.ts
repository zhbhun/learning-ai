/**
 * 演示内容：resource + thread 双标识定位会话，lastMessages 决定注入窗口（离线示意，不调用 LLM / 存储）。
 * 输入：resource（用户标识）、thread（会话标识）、lastMessages（窗口大小）。
 * 操作：切换 resource / thread 观察被定位的线程；拖动 lastMessages 观察窗口滑动。
 * 预期结果：同名 thread 在不同 resource 下是不同会话；窗口只保留最近 lastMessages 条，工具消息同样计数。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

type SimMessage = { role: 'user' | 'assistant' | 'tool'; text: string };

/** 离线消息库：resource -> thread -> 消息列表，模拟存储适配器里已持久化的数据。 */
const STORE: Record<string, Record<string, SimMessage[]>> = {
  'user-alice': {
    'thread-support-1': [
      { role: 'user', text: '上周的订单 1024 还没到货' },
      { role: 'assistant', text: '我帮你查一下物流' },
      { role: 'tool', text: 'tool: query-order(1024)' },
      { role: 'tool', text: 'result: 运输中' },
      { role: 'assistant', text: '包裹在运输中，预计明天到达' },
      { role: 'user', text: '发票能补开吗' },
      { role: 'assistant', text: '可以，已登记补开申请' },
      { role: 'user', text: '收货地址改成朝阳区分部' },
      { role: 'assistant', text: '地址已更新' },
      { role: 'user', text: '好的，谢谢' },
    ],
    'thread-billing-2': [
      { role: 'user', text: '本月账单金额是多少' },
      { role: 'tool', text: 'tool: query-bill(alice)' },
      { role: 'tool', text: 'result: ¥238' },
      { role: 'assistant', text: '本月账单 ¥238' },
      { role: 'user', text: '为什么比上月高' },
      { role: 'assistant', text: '多了一个增值包 ¥30，可退订' },
    ],
  },
  'user-bob': {
    'thread-support-1': [
      { role: 'user', text: '怎么重置密码' },
      { role: 'assistant', text: '在设置页点「忘记密码」' },
      { role: 'user', text: '收不到重置邮件' },
      { role: 'tool', text: 'tool: check-email(bob)' },
      { role: 'tool', text: 'result: 邮件在垃圾箱' },
    ],
  },
};

export interface MemoryWindowOptions { resource: string; thread: string; lastMessages: number }

export interface MemoryWindowSnapshot { resource: string; thread: string; threadCount: number; windowCount: number }

export interface MemoryWindowInstance {
  update(options: MemoryWindowOptions): void;
  dispose(): void;
}

const ROLE_LABEL = { user: '用户', assistant: '助手', tool: '工具' };

export function createMemoryWindow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MemoryWindowSnapshot) => void,
): MemoryWindowInstance {
  const g = canvas.getContext('2d')!;
  if (!g) throw new Error('当前浏览器不支持 Canvas 2D。');
  let current: MemoryWindowOptions = { resource: 'user-alice', thread: 'thread-support-1', lastMessages: 10 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(460, size.width);
    const height = Math.max(380, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    const messages = STORE[current.resource]?.[current.thread] ?? [];
    // 窗口起点：超过 lastMessages 时最旧消息先出窗（与 lastMessages 行为一致）
    const from = Math.max(0, messages.length - current.lastMessages);
    g.fillStyle = '#172033';
    g.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    g.fillText(`${current.resource} @ ${current.thread}`, 20, 32);
    g.fillStyle = '#64748b';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(`注入窗口 = 最近 ${current.lastMessages} 条（工具消息同样计数；蓝色行在窗口内）`, 20, 54);
    if (messages.length === 0) {
      g.fillStyle = '#b91c1c';
      g.font = '13px ui-sans-serif, system-ui, sans-serif';
      g.fillText('该 resource 下没有这个 thread：查询历史时双标识必须同时匹配', 20, 96);
      emit({ ...current, threadCount: 0, windowCount: 0 });
      return;
    }
    const rowH = 24;
    messages.forEach((msg, i) => {
      const y = 74 + i * rowH;
      const inWindow = i >= from;
      g.fillStyle = inWindow ? '#e4edff' : '#f1f5f9';
      g.fillRect(16, y, width - 32, rowH - 5);
      g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillStyle = inWindow ? '#1d4ed8' : '#94a3b8';
      g.fillText(`#${i} ${ROLE_LABEL[msg.role]}`, 26, y + 15);
      g.fillStyle = inWindow ? '#172033' : '#94a3b8';
      g.fillText(msg.text, 110, y + 15);
    });
    emit({ resource: current.resource, thread: current.thread, threadCount: messages.length, windowCount: messages.length - from });
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
