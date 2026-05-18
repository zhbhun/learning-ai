import type { AgentConfig } from '@opencode-ai/sdk'

import prompt from './tester.txt'

export const tester: AgentConfig & { name: string } = {
  name: 'tester',
  id: 'tester',
  description:
    'You are opencode, an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.',
  mode: 'all',
  tools: {
    read: false,
    write: false,
    edit: false,
    list: false,
    glob: false,
    grep: false,
  },
  prompt,
}

export default tester
