import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import type { ToolContext } from '@opencode-ai/plugin'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { fileSearch } from './file-search.js'

function makeContext(directory: string): ToolContext {
  return {
    sessionID: 'test',
    messageID: 'test',
    agent: 'test',
    directory,
    worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  }
}

describe('fileSearch', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'file-search-test-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  test('matches file names by regex (case insensitive)', async () => {
    await writeFile(join(root, 'Foo.ts'), '// x')
    await writeFile(join(root, 'bar.js'), '// y')

    const raw = await fileSearch.execute(
      { directory: '.', pattern: '\\.ts$', maxDepth: 3, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as {
      success: boolean
      results: Array<{ name: string; type: string }>
    }

    expect(data.success).toBe(true)
    expect(data.results.map((r) => r.name).sort()).toEqual(['Foo.ts'])
  })

  test('filters by fileType extension', async () => {
    await writeFile(join(root, 'a.ts'), '')
    await writeFile(join(root, 'a.js'), '')

    const raw = await fileSearch.execute(
      { directory: '.', pattern: '^a\\.', fileType: 'ts', maxDepth: 3, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as { success: boolean; results: Array<{ name: string }> }

    expect(data.success).toBe(true)
    expect(data.results.map((r) => r.name)).toEqual(['a.ts'])
  })

  test('maxDepth limits how deep subdirectories are searched', async () => {
    const nested = join(root, 'nested')
    const deeper = join(nested, 'deeper')
    await mkdir(deeper, { recursive: true })
    await writeFile(join(root, 'root.txt'), '')
    await writeFile(join(nested, 'deep.txt'), '')
    await writeFile(join(deeper, 'too.txt'), '')

    const raw = await fileSearch.execute(
      { directory: '.', pattern: '\\.txt$', maxDepth: 1, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as { success: boolean; results: Array<{ name: string }> }

    expect(data.success).toBe(true)
    const names = data.results.map((r) => r.name).sort()
    expect(names).toEqual(['deep.txt', 'root.txt'])
  })

  test('excludes hidden entries when includeHidden is false', async () => {
    await writeFile(join(root, 'visible'), '')
    await writeFile(join(root, '.hidden'), '')

    const raw = await fileSearch.execute(
      { directory: '.', pattern: '.', maxDepth: 3, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as { success: boolean; results: Array<{ name: string }> }

    expect(data.success).toBe(true)
    const names = data.results.map((r) => r.name).sort()
    expect(names).toContain('visible')
    expect(names).not.toContain('.hidden')
  })

  test('includes hidden entries when includeHidden is true', async () => {
    await writeFile(join(root, '.env'), 'x=1')

    const raw = await fileSearch.execute(
      { directory: '.', pattern: '^\\.env$', maxDepth: 3, includeHidden: true },
      makeContext(root),
    )
    const data = JSON.parse(raw) as { success: boolean; results: Array<{ name: string }> }

    expect(data.success).toBe(true)
    expect(data.results.map((r) => r.name)).toEqual(['.env'])
  })

  test('returns error when target path is not a directory', async () => {
    const filePath = join(root, 'not-a-dir')
    await writeFile(filePath, '')

    const raw = await fileSearch.execute(
      { directory: 'not-a-dir', pattern: '.*', maxDepth: 3, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as { success: boolean; error?: string }

    expect(data.success).toBe(false)
    expect(data.error).toBe('Target path is not a directory')
  })

  test('returns error when directory does not exist', async () => {
    const raw = await fileSearch.execute(
      { directory: 'missing-dir', pattern: '.*', maxDepth: 3, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as { success: boolean; message?: string }

    expect(data.success).toBe(false)
    expect(data.message).toBe('Failed to search directory')
  })

  test('includes directory entries that match pattern', async () => {
    await mkdir(join(root, 'matchdir'))

    const raw = await fileSearch.execute(
      { directory: '.', pattern: '^matchdir$', maxDepth: 3, includeHidden: false },
      makeContext(root),
    )
    const data = JSON.parse(raw) as {
      success: boolean
      results: Array<{ name: string; type: string; size?: number }>
    }

    expect(data.success).toBe(true)
    expect(data.results).toHaveLength(1)
    expect(data.results[0]).toMatchObject({ name: 'matchdir', type: 'directory' })
    expect(data.results[0].size).toBeUndefined()
  })
})
