export interface FileRenameResult {
  oldName: string
  newName: string
  applied: boolean
}

export interface FileSearchResult {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
}

export interface ToolResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message: string
}