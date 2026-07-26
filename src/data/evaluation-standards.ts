import type { EvaluationStandard } from '@/types/evaluation'

export const STATIC_MODEL_STANDARD: EvaluationStandard = {
  id: 'static-model-standard',
  modelType: 'static',
  name: '静态模型评估标准',
  totalScore: 100,
  dimensions: [
    {
      id: 'static-face-quality',
      name: '面型质量',
      weight: 30,
      criteria: [
        {
          id: 'quad-tri-ratio',
          name: '四边/三角面比例',
          description:
            '自动检测四边面与三角面的占比。游戏模型为性能考虑通常允许三角面存在，但占比需严格受控。面数阈值决定合格线：总面数低于 15,000 时三角面不超过 30% 为合格；15,000~25,000 面之间不超过 20%；25,000 面以上不超过 10%。超出阈值则按比例扣分。',
          maxScore: 10,
          method: 'auto',
          scoringRule: '面数阶梯阈值：<15K 面 ≤30%、15-25K 面 ≤20%、>25K 面 ≤10%，超出每 1% 扣 1 分',
        },
        {
          id: 'tri-distribution',
          name: '三角面分布合理性',
          description:
            '评估三角面在模型中的分布位置是否合理。三角面应尽量置于非关节处、极点周边或视觉非重点区域（如不显眼的平坦区、隐蔽处）。1 分代表分布毫无规律、大面积集中在动画关键区；10 分代表所有三角面均位于合理区域；5 分代表可接受，略微影响动画绑定与表现但无大碍。',
          maxScore: 8,
          method: 'manual',
        },
        {
          id: 'pole-distribution',
          name: '极点分布',
          description:
            '评估六极点及以上（≥6 条边共顶点）的分布位置是否合理。游戏模型允许极点存在，但必须避开绑定关节区域、高光区域和曲率变化剧烈区域（如面部、肘部、膝盖）。若极点位于上述敏感区域，渲染和动画中将产生显著瑕疵。',
          maxScore: 6,
          method: 'manual',
        },
        {
          id: 'ngon-count',
          name: '多边形面（N-gon）数量',
          description:
            '自动检测大于四边的多边形面数量。N-gon 在游戏低模中完全不允许存在——会引发渲染异常、光照错误及骨骼变形不可预测等问题。每个 N-gon 扣除 1 分，扣完为止。',
          maxScore: 6,
          method: 'auto',
          scoringRule: '每出现 1 个 N-gon 扣除 1 分，扣完为止',
        },
      ],
    },
    {
      id: 'static-face-errors',
      name: '面错误',
      weight: 25,
      criteria: [
        {
          id: 'non-manifold',
          name: '非流形边',
          description:
            '自动检测被三个或以上面共用的非流形边。非流形边是严重的拓扑错误，导致法线计算异常、渲染错误及物理碰撞失效。每条非流形边扣除 0.5 分，扣完为止。',
          maxScore: 15,
          method: 'auto',
          scoringRule: '每出现 1 条非流形边扣除 0.5 分，扣完为止',
        },
        {
          id: 'overlapping',
          name: '重叠面',
          description:
            '自动检测模型中相互重叠的面片对。重叠面导致 Z-fighting 闪烁、法线冲突及光照烘焙异常，在双面渲染或透明材质下尤为明显。每组重叠面扣除 0.5 分，扣完为止。',
          maxScore: 10,
          method: 'auto',
          scoringRule: '每出现 1 组重叠面扣除 0.5 分，扣完为止',
        },
      ],
    },
    {
      id: 'static-edge-flow',
      name: '布线合理性',
      weight: 45,
      criteria: [
        {
          id: 'structure',
          name: '结构跟随性',
          description:
            '评估模型边线走向是否贴合物体结构轮廓。顶点应落在关键轮廓转折处，边线流向应与物体形体走向一致。若结构出入较大——如关键特征处布线偏离轮廓、转折处缺乏边线支撑——则得分不超过 6 分（6 分为阈值线）。',
          maxScore: 18,
          method: 'manual',
        },
        {
          id: 'density',
          name: '密度分布合理性',
          description:
            '评估模型面片密度分配是否合理。重要细节区域（形体转折处、特征点、视觉焦点）应有较高面密度；平坦、非变形区域应有较低面密度。资源应优先倾斜关键部位，而非均匀摊平。',
          maxScore: 14,
          method: 'manual',
        },
        {
          id: 'loop-edges',
          name: '循环线完整性',
          description:
            '评估模型环形边回路是否完整、连续。各结构部位应具备必要的循环线支撑——尤其是需要 UV 接缝分割和骨骼变形缓冲的区域必须形成完整边回路。断裂、缺失的循环线将导致 UV 展开困难和动画变形异常。',
          maxScore: 13,
          method: 'manual',
        },
      ],
    },
  ],
}

