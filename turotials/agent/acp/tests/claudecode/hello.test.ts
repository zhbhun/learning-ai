import { spawn, type ChildProcess } from 'node:child_process';
import { Writable, Readable } from 'node:stream';
import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  ndJsonStream,
} from '@agentclientprotocol/sdk';
import type { Client } from '@agentclientprotocol/sdk';

describe('claude ACP hello', () => {
  let process: ChildProcess;

  afterEach(() => {
    process?.kill();
  });

  it('connect to claude-agent-acp, send hello prompt', async () => {
    const messages: string[] = [];

    const proc = spawn('npx', ['--yes', '@agentclientprotocol/claude-agent-acp'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    process = proc;

    const input = Writable.toWeb(proc.stdin!);
    const output = Readable.toWeb(proc.stdout!) as ReadableStream<Uint8Array>;

    const client: Client = {
      async sessionUpdate(params: any) {
        const u = params.update;
        if (u.sessionUpdate === 'agent_message_chunk' && u.content?.type === 'text') {
          messages.push(u.content.text);
        }
      },
      async requestPermission(_params: any) {
        return { outcome: { outcome: 'selected' as const, optionId: 'allow' } };
      },
      async writeTextFile(_params: any) {
        return {};
      },
      async readTextFile(_params: any) {
        return { content: '' };
      },
    };

    const conn = new ClientSideConnection(
      () => client,
      ndJsonStream(input, output),
    );

    // Initialize
    const init = await conn.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
    });
    expect(init.protocolVersion).toBe(PROTOCOL_VERSION);

    // New session
    const session = await conn.newSession({
      cwd: '/tmp',
      mcpServers: [],
    });
    expect(session.sessionId).toBeTruthy();

    // Send prompt
    const result = await conn.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: 'Hello, say "hello world" in one word only.' }],
    });

    expect(result.stopReason).toBe('end_turn');
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
    expect(messages.length).toBeGreaterThan(0);
  }, 30000);
});
