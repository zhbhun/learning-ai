import path from 'path'
import { fileURLToPath } from 'url'

import type { Config, Hooks, PluginInput } from '@opencode-ai/plugin'

import agents from './agents/index'
import { fileBatchRename } from './tools/file-batch-rename'
import { fileSearch } from './tools/file-search'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const OpenCodePluginTester = async ({ client }: PluginInput): Promise<Hooks> => {
  const skillsDir = path.resolve(__dirname, './skills')

  await client.app.log({
    body: {
      level: 'info',
      message: 'OpenCode Plugin Tester initialized',
      service: 'opencode-plugin-tester',
    },
  })

  return {
    config: async (config: Config) => {
      const cfg = config as Config & {
        skills?: { paths?: string[] }
      }
      cfg.skills = cfg.skills || {}
      cfg.skills.paths = cfg.skills.paths || []

      if (!cfg.skills.paths.includes(skillsDir)) {
        cfg.skills.paths.push(skillsDir)
        await client.app.log({
          body: {
            service: 'opencode-plugin-tester',
            level: 'info',
            message: `Skills path registered: ${skillsDir}`,
          },
        })
      }

      for (const item of agents) {
        const { name, ...agent } = item
        cfg.agent = cfg.agent ?? {}
        if (!cfg.agent[name]) {
          cfg.agent[name] = agent
          await client.app.log({
            body: {
              service: 'opencode-plugin-tester',
              level: 'info',
              message: `Agent registered: ${name}`,
            },
          })
        }
      }
    },

    tool: {
      fileBatchRename,
      fileSearch,
    },
  } as Hooks
}

export default OpenCodePluginTester
