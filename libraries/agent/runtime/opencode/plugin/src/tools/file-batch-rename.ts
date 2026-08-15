import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { readdir, rename, stat } from "fs/promises"
import { join } from "path"

export const fileBatchRename: ToolDefinition = tool({
  description: "Batch rename files in a directory with pattern matching",
  args: {
    directory: tool.schema.string().describe("Target directory path"),
    pattern: tool.schema.string().describe("Search pattern (regex)"),
    replacement: tool.schema.string().describe("Replacement pattern"),
    dryRun: tool.schema.boolean().optional().default(true).describe("Preview changes without applying")
  },
  async execute(args, context) {
    const { directory, worktree } = context
    const targetDir = join(directory, args.directory)
    
    try {
      const stats = await stat(targetDir)
      if (!stats.isDirectory()) {
        return JSON.stringify({
          success: false,
          error: "Target path is not a directory",
          message: "Please provide a valid directory path"
        })
      }
      
      const files = await readdir(targetDir)
      const renamedFiles = []
      const pattern = new RegExp(args.pattern, 'g')
      
      for (const file of files) {
        const newName = file.replace(pattern, args.replacement)
        if (newName !== file) {
          renamedFiles.push({
            oldName: file,
            newName: newName,
            applied: !args.dryRun
          })
          
          if (!args.dryRun) {
            await rename(
              join(targetDir, file),
              join(targetDir, newName)
            )
          }
        }
      }
      
      return JSON.stringify({
        success: true,
        renamedFiles,
        totalFiles: files.length,
        matchedFiles: renamedFiles.length,
        message: args.dryRun 
          ? `Dry run: ${renamedFiles.length} files would be renamed`
          : `Successfully renamed ${renamedFiles.length} files`
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Failed to process directory"
      })
    }
  }
})