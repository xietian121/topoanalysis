import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  ChevronDown, Gamepad2, Palette, Bone, Box,
  ArrowRight, Grid3X3, ShieldAlert, ScanLine
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { EVALUATION_STANDARDS, STANDARDS_META, SYMMETRY_CONFIG } from '@/data/evaluation-standards'
import type { EvaluationType, EvaluationCriterion, EvaluationDimension } from '@/types/evaluation'

// ============================================================================
// 导航章节定义
// ============================================================================
interface NavSection {
  id: string
  label: string
}

const NAV_SECTIONS: NavSection[] = [
  { id: 'overview', label: '系统概述' },
  { id: 'types', label: '评测类型' },
  { id: 'dimensions', label: '维度框架' },
  { id: 'weight-compare', label: '权重对比' },
  { id: 'criteria-detail', label: '详细准则' },
  { id: 'symmetry', label: '对称性评测' },
]

// ============================================================================
// 辅助函数
// ============================================================================
function getTypeIcon(type: EvaluationType) {
  const isGame = type.startsWith('game-')
  const isDynamic = type.endsWith('-dynamic')
  if (isGame && isDynamic) return <Bone className="h-5 w-5" />
  if (isGame && !isDynamic) return <Box className="h-5 w-5" />
  if (!isGame && isDynamic) return <Palette className="h-5 w-5" />
  return <Gamepad2 className="h-5 w-5" />
}

function getTypeBadgeColor(type: EvaluationType): string {
  const isGame = type.startsWith('game-')
  return isGame ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
}

function getAnimBadgeColor(type: EvaluationType): string {
  return type.endsWith('-dynamic') ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'
}

// ============================================================================
// 子组件
// ============================================================================

