export type ModelFormat = 'obj' | 'fbx'

export interface ModelInfo {
  id: string
  name: string
  format: ModelFormat
  fileSize: number
  uploadedAt: string
}

export interface ModelStats {
  vertexCount: number
  faceCount: number
  triangleCount: number
  quadCount: number
  ngonCount: number
}
