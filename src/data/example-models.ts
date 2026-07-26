import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'
import type { EvaluationSuggestions, EvaluationType } from '@/types/evaluation'

/**
 * 预置示例模型数据（8个模型，覆盖4种类型 × 优秀/问题案例）
 * 每个模型包含完整的评测数据 + 优化建议
 */
export interface ExampleModelDef {
  id: string
  name: string
  type: EvaluationType
  quality: 'excellent' | 'problematic'
  description: string
  record: EvalHistoryRecord
}

function makeExampleId(suffix: string) {
  return `example_${suffix}`
}

const exampleModels: ExampleModelDef[] = [
  // ===== 游戏·可动 优秀 =====
  {
    id: makeExampleId('game-dynamic-excellent'),
    name: '游戏角色·优秀案例',
    type: 'game-dynamic',
    quality: 'excellent',
    description: '标准的游戏可动角色模型，四边面占比 94%，关节布线规范，极点分布合理。',
    record: {
      id: makeExampleId('game-dynamic-excellent'),
      modelName: '游戏角色·优秀案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 2450000,
      evaluationType: 'game-dynamic',
      createdAt: '2026-07-20T10:00:00Z',
      autoTotal: 27,
      manualTotal: 61,
      total: 88,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 13, maxScore: 15 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 18, maxScore: 20 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 22, maxScore: 25 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 35, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [],
        warning: [
          {
            title: '手部三角面可优化',
            description: '手指末端检测到3个三角面，虽不影响整体变形但可进一步优化为四边面。',
            why: '手指区域在动画中变形频繁，三角面可能导致轻微纹理拉伸。',
            howToFix: '将手指末端的三角面与相邻四边面合并，形成完整的四边面环。',
            relatedCriterionId: 'tri-distribution',
          },
        ],
        good: [
          {
            title: '关节布线规范',
            description: '肘部、膝盖、肩部均具备3圈以上环形线，变形均匀。',
            why: '充分的环形线是高质量骨骼动画的基础。',
            howToFix: '',
            relatedCriterionId: 'joint-loop',
          },
          {
            title: '四边面占比优秀',
            description: '模型四边面占比高达94%，三角面仅6%且全部分布在非关键区域。',
            why: '高四边面占比保证细分和变形的可预测性。',
            howToFix: '',
            relatedCriterionId: 'quad-tri-ratio',
          },
        ],
        summary: '该模型拓扑质量优秀，关节布线规范，四边面占比高。手部末端有少量三角面可优化，但不影响整体评级。适合作为游戏可动角色的参考标准。',
      },
    },
  },

  // ===== 游戏·可动 问题 =====
  {
    id: makeExampleId('game-dynamic-problematic'),
    name: '游戏角色·问题案例',
    type: 'game-dynamic',
    quality: 'problematic',
    description: '存在多处拓扑问题的游戏角色模型，三角面占比过高，关节布线不足，含有N-gon面。',
    record: {
      id: makeExampleId('game-dynamic-problematic'),
      modelName: '游戏角色·问题案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 1800000,
      evaluationType: 'game-dynamic',
      createdAt: '2026-07-19T14:00:00Z',
      autoTotal: 11,
      manualTotal: 36,
      total: 47,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 6, maxScore: 15 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 12, maxScore: 20 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 14, maxScore: 25 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 15, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [
          {
            title: '关节布线严重不足',
            description: '膝部和肘部仅1圈环形线，变形时会产生尖锐折痕。肩部缺乏完整的边回路支撑。',
            why: '关节处至少需要3圈环形线才能保证动画时变形均匀。不足会导致蒙皮时出现明显拉伸和穿帮。',
            howToFix: '在膝部和肘部各增加2圈环形线。肩部从三角肌区域建立完整的环形边回路。',
            relatedCriterionId: 'joint-loop',
          },
          {
            title: '检测到5个N-gon面',
            description: '模型头部和背部存在5个五边面，在骨骼动画中会产生不可预测的变形。',
            why: 'N-gon在游戏引擎中不受支持，会导致光照错误和动画变形异常。',
            howToFix: '将所有N-gon切割为四边面或三角面的组合。优先使用四边面。',
            relatedCriterionId: 'ngon-count',
          },
        ],
        warning: [
          {
            title: '三角面占比过高（32%）',
            description: '模型32%的面为三角面，远超游戏可动模型15%的建议上限。三角面集中在躯干和大腿区域。',
            why: '三角面在骨骼变形区域会导致纹理扭曲和光照异常。',
            howToFix: '将躯干和大腿区域的三角面重构为四边面。可保留隐蔽区域（如脚底、腋下）的少量三角面。',
            relatedCriterionId: 'quad-tri-ratio',
          },
          {
            title: '极点分布在关节区域',
            description: '检测到5个六极点位于膝部和肘部变形区域。',
            why: '极点在变形区会产生尖锐折痕，影响动画质量。',
            howToFix: '将极点移到非变形区域，或通过重布线使极点位于平面区域。',
            relatedCriterionId: 'pole-distribution',
          },
        ],
        good: [
          {
            title: '无面错误',
            description: '模型没有非流形边和重叠面，基础拓扑干净。',
            why: '零面错误是任何质量模型的基本要求。',
            howToFix: '',
            relatedCriterionId: 'non-manifold',
          },
        ],
        summary: '该模型主要问题集中在绑定动画友好性不足和面型质量欠佳。关节布线需要大幅改进，N-gon面必须修复，三角面占比需降低。优点是基础拓扑干净，无面错误。建议从关节布线入手进行系统性优化。',
      },
    },
  },

  // ===== 游戏·静态 优秀 =====
  {
    id: makeExampleId('game-static-excellent'),
    name: '游戏道具·优秀案例',
    type: 'game-static',
    quality: 'excellent',
    description: '高品质游戏武器模型，四边面占比98%，布线流畅跟随结构，面数效率优秀。',
    record: {
      id: makeExampleId('game-static-excellent'),
      modelName: '游戏道具·优秀案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 890000,
      evaluationType: 'game-static',
      createdAt: '2026-07-18T09:00:00Z',
      autoTotal: 29,
      manualTotal: 60,
      total: 89,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 27, maxScore: 30 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 25, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 37, maxScore: 45 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [],
        warning: [],
        good: [
          {
            title: '面型质量满分',
            description: '零N-gon、零面错误，四边面占比高达98%。',
            why: '干净的拓扑是游戏资产在引擎中稳定运行的基础。',
            howToFix: '',
            relatedCriterionId: 'quad-tri-ratio',
          },
          {
            title: '结构跟随性优秀',
            description: '刃口、护手、握柄处布线紧密跟随结构轮廓，转折处有充足的边线支撑。',
            why: '良好的结构跟随保证模型在LOD切换和法线贴图烘焙时的精度。',
            howToFix: '',
            relatedCriterionId: 'structure',
          },
          {
            title: '密度分配合理',
            description: '刃口细节区域面密度高，握柄平坦区域面密度低，面数利用率高。',
            why: '合理的密度分配在保证视觉质量的同时控制总面数。',
            howToFix: '',
            relatedCriterionId: 'density',
          },
        ],
        summary: '模型拓扑质量优秀，面型干净，布线专业。作为游戏静态道具的参考标准，展示了如何在有限面数下实现高质量的拓扑结构。',
      },
    },
  },

  // ===== 游戏·静态 问题 =====
  {
    id: makeExampleId('game-static-problematic'),
    name: '游戏道具·问题案例',
    type: 'game-static',
    quality: 'problematic',
    description: '面数分配不合理的游戏场景道具，存在非流形边，布线不跟结构，循环线断裂。',
    record: {
      id: makeExampleId('game-static-problematic'),
      modelName: '游戏道具·问题案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 1100000,
      evaluationType: 'game-static',
      createdAt: '2026-07-17T16:00:00Z',
      autoTotal: 19,
      manualTotal: 31,
      total: 50,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 16, maxScore: 30 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 13, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 21, maxScore: 45 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [
          {
            title: '检测到4条非流形边',
            description: '模型底部和边缘存在4条被3个以上面共用的边，会导致法线异常和渲染错误。',
            why: '非流形边在游戏引擎中会导致光照计算错误、碰撞检测失败。',
            howToFix: '检查所有非流形边位置，通过焊接顶点或删除冗余面来修复。',
            relatedCriterionId: 'non-manifold',
          },
          {
            title: '结构跟随性差',
            description: '关键轮廓转折处缺乏边线支撑，布线方向与形体走向不一致。',
            why: '布线不跟随结构会导致法线贴图烘焙失真和LOD切换时的视觉跳变。',
            howToFix: '沿结构轮廓重新布线，确保关键转折处有充足的边线支撑。',
            relatedCriterionId: 'structure',
          },
        ],
        warning: [
          {
            title: '密度分配不合理',
            description: '模型底部平坦区域面密度过高，而顶部细节区域面数不足。',
            why: '面数分配不当浪费GPU资源，同时影响视觉质量。',
            howToFix: '减少底部平坦区域的面数，将释放的面数预算分配到顶部细节区域。',
            relatedCriterionId: 'density',
          },
          {
            title: '循环线断裂',
            description: 'UV接缝处和结构转折处的环形边回路不完整，存在断裂。',
            why: '断裂的循环线导致UV展开不平整和光照接缝。',
            howToFix: '补全断裂的循环线，确保各结构区域形成完整的边回路。',
            relatedCriterionId: 'loop-edges',
          },
        ],
        good: [
          {
            title: '三角面控制良好',
            description: '三角面占比仅5%，且全部分布在非视觉重点区域。',
            why: '低三角面占比保证了模型的可编辑性和细分质量。',
            howToFix: '',
            relatedCriterionId: 'quad-tri-ratio',
          },
        ],
        summary: '该模型的主要问题集中在布线合理性上——结构跟随性和循环线完整性需要大幅改进。同时存在非流形边等硬错误。建议从修复非流形边开始，然后系统性优化布线结构。',
      },
    },
  },

  // ===== 通用·可动 优秀 =====
  {
    id: makeExampleId('general-dynamic-excellent'),
    name: '影视角色·优秀案例',
    type: 'general-dynamic',
    quality: 'excellent',
    description: '高品质影视动画角色模型，造型准确，布线流畅，关节变形区域布线充足。',
    record: {
      id: makeExampleId('general-dynamic-excellent'),
      modelName: '影视角色·优秀案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 5200000,
      evaluationType: 'general-dynamic',
      createdAt: '2026-07-16T11:00:00Z',
      autoTotal: 19,
      manualTotal: 63,
      total: 82,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 16, maxScore: 20 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 20, maxScore: 20 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 26, maxScore: 30 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 20, maxScore: 30 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [],
        warning: [
          {
            title: '绑定友好性有提升空间',
            description: '面部表情区域的布线环略显不足，可能在极端表情时产生轻微扭曲。',
            why: '影视级动画需要更精细的面部布线来支撑丰富的表情变化。',
            howToFix: '在嘴部和眼部周围增加1-2圈环形线，提升表情变形的精度。',
            relatedCriterionId: 'joint-loop',
          },
        ],
        good: [
          {
            title: '零面错误',
            description: '模型完全无非流形边和重叠面，基础拓扑干净。',
            why: '零面错误是影视级资产的基本要求，保证渲染管线稳定。',
            howToFix: '',
            relatedCriterionId: 'non-manifold',
          },
          {
            title: '布线流畅美观',
            description: '全身布线均匀流畅，结构跟随性好，具有良好的视觉美感。',
            why: '流畅的布线不仅有利于变形，也体现了建模师的专业水准。',
            howToFix: '',
            relatedCriterionId: 'structure',
          },
          {
            title: '三角面控制良好',
            description: '三角面占比仅10%，且合理分布在隐蔽区域。',
            why: '通用模型的三角面控制保证了在多种渲染器中的兼容性。',
            howToFix: '',
            relatedCriterionId: 'quad-tri-ratio',
          },
        ],
        summary: '该影视角色模型整体拓扑质量优秀，布线流畅专业，展示了通用可动模型的高质量标准。面部布线可进一步细化以支撑更丰富的表情动画。',
      },
    },
  },

  // ===== 通用·可动 问题 =====
  {
    id: makeExampleId('general-dynamic-problematic'),
    name: '影视角色·问题案例',
    type: 'general-dynamic',
    quality: 'problematic',
    description: '拓扑问题较多的影视角色模型，存在重叠面和N-gon，关节布线混乱。',
    record: {
      id: makeExampleId('general-dynamic-problematic'),
      modelName: '影视角色·问题案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 4100000,
      evaluationType: 'general-dynamic',
      createdAt: '2026-07-15T13:00:00Z',
      autoTotal: 10,
      manualTotal: 38,
      total: 48,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 9, maxScore: 20 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 10, maxScore: 20 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 16, maxScore: 30 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 13, maxScore: 30 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [
          {
            title: '检测到6组重叠面',
            description: '模型肩部和背部存在6组重叠面，导致Z-fighting闪烁和法线冲突。',
            why: '重叠面在影视渲染中会产生明显的闪烁 artifacts，影响画面质量。',
            howToFix: '检查并删除所有重叠面，确保每个面片区域只有一个面覆盖。',
            relatedCriterionId: 'overlapping',
          },
          {
            title: '关节布线混乱',
            description: '膝部和肩部的布线方向无序，缺乏环形线结构，变形时会产生严重扭曲。',
            why: '关节布线是可动模型最重要的拓扑要素，直接影响动画质量。',
            howToFix: '重新设计关节区域布线：先建立环形线骨架，再填充过渡区域。参考解剖结构规划布线方向。',
            relatedCriterionId: 'joint-loop',
          },
        ],
        warning: [
          {
            title: '检测到3个N-gon面',
            description: '模型头部存在3个五边面。',
            why: 'N-gon在渲染器中会产生不可预测的细分结果。',
            howToFix: '将N-gon切割为四边面组合。',
            relatedCriterionId: 'ngon-count',
          },
          {
            title: '密度分布不均匀',
            description: '部分区域面密度差异过大，导致细分时出现明显的密度跳跃。',
            why: '密度过渡不自然会影响细分曲面的光滑度。',
            howToFix: '使用渐变过渡策略，在高低密度区域之间建立平滑的面密度过渡。',
            relatedCriterionId: 'density',
          },
        ],
        good: [],
        summary: '该模型存在多处严重问题，重叠面和关节布线混乱是最高优先级。建议从修复重叠面和N-gon开始，然后系统性重建关节区域布线。模型的造型基础不错，但拓扑执行需要大幅改进。',
      },
    },
  },

  // ===== 通用·静态 优秀 =====
  {
    id: makeExampleId('general-static-excellent'),
    name: '建筑场景·优秀案例',
    type: 'general-static',
    quality: 'excellent',
    description: '高品质建筑可视化模型，布线整齐规范，面数利用高效，循环线完整。',
    record: {
      id: makeExampleId('general-static-excellent'),
      modelName: '建筑场景·优秀案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 3200000,
      evaluationType: 'general-static',
      createdAt: '2026-07-14T08:00:00Z',
      autoTotal: 34,
      manualTotal: 53,
      total: 87,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 31, maxScore: 35 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 25, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 31, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [],
        warning: [
          {
            title: '部分区域可进一步优化面数',
            description: '建筑背面非可见区域的面密度略高，可适当减面。',
            why: '虽然通用模型对面数要求宽松，但合理控制面数有利于渲染效率。',
            howToFix: '在非可见区域使用更大的面片，将释放的面数用于提升可见区域的细节。',
            relatedCriterionId: 'density',
          },
        ],
        good: [
          {
            title: '面错误为零',
            description: '无非流形边、无重叠面、无N-gon，拓扑完全干净。',
            why: '零拓扑错误是专业3D资产的基本标准。',
            howToFix: '',
            relatedCriterionId: 'non-manifold',
          },
          {
            title: '布线结构清晰',
            description: '建筑结构的布线逻辑清晰，水平/垂直线条精确，边线严格跟随建筑轮廓。',
            why: '清晰的布线结构便于后续修改和UV展开。',
            howToFix: '',
            relatedCriterionId: 'structure',
          },
          {
            title: '循环线完整',
            description: '所有需要UV分割和结构支撑的位置都有完整的环形边回路。',
            why: '完整的循环线保证了UV展开的质量和建筑细节的精度。',
            howToFix: '',
            relatedCriterionId: 'loop-edges',
          },
        ],
        summary: '建筑模型拓扑质量优秀，布线干净规范，展示了通用静态模型的高标准。背面非可见区域可进一步优化面数。适合作为建筑可视化的参考标准。',
      },
    },
  },

  // ===== 通用·静态 问题 =====
  {
    id: makeExampleId('general-static-problematic'),
    name: '展示道具·问题案例',
    type: 'general-static',
    quality: 'problematic',
    description: '3D打印展示道具模型，三角面占比过高（45%），布线杂乱，存在非流形边。',
    record: {
      id: makeExampleId('general-static-problematic'),
      modelName: '展示道具·问题案例 (OBJ)',
      modelFormat: 'obj',
      modelFileSize: 1500000,
      evaluationType: 'general-static',
      createdAt: '2026-07-13T15:00:00Z',
      autoTotal: 17,
      manualTotal: 28,
      total: 45,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 14, maxScore: 35 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 13, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 18, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
      suggestions: {
        critical: [
          {
            title: '三角面占比过高（45%）',
            description: '模型45%的面为三角面，远超通用静态模型30%的建议上限。三角面杂乱分布，无规律可循。',
            why: '高三角面占比使模型难以编辑修改，也不利于细分曲面和3D打印切片。',
            howToFix: '系统性将三角面重构为四边面。优先处理大面积连续三角面区域，使用四边形重拓扑工具加速。',
            relatedCriterionId: 'quad-tri-ratio',
          },
          {
            title: '检测到3条非流形边',
            description: '模型内部存在3条非流形边，会导致3D打印切片错误。',
            why: '非流形几何体在3D打印中无法正确切片，会导致打印失败。',
            howToFix: '修复所有非流形边，确保模型是水密的流形几何体。',
            relatedCriterionId: 'non-manifold',
          },
        ],
        warning: [
          {
            title: '布线杂乱无章',
            description: '模型布线方向无规律，不跟随结构轮廓，增加了后续修改的难度。',
            why: '杂乱的布线不仅影响美观，还大幅增加UV展开和纹理绘制的难度。',
            howToFix: '按照结构轮廓重新规划布线方向，使用重拓扑工具建立清晰的边线流向。',
            relatedCriterionId: 'structure',
          },
          {
            title: '极点分布不当',
            description: '检测到8个六极点在模型展示面（正面）区域，影响渲染质量。',
            why: '极点在视觉焦点区域会产生明显的渲染瑕疵。',
            howToFix: '将展示面的极点移到背面或结构转折处，降低对视觉的影响。',
            relatedCriterionId: 'pole-distribution',
          },
        ],
        good: [
          {
            title: '无重叠面',
            description: '模型无重叠面，面片排布清晰。',
            why: '无重叠面保证了单层渲染的正确性。',
            howToFix: '',
            relatedCriterionId: 'overlapping',
          },
        ],
        summary: '该模型的主要问题是面型质量差（三角面过多）和布线混乱。建议从重拓扑入手，将模型转换为以四边面为主的结构，同时修复非流形边。对于3D打印用途，水密性和流形拓扑是最基本要求。',
      },
    },
  },
]

export default exampleModels

/** 获取所有示例模型记录 */
export function getExampleRecords(): EvalHistoryRecord[] {
  return exampleModels.map((e) => e.record)
}

/** 按类型筛选示例模型 */
export function getExamplesByType(type: EvaluationType): ExampleModelDef[] {
  return exampleModels.filter((e) => e.type === type)
}

/** 按质量筛选示例模型 */
export function getExamplesByQuality(quality: 'excellent' | 'problematic'): ExampleModelDef[] {
  return exampleModels.filter((e) => e.quality === quality)
}
