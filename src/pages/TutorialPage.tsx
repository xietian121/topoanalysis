import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CompareCanvas } from '@/components/viewer/CompareCanvas'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { ModelInfoOverlay } from '@/components/viewer/ModelInfoOverlay'
import { useViewerStore } from '@/stores/viewerStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { getExampleDefs } from '@/data/example-models'
import { getStandardByType } from '@/data/evaluation-standards'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'
import type { OBJFaceData } from '@/lib/model-parser'
import * as THREE from 'three'

interface LoadedModel {
  group: THREE.Group
  faceData: OBJFaceData | null
  name: string
  fileSize: number
}

export function TutorialPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const evalType = type as EvaluationType
  const renderMode = useViewerStore((s) => s.settings.renderMode)
  const showGrid = useViewerStore((s) => s.settings.showGrid)

  const [problemModel, setProblemModel] = useState<LoadedModel | null>(null)
  const [excellentModel, setExcellentModel] = useState<LoadedModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get example model definitions for this type
  const { problemDef, excellentDef } = useMemo(() => {
    const defs = getExampleDefs().filter((d) => d.type === evalType)
    const prob = defs.find((d) => d.quality === 'problematic')
    const exc = defs.find((d) => d.quality === 'excellent')
    return { problemDef: prob ?? null, excellentDef: exc ?? null }
  }, [evalType])

  const standard = useMemo(() => getStandardByType(evalType), [evalType])

  // Load all three models
  useEffect(() => {
    if (!problemDef || !excellentDef) return

    const { startLoading, setProgress, finishLoading, setError: setLoadError } = useLoadingStore.getState()
    startLoading()

    const loadAll = async () => {
      try {
        const { parseOBJFile, extractOBJFaceData } = await import('@/lib/model-parser')

        // Step 1: Load problem model
        setProgress(5, 'download', '正在加载问题模型...')
        const probRes = await fetch(problemDef.modelUrl)
        const probText = await probRes.text()
        setProgress(20, 'parse', '正在解析问题模型...')
        const probGroup = await parseOBJFile(new File([probText], 'problem.obj', { type: 'text/plain' }))
        const probFaceData = extractOBJFaceData(probText)
        setProblemModel({
          group: probGroup,
          faceData: probFaceData,
          name: problemDef.name,
          fileSize: problemDef.record.modelFileSize,
        })

        // Step 2: Load excellent model
        setProgress(50, 'download', '正在加载优秀模型...')
        const excRes = await fetch(excellentDef.modelUrl)
        const excText = await excRes.text()
        setProgress(80, 'parse', '正在解析优秀模型...')
        const excGroup = await parseOBJFile(new File([excText], 'excellent.obj', { type: 'text/plain' }))
        const excFaceData = extractOBJFaceData(excText)
        setExcellentModel({
          group: excGroup,
          faceData: excFaceData,
          name: excellentDef.name,
          fileSize: excellentDef.record.fileSize,
        })

        setProgress(100, 'done', '加载完成')
        finishLoading()
        setLoading(false)
      } catch (err) {
        console.error('Model load error:', err)
        setLoadError(err instanceof Error ? err.message : '模型加载失败')
        setError(err instanceof Error ? err.message : '模型加载失败')
        setLoading(false)
      }
    }

    loadAll()
  }, [problemDef, excellentDef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const dispose = (g: THREE.Group | null) => {
        if (!g) return
        g.traverse((child) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose()
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat.dispose()
          }
        })
      }
      dispose(problemModel?.group ?? null)
      dispose(excellentModel?.group ?? null)
    }
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!problemDef || !excellentDef) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[16px] text-text-secondary">该类型暂无双模型对比数据</p>
          <button onClick={() => navigate('/')} className="text-[14px] text-accent hover:underline">返回首页</button>
        </div>
      </div>
    )
  }

  // Build dimension comparison data
  const dimensionComparisons = standard.dimensions.map((dim) => {
    const probScore = problemDef.record.dimensionScores.find((d) => d.dimensionId === dim.id)
    const excScore = excellentDef.record.dimensionScores.find((d) => d.dimensionId === dim.id)
    return {
      dimensionId: dim.id,
      dimensionName: dim.name,
      weight: dim.weight,
      problemScore: probScore?.score ?? 0,
      problemMax: probScore?.maxScore ?? dim.weight,
      excellentScore: excScore?.score ?? 0,
      excellentMax: excScore?.maxScore ?? dim.weight,
      problemPct: probScore ? probScore.score / probScore.maxScore : 0,
      excellentPct: excScore ? excScore.score / excScore.maxScore : 0,
    }
  })

  const probTotal = problemDef.record.total
  const excTotal = excellentDef.record.total

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      {/* Top bar */}
      <div className="h-11 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回首页
        </button>
        <span className="text-[13px] font-semibold text-text-primary">
          {MODEL_TYPE_LABELS[evalType]} · 拓扑对比
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          线框+实体
        </Badge>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-text-tertiary">加载对比模型...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-[14px] text-text-secondary">加载失败</p>
            <p className="text-[12px] text-text-tertiary">{error}</p>
            <button onClick={() => navigate('/')} className="text-[13px] text-accent hover:underline">返回首页</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* ── Left: Problem model viewport ── */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="h-8 flex items-center px-3 glass border-b border-black/5 shrink-0 gap-2">
              <span className="text-[11px] font-semibold text-red-500">❌ 问题案例</span>
              <span className="text-[10px] text-text-tertiary truncate">{problemDef.name}</span>
              <span className="mono text-[10px] text-text-tertiary ml-auto">{formatSize(problemDef.record.modelFileSize)}</span>
            </div>
            <div className="flex-1 relative min-h-0">
              {problemModel && (
                <CompareCanvas
                  model={problemModel.group}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="left"
                  objFaceData={problemModel.faceData}
                />
              )}
              {problemModel && (
                <ModelInfoOverlay
                  model={problemModel.group}
                  modelInfo={null}
                  faceData={problemModel.faceData}
                  label="问题案例"
                  labelDesc={problemModel.name}
                />
              )}
            </div>
            {/* Score badge */}
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0">
              <span className="mono text-[20px] font-bold text-red-500">{probTotal.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary ml-1">/ 100</span>
            </div>
          </div>

          {/* ── Center: Analysis panel ── */}
          <div className="w-[320px] shrink-0 border-x border-black/5 overflow-y-auto">
            <div className="p-3 space-y-3">
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider text-center">
                逐维度对比分析
              </h3>

              {dimensionComparisons.map((dim) => (
                <div key={dim.dimensionId} className="space-y-1">
                  {/* Dimension name */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-text-primary">{dim.dimensionName}</span>
                    <span className="text-[10px] text-text-tertiary">{dim.weight}分</span>
                  </div>

                  {/* Dimension criteria list */}
                  <div className="space-y-1 pt-0.5">
                    {standard.dimensions
                      .find((d) => d.id === dim.dimensionId)
                      ?.criteria.map((crit) => {
                        const pRaw = problemDef.record.reviewScores?.[crit.id] ?? 0
                        const eRaw = excellentDef.record.reviewScores?.[crit.id] ?? 0
                        const pPct = pRaw / 10
                        const ePct = eRaw / 10
                        return (
                          <div key={crit.id}>
                            <span className="text-[10px] text-text-tertiary leading-tight">{crit.name}</span>
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1 rounded-full bg-black/[0.04] overflow-hidden flex justify-end">
                                <div
                                  className="h-full rounded-full bg-red-300/70"
                                  style={{ width: `${pPct * 100}%` }}
                                />
                              </div>
                              <span className="mono text-[10px] text-red-400 w-5 text-right shrink-0">{pRaw}</span>
                              <span className="text-[9px] text-text-tertiary shrink-0">│</span>
                              <span className="mono text-[10px] text-emerald-400 w-5 text-left shrink-0">{eRaw}</span>
                              <div className="flex-1 h-1 rounded-full bg-black/[0.04] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-300/70"
                                  style={{ width: `${ePct * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Excellent model viewport ── */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="h-8 flex items-center px-3 glass border-b border-black/5 shrink-0 gap-2">
              <span className="text-[11px] font-semibold text-emerald-500">✅ 优秀案例</span>
              <span className="text-[10px] text-text-tertiary truncate">{excellentDef.name}</span>
              <span className="mono text-[10px] text-text-tertiary ml-auto">{formatSize(excellentDef.record.modelFileSize)}</span>
            </div>
            <div className="flex-1 relative min-h-0">
              {excellentModel && (
                <CompareCanvas
                  model={excellentModel.group}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="right"
                  objFaceData={excellentModel.faceData}
                />
              )}
              {excellentModel && (
                <ModelInfoOverlay
                  model={excellentModel.group}
                  modelInfo={null}
                  faceData={excellentModel.faceData}
                  label="优秀案例"
                  labelDesc={excellentModel.name}
                />
              )}
            </div>
            {/* Score badge */}
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0">
              <span className="mono text-[20px] font-bold text-emerald-500">{excTotal.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary ml-1">/ 100</span>
            </div>
          </div>

          {/* ── Floating toolbar ── */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
            <ViewerToolbar horizontal showActions={false} />
          </div>
        </div>
      )}
    </div>
  )
}
