import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { readdir, stat } from "fs/promises"
import { join } from "path"

interface SearchResult {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
}

export const fileSearch: ToolDefinition = tool({
  description: "Advanced file search with regex pattern matching and filters",
  args: {
    directory: tool.schema.string().describe("Directory to search in"),
    pattern: tool.schema.string().describe("File name pattern (regex)"),
    fileType: tool.schema.string().optional().describe("File extension filter (e.g., 'ts', 'js')"),
    maxDepth: tool.schema.number().optional().default(3).describe("Maximum search depth"),
    includeHidden: tool.schema.boolean().optional().default(false).describe("Include hidden files")
  },
  async execute(args, context) {
    const { directory } = context
    const targetDir = join(directory, args.directory)
    const results: SearchResult[] = []
    
    async function searchDir(dir: string, depth: number) {
      if (depth > (args.maxDepth || 3)) return
      
      try {
        const files = await readdir(dir, { withFileTypes: true })
        const pattern = new RegExp(args.pattern, 'i')
        
        for (const file of files) {
          const fileName = file.name
          const filePath = join(dir, fileName)
          
          if (!args.includeHidden && fileName.startsWith('.')) {
            continue
          }
          
          const shouldAdd = pattern.test(fileName) && 
            (!args.fileType || fileName.endsWith(`.${args.fileType}`))
          
          if (shouldAdd) {
            const fileStat = await stat(filePath)
            results.push({
              path: filePath.replace(directory, ''),
              name: fileName,
              type: file.isDirectory() ? 'directory' : 'file',
              size: file.isDirectory() ? undefined : fileStat.size
            })
          }
          
          if (file.isDirectory()) {
            await searchDir(filePath, depth + 1)
          }
        }
      } catch (error) {
        console.error(`Error searching directory ${dir}:`, error)
      }
    }
    
    try {
      const dirStat = await stat(targetDir)
      if (!dirStat.isDirectory()) {
        return JSON.stringify({
          success: false,
          error: "Target path is not a directory",
          message: "Please provide a valid directory path"
        })
      }
      
      await searchDir(targetDir, 0)
      
      return JSON.stringify({
        success: true,
        results,
        totalMatches: results.length,
        message: `Found ${results.length} matching items`
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Failed to search directory"
      })
    }
  }
})