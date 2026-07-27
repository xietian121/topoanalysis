export type ModelFormat = 'obj' | 'fbx'

export interface ModelInfo {
  id: string
  name: string
  format: ModelFormat
  fileSize: number
  uploadedAt: string
  /** 是否为示例模型（不可打分，直接进报告页） */
  isExample?: boolean
}

export interface ModelStats {
  vertexCount: number
  faceCount: number
  triangleCount: number
  quadCount: number
  ngonCount: number
}