export const DYNAMIC_MODEL_STANDARD: EvaluationStandard = {
  id: 'dynamic-model-standard',
  modelType: 'dynamic',
  name: '可动模型评估标准',
  totalScore: 100,
  dimensions: [
    {
      id: 'dynamic-face-quality',
      name: '面型质量',
      weight: 15,
      criteria: [
        {
          id: 'quad-tri-ratio',
          name: '四边/三角面比例',
          description:
            '自动检测四边面与三角面的占比。可动模型对布线要求更高，三角面占比必须严格控制。面数阈值：总面数低于 15,000 时三角面不超过 30% 为合格；15,000~25,000 面之间不超过 20%；25,000 面以上不超过 10%。超出阈值则按比例扣分。',
          maxScore: 5,
          method: 'auto',
          scoringRule: '面数阶梯阈值：<15K 面 ≤30%、15-25K 面 ≤20%、>25K 面 ≤10%，超出每 1% 扣 0.5 分',
        },
        {
          id: 'tri-distribution',
          name: '三角面分布合理性',
          description:
            '评估三角面的分布位置。可动部位（关节、面部）附近应严格避免三角面，否则在蒙皮变形时容易产生不自然的拉伸与扭曲。1 分代表分布完全不合理；10 分代表所有三角面均避开可动区；5 分代表可接受。',
          maxScore: 4,
          method: 'manual',
        },
        {
          id: 'pole-distribution',
          name: '极点分布',
          description:
            '评估六极点及以上（≥6 条边共顶点）的分布位置。极点在可动模型中尤为关键——若位于关节变形区，在动画时会产生尖锐折痕或纹理拉伸。必须避开面部、肘部、膝盖等敏感区域。',
          maxScore: 3,
          method: 'manual',
        },
        {
          id: 'ngon-count',
          name: '多边形面（N-gon）数量',
          description:
            '自动检测大于四边的多边形面。N-gon 在骨骼动画中会产生不可预测的变形结果，完全不可接受。每个 N-gon 扣除 1 分，扣完为止。',
          maxScore: 3,
          method: 'auto',
          scoringRule: '每出现 1 个 N-gon 扣除 1 分，扣完为止',
        },
      ],
    },
    {
      id: 'dynamic-face-errors',
      name: '面错误',
      weight: 20,
      criteria: [
        {
          id: 'non-manifold',
          name: '非流形边',
          description:
            '自动检测非流形边。对可动模型影响更为严重——非流形边在骨骼驱动变形时会导致面片撕裂或穿透。每条扣除 0.5 分，扣完为止。',
          maxScore: 12,
          method: 'auto',
          scoringRule: '每出现 1 条非流形边扣除 0.5 分，扣完为止',
        },
        {
          id: 'overlapping',
          name: '重叠面',
          description:
            '自动检测重叠面。动画播放时重叠面会产生严重的视觉闪烁和法线抖动。每组重叠面扣除 0.5 分，扣完为止。',
          maxScore: 8,
          method: 'auto',
          scoringRule: '每出现 1 组重叠面扣除 0.5 分，扣完为止',
        },
      ],
    },
    {
      id: 'dynamic-edge-flow',
      name: '布线合理性',
      weight: 25,
      criteria: [
        {
          id: 'structure',
          name: '结构跟随性',
          description:
            '评估模型边线沿结构轮廓分布情况。高模的结构特征应在低模的边线中得到保留——顶点应落在轮廓转折处，边线流向应与形体走向一致。若偏差较大则得分不超过 6 分。',
          maxScore: 10,
          method: 'manual',
        },
        {
          id: 'density',
          name: '密度分布合理性',
          description:
            '评估模型面片密度分配。重要区域（面部、手部等视觉焦点和可动部位）应分配更多面数；平坦静态区域可适当降低密度。资源应优先倾斜关键部位。',
          maxScore: 8,
          method: 'manual',
        },
        {
          id: 'loop-edges',
          name: '循环线完整性',
          description:
            '评估环形边回路完整性。各部位应有完整且必要的循环线——尤其是 UV 接缝处和可动关节周围必须形成完整边回路，以保证 UV 展开和骨骼蒙皮质量。',
          maxScore: 7,
          method: 'manual',
        },
      ],
    },
    {
      id: 'dynamic-animation-friendly',
      name: '绑定动画友好性',
      weight: 40,
      criteria: [
        {
          id: 'joint-density',
          name: '可动部位面数支撑',
          description:
            '评估关节活动部位（肩部、肘部、膝盖、手指等）是否分配了足够的面数来支撑变形。关节处面数不足会导致动画时产生尖锐折痕和异常扭曲。',
          maxScore: 20,
          method: 'manual',
        },
        {
          id: 'joint-loop',
          name: '可动部位环形线',
          description:
            '评估关节活动部位是否具备合理的环形线结构。良好的环形线能保证关节弯曲时变形均匀、不产生穿插或塌陷，是决定蒙皮动画质量的关键因素。',
          maxScore: 20,
          method: 'manual',
        },
      ],
    },
  ],
}