/** 2×2 类型矩阵卡片 */
function TypeMatrixCard({ type, name, description, scenarios, highlights }: {
  type: EvaluationType
  name: string
  description: string
  scenarios: string
  highlights: string[]
}) {
  const isGame = type.startsWith('game-')
  const isDynamic = type.endsWith('-dynamic')
  const bgHover = isGame ? 'hover:border-blue-300' : 'hover:border-purple-300'

  return (
    <div className={`rounded-xl border border-black/5 ${bgHover} bg-white/60 p-5 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          isGame ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'
        }`}>
          {getTypeIcon(type)}
        </span>
        <div>
          <p className="text-[14px] font-semibold text-text-primary">{name}</p>
          <p className="text-[10px] mono text-text-tertiary">{type}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getTypeBadgeColor(type)}`}>
            {isGame ? '游戏' : '通用'}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getAnimBadgeColor(type)}`}>
            {isDynamic ? '可动' : '静态'}
          </span>
        </div>
      </div>
      <p className="text-[12px] text-text-secondary leading-relaxed mb-2.5">{description}</p>
      <p className="text-[11px] text-text-tertiary mb-2">
        <span className="font-medium">适用场景：</span>{scenarios}
      </p>
      <ul className="space-y-1">
        {highlights.map((h, i) => (
          <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
            <span className="text-accent mt-0.5 shrink-0">•</span>
            {h}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 维度卡片 */
function DimensionCard({ dim, index }: { dim: EvaluationDimension; index: number }) {
  const icons = [Grid3X3, ShieldAlert, ScanLine, Bone]
  const Icon = icons[index] ?? Grid3X3
  const autoCount = dim.criteria.filter(c => c.method === 'auto' && !c.optional).length
  const manualCount = dim.criteria.filter(c => c.method === 'manual' && !c.optional).length
  const isOptional = dim.id === 'animation-friendly'

  return (
    <div className={`rounded-xl border border-black/5 bg-white/60 p-4 transition-all duration-200 hover:shadow-md ${
      isOptional ? 'ring-1 ring-purple-200/50' : ''
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold text-text-primary">{dim.name}</h4>
          <p className="text-[11px] text-text-tertiary">{dim.criteria.filter(c => !c.optional).length} 项准则 · 权重 {dim.weight}%</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {autoCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600">
            自动·{autoCount}项
          </span>
        )}
        {manualCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-50 text-orange-600">
            人工·{manualCount}项
          </span>
        )}
        {isOptional && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600">
            仅可动模型
          </span>
        )}
      </div>
    </div>
  )
}

/** 准则详情折叠面板 */
function CriterionPanel({ criterion, defaultOpen = false }: { criterion: EvaluationCriterion; defaultOpen?: boolean }) {
  const methodLabel = criterion.method === 'auto' ? '自动检测' : '人工评测'
  const methodColor = criterion.method === 'auto'
    ? 'bg-blue-50 text-blue-600 border-blue-200'
    : 'bg-orange-50 text-orange-600 border-orange-200'

  // 解析 description 中的审查要点
  const isManual = criterion.method === 'manual'
  const points = isManual ? criterion.description.split('\n').filter(l => l.match(/^\d+[：:]|^[•-]/)).map(l => l.replace(/^[•\-\d]+[：:.\s]*/, '').trim()) : []

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-black/[0.03] transition-colors duration-200">
        <ChevronDown className="h-3.5 w-3.5 text-text-tertiary shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium text-text-primary">{criterion.name}</span>
          {criterion.optional && (
            <span className="text-[10px] px-1 rounded bg-gray-100 text-text-tertiary italic">可选</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${methodColor}`}>
            {methodLabel}
          </span>
          <span className="mono text-[12px] font-semibold text-text-secondary">{criterion.maxScore}分</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-9 pb-3 pt-1 space-y-3">
          {/* 检测方式 */}
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-text-tertiary">检测方式：</span>
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${methodColor}`}>{methodLabel}</span>
          </div>

          {/* 准则说明 */}
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {criterion.description.split('\n')[0]}
          </p>

          {/* 自动检测：评分规则 */}
          {criterion.method === 'auto' && criterion.scoringRule && (
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
              <p className="text-[11px] font-medium text-blue-700 mb-1">评分规则</p>
              <p className="text-[12px] text-blue-800 leading-relaxed">{criterion.scoringRule}</p>
            </div>
          )}

          {/* 人工评测：审查要点 */}
          {isManual && points.length > 0 && (
            <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-3">
              <p className="text-[11px] font-medium text-orange-700 mb-1.5">审查要点</p>
              <ul className="space-y-1">
                {points.map((p, i) => (
                  <li key={i} className="text-[12px] text-orange-800 flex items-start gap-1.5">
                    <span className="text-orange-400 mt-0.5 shrink-0">{i + 1}.</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// 主页面
// ============================================================================
export function StandardsPage() {
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [expandAllCriteria, setExpandAllCriteria] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver: 滚动时自动高亮当前章节
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break // 取第一个可见的
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // 锚点点击 → 平滑滚动
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }, [])

  // 数据
  const allTypes: EvaluationType[] = useMemo(() => ['game-static', 'game-dynamic', 'general-static', 'general-dynamic'], [])
  const typeMetaMap = useMemo(() => {
    const map: Record<string, typeof STANDARDS_META[number]> = {}
    STANDARDS_META.forEach(m => { map[m.type] = m })
    return map
  }, [])

  return (
    <div className="h-full flex overflow-hidden">
      {/* ================================================================ */}
      {/* 左侧锚点导航 */}
      {/* ================================================================ */}
      <aside className="w-[220px] shrink-0 border-r border-black/5 bg-white/40 backdrop-blur-sm overflow-y-auto hidden lg:block">
        <div className="px-4 pt-6 pb-4">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">目录导航</p>
          <nav className="space-y-0.5">
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 text-left ${
                  activeSection === id
                    ? 'bg-accent/[0.08] text-accent font-medium'
                    : 'text-text-secondary hover:bg-black/[0.04] hover:text-text-primary'
                }`}
              >
                <span className="truncate">{label}</span>
                {activeSection === id && (
                  <span className="ml-auto w-0.5 h-4 rounded-full bg-accent shrink-0" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* 右侧内容区 */}
      {/* ================================================================ */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-8 py-10 space-y-20">

          {/* ========================================================== */}
          {/* 1. 系统概述 */}
          {/* ========================================================== */}
          <section id="overview">
            {/* 页面头部 */}
            <div className="mb-8">
              <h1 className="text-[32px] font-bold tracking-[-0.02em] text-text-primary">
                TopoAnalysis 3D模型拓扑结构分析标准
              </h1>
              <p className="mt-2 text-[15px] text-text-secondary">
                统一、可量化、可对比的低模拓扑评估体系
              </p>
              <p className="mt-1 text-[12px] text-text-tertiary">
                v2.0 · 2026-07-28
              </p>
            </div>

            {/* 核心理念 */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { title: '自动优先', desc: '面型、面错误等客观指标由算法自动检测评分' },
                { title: '人工判断', desc: '布线美感、结构跟随性等审美维度由人工审核' },
                { title: '分类标准', desc: '游戏/通用、静态/可动使用不同权重的评测标准' },
                { title: '统一对比', desc: '百分制评分，不同模型间可横向对比质量' },
              ].map(({ title, desc }) => (
                <div key={title} className="rounded-xl border border-black/5 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                  <h3 className="text-[14px] font-semibold text-text-primary mb-1.5">{title}</h3>
                  <p className="text-[11px] text-text-tertiary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* 评测流程 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-6">
              <h3 className="text-[15px] font-semibold text-text-primary mb-5">评测流程</h3>
              <div className="flex items-center justify-between">
                {[
                  { label: '上传模型', desc: '支持 .obj / .fbx\n低模 ≤100MB' },
                  { label: '自动拓扑分析', desc: '面型检测\n面错误扫描' },
                  { label: '分类型人工评测', desc: '按标准逐条打分\n可选对称性评测' },
                  { label: '生成报告', desc: '评分 + 等级\n优化建议' },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="text-center">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.04] text-text-secondary text-[12px] font-semibold mb-1.5">
                        {i + 1}
                      </span>
                      <p className="text-[12px] font-semibold text-text-primary">{step.label}</p>
                      <p className="text-[10px] text-text-tertiary whitespace-pre-line leading-relaxed mt-0.5">{step.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-text-tertiary shrink-0 mx-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* 2. 评测类型分类 */}
          {/* ========================================================== */}
          <section id="types">
            <div className="mb-6">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-text-primary">
                评测类型分类
              </h2>
              <p className="mt-1.5 text-[14px] text-text-secondary">
                系统按「用途」（游戏 / 通用）和「动效」（静态 / 可动）两个维度，将模型分为 4 种评测类型。
              </p>
            </div>

            {/* 2×2 矩阵 */}
            <div className="grid grid-cols-2 gap-4">
              <TypeMatrixCard
                type="game-static"
                name="游戏·静态模型"
                description="用于游戏引擎的静态场景、道具、建筑、武器等不参与骨骼动画的模型。"
                scenarios="场景道具、建筑、武器、静态装饰物"
                highlights={['面错误零容忍，自动扣分权重高', '布线效率优先，面数控制严格', '三角面阈值低于通用模型']}
              />
              <TypeMatrixCard
                type="game-dynamic"
                name="游戏·可动模型"
                description="用于游戏引擎的角色、生物、可动机械等需要骨骼动画的模型。"
                scenarios="游戏角色、生物、动画道具、可动机械"
                highlights={['关节布线为核心考核点（40%权重）', '三角面占比必须严格控制', '绑定动画友好性是最大权重维度']}
              />
              <TypeMatrixCard
                type="general-static"
                name="通用·静态模型"
                description="用于影视渲染、建筑可视化、3D打印、展示等非实时场景的静态模型。"
                scenarios="影视场景、建筑可视化、3D打印、产品展示"
                highlights={['面型质量权重最高（35%）', '面数限制相对宽松', '更注重造型准确度与布线流畅度']}
              />
              <TypeMatrixCard
                type="general-dynamic"
                name="通用·可动模型"
                description="用于影视动画、VFX 等非游戏场景的可动模型。兼顾造型自由度和绑定需求。"
                scenarios="影视角色、动画生物、VFX 绑定模型"
                highlights={['平衡造型自由度与绑定需求', '布线合理性占 25%，比例较高', '关节布线要求适中，标准更灵活']}
              />
            </div>
          </section>

          {/* ========================================================== */}
          {/* 3. 评测维度框架 */}
          {/* ========================================================== */}
          <section id="dimensions">
            <div className="mb-6">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-text-primary">
                评测维度框架
              </h2>
              <p className="mt-1.5 text-[14px] text-text-secondary">
                所有类型共享 3 个通用维度，可动模型额外增加 1 个专属维度。共 11+1 条评测准则。
              </p>
            </div>

            {/* 4维度卡片 */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {EVALUATION_STANDARDS['game-dynamic'].dimensions.map((dim, i) => (
                <DimensionCard key={dim.id} dim={dim} index={i} />
              ))}
            </div>

            {/* 准则总表 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-black/5">
                <h3 className="text-[14px] font-semibold text-text-primary">准则总表</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-black/[0.01]">
                      <th className="text-left py-2.5 px-4 font-semibold text-text-tertiary w-[100px]">维度</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-text-tertiary w-[140px]">准则ID</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-text-tertiary w-[140px]">准则名称</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-text-tertiary w-[80px]">检测方式</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-text-tertiary">适用类型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dim: '面型质量', id: 'quad-tri-ratio', name: '四边/三角面比例', method: '自动', types: '所有类型', rowStyle: 'bg-blue-50/30' },
                      { dim: '面型质量', id: 'tri-distribution', name: '三角面分布合理性', method: '人工', types: '所有类型', rowStyle: 'bg-orange-50/30' },
                      { dim: '面型质量', id: 'pole-distribution', name: '极点分布', method: '人工', types: '所有类型', rowStyle: 'bg-orange-50/30' },
                      { dim: '面型质量', id: 'ngon-count', name: 'N-gon数量', method: '自动', types: '所有类型', rowStyle: 'bg-blue-50/30' },
                      { dim: '面错误', id: 'non-manifold', name: '非流形边', method: '自动', types: '所有类型', rowStyle: 'bg-blue-50/30' },
                      { dim: '面错误', id: 'overlapping', name: '重叠面', method: '自动', types: '所有类型', rowStyle: 'bg-blue-50/30' },
                      { dim: '面错误', id: 'boundary-holes', name: '破洞面', method: '自动', types: '所有类型', rowStyle: 'bg-blue-50/30' },
                      { dim: '布线合理性', id: 'structure', name: '结构跟随性', method: '人工', types: '所有类型', rowStyle: 'bg-orange-50/30' },
                      { dim: '布线合理性', id: 'flat-optimization', name: '平坦区域面数控制', method: '人工', types: '所有类型', rowStyle: 'bg-orange-50/30' },
                      { dim: '布线合理性', id: 'density', name: '密度分布合理性', method: '人工', types: '所有类型', rowStyle: 'bg-orange-50/30' },
                      { dim: '布线合理性', id: 'loop-edges', name: '循环线完整性', method: '人工', types: '所有类型', rowStyle: 'bg-orange-50/30' },
                      { dim: '绑定友好', id: 'joint-density', name: '关节区域面数倾斜', method: '人工', types: '仅可动模型', rowStyle: 'bg-purple-50/30' },
                      { dim: '绑定友好', id: 'joint-loop', name: '可动部位环形线', method: '人工', types: '仅可动模型', rowStyle: 'bg-purple-50/30' },
                      { dim: '（可选）', id: 'symmetry', name: '对称性', method: '人工', types: '手动启用', rowStyle: 'bg-gray-50/50 italic text-text-tertiary' },
                    ].map((row) => (
                      <tr key={row.id} className={`border-b border-black/[0.03] hover:bg-black/[0.01] ${row.rowStyle}`}>
                        <td className="py-2.5 px-4 font-medium text-text-primary">{row.dim}</td>
                        <td className="py-2.5 px-3 mono text-[11px] text-text-secondary">{row.id}</td>
                        <td className="py-2.5 px-3 font-medium text-text-primary">{row.name}</td>
                        <td className="py-2.5 px-3">{row.method}</td>
                        <td className="py-2.5 px-3 text-text-tertiary">{row.types}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* 4. 四套标准权重对比 */}
          {/* ========================================================== */}
          <section id="weight-compare">
            <div className="mb-6">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-text-primary">
                四套标准权重对比
              </h2>
              <p className="mt-1.5 text-[14px] text-text-secondary">
                不同评测类型在各维度的权重分配差异化，以反映不同场景的核心关注点。
              </p>
            </div>

            {/* 权重对比表格 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-black/[0.01]">
                      <th className="text-left py-3 px-4 font-semibold text-text-tertiary">标准类型</th>
                      <th className="text-center py-3 px-3 font-semibold text-text-tertiary">面型质量</th>
                      <th className="text-center py-3 px-3 font-semibold text-text-tertiary">面错误</th>
                      <th className="text-center py-3 px-3 font-semibold text-text-tertiary">布线合理性</th>
                      <th className="text-center py-3 px-3 font-semibold text-text-tertiary">绑定友好性</th>
                      <th className="text-center py-3 px-3 font-semibold text-text-tertiary">总分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTypes.map((type, i) => {
                      const std = EVALUATION_STANDARDS[type]
                      const dimWeights = std.dimensions.map(d => d.weight)
                      // Fill to 4 columns
                      while (dimWeights.length < 4) dimWeights.push(0)
                      const colors = ['bg-blue-400', 'bg-red-400', 'bg-emerald-400', 'bg-purple-400']
                      return (
                        <tr key={type} className={`border-b border-black/[0.03] hover:bg-black/[0.01] ${i % 2 === 0 ? 'bg-white/40' : ''}`}>
                          <td className="py-3 px-4 font-medium text-text-primary">
                            <span className="flex items-center gap-2">
                              <span className={type.startsWith('game-') ? 'text-blue-500' : 'text-purple-500'}>
                                {getTypeIcon(type)}
                              </span>
                              {typeMetaMap[type]?.name ?? type}
                            </span>
                          </td>
                          {dimWeights.map((w, j) => (
                            <td key={j} className="py-3 px-3 text-center">
                              {w > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="mono text-[14px] font-bold text-text-primary">{w}</span>
                                    <span className="text-[10px] text-text-tertiary">分</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-black/[0.04] overflow-hidden max-w-[80px] mx-auto">
                                    <div
                                      className={`h-full rounded-full ${colors[j]}`}
                                      style={{ width: `${w}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </td>
                          ))}
                          <td className="py-3 px-3 text-center">
                            <span className="mono text-[15px] font-bold text-text-primary">100</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 权重差异说明 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-5 space-y-3">
              <h3 className="text-[14px] font-semibold text-text-primary">核心差异说明</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium text-blue-600">游戏 vs 通用</p>
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    游戏模型对面错误容忍度更低，面数效率要求更高。三角面阈值更严格（优质≤10-30% vs 通用≤30-40%）。
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium text-gray-600">静态 vs 可动</p>
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    可动模型增加绑定动画友好性维度（游戏40%/通用30%权重），其他维度权重相应降低。
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium text-orange-600">游戏·可动</p>
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    绑定友好性权重最高（40%），是核心考察点。面型质量仅为15%，是所有标准中最低的。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* 5. 详细准则说明 */}
          {/* ========================================================== */}
          <section id="criteria-detail">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.01em] text-text-primary">
                  详细准则说明
                </h2>
                <p className="mt-1.5 text-[14px] text-text-secondary">
                  按维度分组展示所有准则的详细说明、评分规则和审查要点。点击展开查看详情。
                </p>
              </div>
              <button
                onClick={() => setExpandAllCriteria(!expandAllCriteria)}
                className="text-[12px] text-accent font-medium hover:underline shrink-0"
              >
                {expandAllCriteria ? '收起全部' : '展开全部'}
              </button>
            </div>

            {/* 使用 game-static 标准作为"通用准则库"展示（所有类型共享相同的准则） */}
            {EVALUATION_STANDARDS['game-static'].dimensions.map((dim) => (
              <div key={dim.id} className="mb-6 rounded-2xl border border-black/5 bg-white/60 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-black/5 bg-black/[0.01]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[15px] font-semibold text-text-primary">{dim.name}</h3>
                    <Badge variant="secondary" className="text-[10px]">{dim.criteria.filter(c => !c.optional).length}项准则</Badge>
                    <span className="mono text-[12px] text-text-tertiary">权重 {dim.weight}%</span>
                  </div>
                </div>
                <div className="divide-y divide-black/[0.04]" key={`${dim.id}-${expandAllCriteria}`}>
                  {dim.criteria.map((criterion) => (
                    <CriterionPanel
                      key={criterion.id}
                      criterion={criterion}
                      defaultOpen={expandAllCriteria}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* 可动模型专属维度 */}
            <div className="mb-6 rounded-2xl border border-purple-200/60 bg-purple-50/20 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-purple-200/40 bg-purple-50/40">
                <div className="flex items-center gap-3">
                  <Bone className="h-4 w-4 text-purple-500" />
                  <h3 className="text-[15px] font-semibold text-text-primary">绑定动画友好性</h3>
                  <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">仅可动模型</Badge>
                  <span className="mono text-[12px] text-text-tertiary">游戏40% · 通用30%</span>
                </div>
              </div>
              <div className="divide-y divide-purple-100/50" key={`animation-${expandAllCriteria}`}>
                {EVALUATION_STANDARDS['game-dynamic'].dimensions
                  .find(d => d.id === 'animation-friendly')?.criteria.map((criterion) => (
                    <CriterionPanel key={criterion.id} criterion={criterion} defaultOpen={expandAllCriteria} />
                  ))}
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* 6. 对称性评测（可选功能） */}
          {/* ========================================================== */}
          <section id="symmetry">
            <div className="mb-6">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-text-primary">
                对称性评测（可选）
              </h2>
              <p className="mt-1.5 text-[14px] text-text-secondary">
                默认不启用。用户可在评测时手动开启，开启后增加对称性评分项并重新分配各维度权重。
              </p>
            </div>

            {/* 启用后效果 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-5 mb-6">
              <h3 className="text-[14px] font-semibold text-text-primary mb-3">启用后的变化</h3>
              <div className="space-y-2.5">
                {[
                  '3D 视口显示绿色 YZ 参考面（80% 透明度），标识 X 轴中心线',
                  '布线合理性维度增加「对称性」评分项',
                  '各维度权重重新分配（见下方对比表）',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/[0.08] text-accent text-[11px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[13px] text-text-secondary">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 权重变化对比表 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-black/5">
                <h3 className="text-[14px] font-semibold text-text-primary">权重变化对比</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-black/[0.01]">
                      <th className="text-left py-2.5 px-4 font-semibold text-text-tertiary">维度</th>
                      {allTypes.map(type => (
                        <th key={type} className="text-center py-2.5 px-3 font-semibold text-text-tertiary">
                          {typeMetaMap[type]?.name ?? type}
                          <span className="block text-[10px] font-normal text-text-tertiary">原→新</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['face-quality', 'face-errors', 'edge-flow', 'animation-friendly'].map(dimId => {
                      const dimName = dimId === 'face-quality' ? '面型质量'
                        : dimId === 'face-errors' ? '面错误'
                        : dimId === 'edge-flow' ? '布线合理性（含对称性）'
                        : '绑定友好性'
                      return (
                        <tr key={dimId} className="border-b border-black/[0.03] hover:bg-black/[0.01]">
                          <td className="py-2.5 px-4 font-medium text-text-primary">{dimName}</td>
                          {allTypes.map(type => {
                            const baseWeight = EVALUATION_STANDARDS[type].dimensions.find(d => d.id === dimId)?.weight
                            const symWeight = SYMMETRY_CONFIG[type].dimWeights[dimId]
                            if (baseWeight === undefined) return <td key={type} className="py-2.5 px-3 text-center text-text-tertiary">—</td>
                            const changed = baseWeight !== symWeight
                            return (
                              <td key={type} className="py-2.5 px-3 text-center">
                                <span className={changed ? 'font-medium' : 'text-text-tertiary'}>
                                  {baseWeight} → <span className={changed ? 'text-accent font-semibold' : ''}>{symWeight}</span>
                                </span>
                                {changed && (
                                  <span className="text-[10px] text-accent ml-0.5">
                                    ({symWeight > baseWeight ? '+' : ''}{symWeight - baseWeight})
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {/* 对称性分值行 */}
                    <tr className="bg-accent/[0.02]">
                      <td className="py-2.5 px-4 font-medium text-accent">对称性分值</td>
                      {allTypes.map(type => (
                        <td key={type} className="py-2.5 px-3 text-center">
                          <span className="mono text-[13px] font-bold text-accent">
                            {SYMMETRY_CONFIG[type].symmetryMax}
                          </span>
                          <span className="text-[10px] text-text-tertiary"> 分</span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 审查要点 */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-5">
              <h3 className="text-[14px] font-semibold text-text-primary mb-3">对称性审查要点</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  '左右两侧顶点分布是否镜像对称',
                  '中轴面两侧边线走向是否一致',
                  '关键结构（眼、耳、肩、肢体等）是否对称排布',
                  '非对称区域是否有合理设计依据',
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-accent text-[12px] mt-0.5 shrink-0">{i + 1}.</span>
                    <p className="text-[12px] text-text-secondary">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 优化建议系统 — 已删除 */}


        </div>
      </div>
    </div>
  )
}
