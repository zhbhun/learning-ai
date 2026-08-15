import type { AgentConfig } from '@opencode-ai/sdk'

import tester from './tester'

const agents: (AgentConfig & { name: string })[] = [tester]

export default agents
