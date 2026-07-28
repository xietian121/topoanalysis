import type { EvaluationStandard, EvaluationType } from '@/types/evaluation'

// ============================================================================
// 四套评测标准：基于 Phase 2 产品需求（用途 × 动效）
// ============================================================================

/**
 * 获取评测标准映射
 */
export const EVALUATION_STANDARDS: Record<EvaluationType, EvaluationStandard> = {
  'game-static': {
    id: 'game-static-standard',
    evaluationType: 'game-static',
    name: '游戏·静态模型评测标准',
    totalScore: 100,
    dimensions: [
      {
        id: 'face-quality',
        name: '面型质量',
        weight: 30,
        criteria: [
          {
            id: 'quad-tri-ratio',
            name: '四边/三角面比例',
            description:
              '游戏模型允许出现三角面，请评测三角面数量维度。面数阈值：\n1：总面数<15,000面时，三角面<30%为优质；30%<三角面<40%为合格；三角面>40%为不合格\n2：总面数在15,000~25,000之间，三角面<20%为优质；20%<三角面<30%为合格；三角面>30%为不合格\n3：总面数>25,000面，三角面<10%为优质；10%<三角面<20%为合格；三角面>20%为不合格',
            maxScore: 10,
            method: 'auto',
            scoringRule: '面数阶梯阈值：<15K 面 ≤30%、15-25K 面 ≤20%、>25K 面 ≤10%，超出每 1% 扣 1 分',
          },
          {
            id: 'tri-distribution',
            name: '三角面分布合理性',
            description:
              '观察以下区域三角面数量，并判断是否合理：\n1：关节部位附近应尽量避免三角面（非禁止，合理即可）\n2：曲面区域是否有多量三角面（有则不合理）\n3：非重要区域是否有三角面以节省面数（非常合理）\n4：结构穿插区域三角面是否按结构走向分布\n5：三角面是否被排布至AO区域（有则合理）',
            maxScore: 8,
            method: 'manual',
          },
          {
            id: 'pole-distribution',
            name: '极点分布',
            description:
              '≥6边为极点，观察极点位置并判断：\n1：极点是否合理分布在锥尖处（合理）\n2：极点是否在圆平面结构中（合理）\n3：极点是否在可动部位（不合理）\n4：极点是否在重点表现区域（不合理）',
            maxScore: 6,
            method: 'manual',
          },
          {
            id: 'ngon-count',
            name: '多边形面（N-gon）数量',
            description:
              '多边面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个多边面则扣除一分，该维度分数扣完为止',
            maxScore: 6,
            method: 'auto',
            scoringRule: '每出现 1 个 N-gon 扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'face-errors',
        name: '面错误',
        weight: 30,
        criteria: [
          {
            id: 'non-manifold',
            name: '非流形边',
            description:
              '非流形边在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一条非流形边则扣除一分，该维度分数扣完为止',
            maxScore: 15,
            method: 'auto',
            scoringRule: '每出现 1 条非流形边扣除 1 分，扣完为止',
          },
          {
            id: 'overlapping',
            name: '重叠面',
            description:
              '重叠面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一组重叠面则扣除一分，该维度分数扣完为止',
            maxScore: 10,
            method: 'auto',
            scoringRule: '每出现 1 组重叠面扣除 1 分，扣完为止',
          },
          {
            id: 'boundary-holes',
            name: '破洞面',
            description:
              '错误的破洞面（除特意留洞除外）在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个破洞面则扣除一分，该维度分数扣完为止',
            maxScore: 5,
            method: 'auto',
            scoringRule: '每出现 1 条边界边（破洞边）扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'edge-flow',
        name: '布线合理性',
        weight: 40,
        criteria: [
          {
            id: 'structure',
            name: '结构跟随性',
            description:
              '观察整体的高低模型匹配度与结构走线匹配度：\n1：高模的结构特征应在低模边线中得到保留\n2：顶点应落在轮廓转折处，线流向与形体走向一致\n偏差较大则≤6分',
            maxScore: 13,
            method: 'manual',
          },
          {
            id: 'flat-optimization',
            name: '平坦区域面数控制',
            description:
              '观察平坦区域面数是否合理控制：\n1：观察平坦且非关节区域，是否做到了以少量的面数支撑（合理）\n2：面数应集中分配在曲面转折和细节特征处，而非均匀摊平到平坦区域',
            maxScore: 7,
            method: 'manual',
          },
          {
            id: 'density',
            name: '密度分布合理性',
            description:
              '观察重点表现区域的面密度分配：\n1：面部、手部等视觉焦点处应分配更多面数（合理）\n2：非重点区域、不容易查看到的区域，是否减少了面数（合理）',
            maxScore: 10,
            method: 'manual',
          },
          {
            id: 'loop-edges',
            name: '循环线完整性',
            description:
              '拓扑结构中应尽量使用循环线：\n1：观察例如眼周、嘴周、面部等重点区域是否使用了大量的循环线（循环线越多越合格）\n2：观察规整结构处（例如圆柱体造型）是否使用了大量的循环线',
            maxScore: 10,
            method: 'manual',
          },
        ],
      },
    ],
  },

  'game-dynamic': {
    id: 'game-dynamic-standard',
    evaluationType: 'game-dynamic',
    name: '游戏·可动模型评测标准',
    totalScore: 100,
    dimensions: [
      {
        id: 'face-quality',
        name: '面型质量',
        weight: 15,
        criteria: [
          {
            id: 'quad-tri-ratio',
            name: '四边/三角面比例',
            description:
              '游戏模型允许出现三角面，请评测三角面数量维度。可动模型对布线要求更高，三角面占比必须严格控制。面数阈值：\n1：总面数<15,000面时，三角面<30%为优质；30%<三角面<40%为合格；三角面>40%为不合格\n2：总面数在15,000~25,000之间，三角面<20%为优质；20%<三角面<30%为合格；三角面>30%为不合格\n3：总面数>25,000面，三角面<10%为优质；10%<三角面<20%为合格；三角面>20%为不合格',
            maxScore: 5,
            method: 'auto',
            scoringRule: '面数阶梯阈值：<15K面优质<30%/合格30-40%、15-25K面优质<20%/合格20-30%、>25K面优质<10%/合格10-20%',
          },
          {
            id: 'tri-distribution',
            name: '三角面分布合理性',
            description:
              '观察以下区域三角面数量，并判断是否合理：\n1：关节部位附近应尽量避免三角面（非禁止，合理即可）\n2：曲面区域是否有多量三角面（有则不合理）\n3：非重要区域是否有三角面以节省面数（非常合理）\n4：结构穿插区域三角面是否按结构走向分布\n5：三角面是否被排布至AO区域（有则合理）',
            maxScore: 4,
            method: 'manual',
          },
          {
            id: 'pole-distribution',
            name: '极点分布',
            description:
              '≥6边为极点，观察极点位置并判断：\n1：极点是否合理分布在锥尖处（合理）\n2：极点是否在圆平面结构中（合理）\n3：极点是否在可动部位（不合理）\n4：极点是否在重点表现区域（不合理）',
            maxScore: 3,
            method: 'manual',
          },
          {
            id: 'ngon-count',
            name: '多边形面（N-gon）数量',
            description:
              '多边面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个多边面则扣除一分，该维度分数扣完为止',
            maxScore: 3,
            method: 'auto',
            scoringRule: '每出现 1 个 N-gon 扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'face-errors',
        name: '面错误',
        weight: 25,
        criteria: [
          {
            id: 'non-manifold',
            name: '非流形边',
            description:
              '非流形边在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一条非流形边则扣除一分，该维度分数扣完为止',
            maxScore: 12,
            method: 'auto',
            scoringRule: '每出现 1 条非流形边扣除 1 分，扣完为止',
          },
          {
            id: 'overlapping',
            name: '重叠面',
            description:
              '重叠面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一组重叠面则扣除一分，该维度分数扣完为止',
            maxScore: 8,
            method: 'auto',
            scoringRule: '每出现 1 组重叠面扣除 1 分，扣完为止',
          },
          {
            id: 'boundary-holes',
            name: '破洞面',
            description:
              '错误的破洞面（除特意留洞除外）在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个破洞面则扣除一分，该维度分数扣完为止',
            maxScore: 5,
            method: 'auto',
            scoringRule: '每出现 1 条边界边（破洞边）扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'edge-flow',
        name: '布线合理性',
        weight: 20,
        criteria: [
          {
            id: 'structure',
            name: '结构跟随性',
            description:
              '观察整体的高低模型匹配度与结构走线匹配度：\n1：高模的结构特征应在低模边线中得到保留\n2：顶点应落在轮廓转折处，线流向与形体走向一致\n偏差较大则≤6分',
            maxScore: 7,
            method: 'manual',
          },
          {
            id: 'flat-optimization',
            name: '平坦区域面数控制',
            description:
              '观察平坦区域面数是否合理控制：\n1：观察平坦且非关节区域，是否做到了以少量的面数支撑（合理）',
            maxScore: 3,
            method: 'manual',
          },
          {
            id: 'density',
            name: '密度分布合理性',
            description:
              '观察重点表现区域的面密度分配：\n1：面部、手部等视觉焦点处和可动部位应分配更多面数（合理）\n2：非重点区域、不容易查看到的区域，是否减少了面数（合理）',
            maxScore: 6,
            method: 'manual',
          },
          {
            id: 'loop-edges',
            name: '循环线完整性',
            description:
              '拓扑结构中应尽量使用循环线：\n1：观察例如眼周、嘴周、面部等重点区域是否使用了大量的循环线（循环线越多越合格）\n2：观察规整结构处（例如圆柱体造型）是否使用了大量的循环线',
            maxScore: 4,
            method: 'manual',
          },
        ],
      },
      {
        id: 'animation-friendly',
        name: '绑定动画友好性',
        weight: 40,
        criteria: [
          {
            id: 'joint-density',
            name: '关节区域面数倾斜',
            description:
              '关节活动部位（肩、肘、膝、腰、脖子、手指等）相较于其他静态区域是否分配了更多规整面数',
            maxScore: 20,
            method: 'manual',
          },
          {
            id: 'joint-loop',
            name: '可动部位环形线',
            description:
              '观察关节部位是否具备合理环形线结构：\n1：良好环形线保证弯曲时变形均匀、不产生穿插或塌陷\n2：关节弯曲区域的环形线越多，蒙皮动画质量越高',
            maxScore: 20,
            method: 'manual',
          },
        ],
      },
    ],
  },

  'general-static': {
    id: 'general-static-standard',
    evaluationType: 'general-static',
    name: '通用·静态模型评测标准',
    totalScore: 100,
    dimensions: [
      {
        id: 'face-quality',
        name: '面型质量',
        weight: 35,
        criteria: [
          {
            id: 'quad-tri-ratio',
            name: '四边/三角面比例',
            description:
              '通用资产允许出现三角面，请评测三角面数量维度。通用模型对面数要求相对宽松，注重整体造型质量。面数阈值：\n1：总面数<20,000面时，三角面<40%为优质；40%<三角面<50%为合格；三角面>50%为不合格\n2：总面数≥20,000面时，三角面<30%为优质；30%<三角面<40%为合格；三角面>40%为不合格',
            maxScore: 11,
            method: 'auto',
            scoringRule: '面数阶梯阈值：<20K 面 ≤40%、≥20K 面 ≤30%，超出每 1% 扣 0.5 分',
          },
          {
            id: 'tri-distribution',
            name: '三角面分布合理性',
            description:
              '观察以下区域三角面数量，并判断是否合理：\n1：关节部位附近应尽量避免三角面（非禁止，合理即可）\n2：曲面区域是否有多量三角面（有则不合理）\n3：非重要区域是否有三角面以节省面数（非常合理）\n4：结构穿插区域三角面是否按结构走向分布\n5：三角面是否被排布至AO区域（有则合理）',
            maxScore: 10,
            method: 'manual',
          },
          {
            id: 'pole-distribution',
            name: '极点分布',
            description:
              '≥6边为极点，观察极点位置并判断。通用模型对极点容忍度较高：\n1：极点是否合理分布在锥尖处（合理）\n2：极点是否在圆平面结构中（合理）\n3：极点是否在视觉焦点区域（不合理）\n4：极点是否在高光区域和曲率剧烈区域（不合理）',
            maxScore: 7,
            method: 'manual',
          },
          {
            id: 'ngon-count',
            name: '多边形面（N-gon）数量',
            description:
              '多边面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个多边面则扣除一分，该维度分数扣完为止',
            maxScore: 7,
            method: 'auto',
            scoringRule: '每出现 1 个 N-gon 扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'face-errors',
        name: '面错误',
        weight: 30,
        criteria: [
          {
            id: 'non-manifold',
            name: '非流形边',
            description:
              '非流形边在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一条非流形边则扣除一分，该维度分数扣完为止',
            maxScore: 15,
            method: 'auto',
            scoringRule: '每出现 1 条非流形边扣除 1 分，扣完为止',
          },
          {
            id: 'overlapping',
            name: '重叠面',
            description:
              '重叠面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一组重叠面则扣除一分，该维度分数扣完为止',
            maxScore: 10,
            method: 'auto',
            scoringRule: '每出现 1 组重叠面扣除 1 分，扣完为止',
          },
          {
            id: 'boundary-holes',
            name: '破洞面',
            description:
              '错误的破洞面（除特意留洞除外）在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个破洞面则扣除一分，该维度分数扣完为止',
            maxScore: 5,
            method: 'auto',
            scoringRule: '每出现 1 条边界边（破洞边）扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'edge-flow',
        name: '布线合理性',
        weight: 35,
        criteria: [
          {
            id: 'structure',
            name: '结构跟随性',
            description:
              '观察整体的高低模型匹配度与结构走线匹配度。通用模型更注重造型准确度：\n1：高模的结构特征应在低模边线中得到保留\n2：顶点应落在轮廓转折处，线流向与形体走向一致\n偏差较大则≤6分',
            maxScore: 11,
            method: 'manual',
          },
          {
            id: 'flat-optimization',
            name: '平坦区域面数控制',
            description:
              '观察平坦区域面数是否合理控制：\n1：观察平坦且非关节区域，是否做到了以少量的面数支撑（合理）\n2：建筑墙面、展示台面、大面积平面等应主动减面',
            maxScore: 6,
            method: 'manual',
          },
          {
            id: 'density',
            name: '密度分布合理性',
            description:
              '观察重点表现区域的面密度分配：\n1：面部、手部等视觉焦点处应分配更多面数（合理）\n2：非重点区域、不容易查看到的区域，是否减少了面数（合理）\n通用模型允许更灵活的面数分配策略',
            maxScore: 10,
            method: 'manual',
          },
          {
            id: 'loop-edges',
            name: '循环线完整性',
            description:
              '拓扑结构中应尽量使用循环线：\n1：观察例如眼周、嘴周、面部等重点区域是否使用了大量的循环线（循环线越多越合格）\n2：观察规整结构处（例如圆柱体造型）是否使用了大量的循环线',
            maxScore: 8,
            method: 'manual',
          },
        ],
      },
    ],
  },

  'general-dynamic': {
    id: 'general-dynamic-standard',
    evaluationType: 'general-dynamic',
    name: '通用·可动模型评测标准',
    totalScore: 100,
    dimensions: [
      {
        id: 'face-quality',
        name: '面型质量',
        weight: 20,
        criteria: [
          {
            id: 'quad-tri-ratio',
            name: '四边/三角面比例',
            description:
              '通用资产允许出现三角面，请评测三角面数量维度。通用可动模型需要平衡造型自由度和变形需求。面数阈值：\n1：总面数<20,000面时，三角面<40%为优质；40%<三角面<50%为合格；三角面>50%为不合格\n2：总面数≥20,000面时，三角面<30%为优质；30%<三角面<40%为合格；三角面>40%为不合格',
            maxScore: 7,
            method: 'auto',
            scoringRule: '面数阶梯阈值：<20K 面 ≤40%、≥20K 面 ≤30%，超出每 1% 扣 0.5 分',
          },
          {
            id: 'tri-distribution',
            name: '三角面分布合理性',
            description:
              '观察以下区域三角面数量，并判断是否合理：\n1：关节部位附近应尽量避免三角面（非禁止，合理即可）\n2：曲面区域是否有多量三角面（有则不合理）\n3：非重要区域是否有三角面以节省面数（非常合理）\n4：结构穿插区域三角面是否按结构走向分布\n5：三角面是否被排布至AO区域（有则合理）',
            maxScore: 5,
            method: 'manual',
          },
          {
            id: 'pole-distribution',
            name: '极点分布',
            description:
              '≥6边为极点，观察极点位置并判断：\n1：极点是否合理分布在锥尖处（合理）\n2：极点是否在圆平面结构中（合理）\n3：极点是否在可动部位（不合理）\n4：极点是否在重点表现区域（不合理）',
            maxScore: 4,
            method: 'manual',
          },
          {
            id: 'ngon-count',
            name: '多边形面（N-gon）数量',
            description:
              '多边面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个多边面则扣除一分，该维度分数扣完为止',
            maxScore: 4,
            method: 'auto',
            scoringRule: '每出现 1 个 N-gon 扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'face-errors',
        name: '面错误',
        weight: 25,
        criteria: [
          {
            id: 'non-manifold',
            name: '非流形边',
            description:
              '非流形边在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一条非流形边则扣除一分，该维度分数扣完为止',
            maxScore: 12,
            method: 'auto',
            scoringRule: '每出现 1 条非流形边扣除 1 分，扣完为止',
          },
          {
            id: 'overlapping',
            name: '重叠面',
            description:
              '重叠面在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一组重叠面则扣除一分，该维度分数扣完为止',
            maxScore: 8,
            method: 'auto',
            scoringRule: '每出现 1 组重叠面扣除 1 分，扣完为止',
          },
          {
            id: 'boundary-holes',
            name: '破洞面',
            description:
              '错误的破洞面（除特意留洞除外）在任何模型拓扑结构中完全不可接受；观察拓扑结构，每有一个破洞面则扣除一分，该维度分数扣完为止',
            maxScore: 5,
            method: 'auto',
            scoringRule: '每出现 1 条边界边（破洞边）扣除 1 分，扣完为止',
          },
        ],
      },
      {
        id: 'edge-flow',
        name: '布线合理性',
        weight: 25,
        criteria: [
          {
            id: 'structure',
            name: '结构跟随性',
            description:
              '观察整体的高低模型匹配度与结构走线匹配度。通用模型允许一定的布线自由度：\n1：高模的结构特征应在低模边线中得到保留\n2：顶点应落在轮廓转折处，线流向与形体走向一致\n不能明显偏离关键轮廓，偏差较大则≤6分',
            maxScore: 8,
            method: 'manual',
          },
          {
            id: 'flat-optimization',
            name: '平坦区域面数控制',
            description:
              '观察平坦区域面数是否合理控制：\n1：观察平坦且非关节区域，是否做到了以少量的面数支撑（合理）\n2：衣物平面、道具表面等非变形区域应适度减面',
            maxScore: 4,
            method: 'manual',
          },
          {
            id: 'density',
            name: '密度分布合理性',
            description:
              '观察重点表现区域的面密度分配：\n1：面部、手部等视觉焦点处和可动部位应分配更多面数（合理）\n2：非重点区域、不容易查看到的区域，是否减少了面数（合理）',
            maxScore: 7,
            method: 'manual',
          },
          {
            id: 'loop-edges',
            name: '循环线完整性',
            description:
              '拓扑结构中应尽量使用循环线：\n1：观察例如眼周、嘴周、面部等重点区域是否使用了大量的循环线（循环线越多越合格）\n2：观察规整结构处（例如圆柱体造型）是否使用了大量的循环线\n3：可动关节周围必须形成完整边回路，不低于2圈',
            maxScore: 6,
            method: 'manual',
          },
        ],
      },
      {
        id: 'animation-friendly',
        name: '绑定动画友好性',
        weight: 30,
        criteria: [
          {
            id: 'joint-density',
            name: '关节区域面数倾斜',
            description:
              '关节活动部位（肩、肘、膝、腰、脖子、手指等）相较于其他静态区域是否分配了更多规整面数。通用可动模型同样适用面数倾斜原则：\n1：有限面数应向关节区域集中\n2：关节处面数不足会导致变形折痕和蒙皮异常\n建议关节区域面密度至少达到静态区域的1.5倍以上',
            maxScore: 15,
            method: 'manual',
          },
          {
            id: 'joint-loop',
            name: '可动部位环形线',
            description:
              '观察关节部位是否具备合理环形线结构：\n1：良好环形线保证弯曲时变形均匀、不产生穿插或塌陷\n2：不低于2圈环形线',
            maxScore: 15,
            method: 'manual',
          },
        ],
      },
    ],
  },
}

/**
 * 根据 EvaluationType 获取对应的评测标准
 */
// ============================================================================
// 对称性评测 — 权重调整
// ============================================================================

/** 对称性准则定义（通用） */
const SYMMETRY_CRITERION_BASE = {
  id: 'symmetry' as const,
  name: '对称性',
  description: '评测模型拓扑结构是否保持左右/轴向对称。适用于有对称设计需求的角色、道具、建筑等模型。观察要点：\n1. 左右两侧顶点分布是否镜像对称\n2. 中轴面两侧边线走向是否一致\n3. 关键结构（眼、耳、肩、肢体等）是否对称排布\n4. 非对称区域是否有合理的设计依据（如角色姿态、道具功能结构）',
  maxScore: 0, // 由各标准的 SYMMETRY_CONFIG 覆盖
  method: 'manual' as const,
}

/** 各标准在启用对称性后的维度权重与准则满分 */
export const SYMMETRY_CONFIG: Record<EvaluationType, {
  dimWeights: Record<string, number>
  critMax: Record<string, number>
  symmetryMax: number
}> = {
  'game-static': {
    dimWeights: { 'face-quality': 20, 'face-errors': 20, 'edge-flow': 60 },
    critMax: {
      'quad-tri-ratio': 7, 'tri-distribution': 5, 'pole-distribution': 4, 'ngon-count': 4,
      'non-manifold': 10, 'overlapping': 7, 'boundary-holes': 3,
      'structure': 13, 'flat-optimization': 7, 'density': 10, 'loop-edges': 10,
    },
    symmetryMax: 20,
  },
  'game-dynamic': {
    dimWeights: { 'face-quality': 13, 'face-errors': 22, 'edge-flow': 30, 'animation-friendly': 35 },
    critMax: {
      'quad-tri-ratio': 4, 'tri-distribution': 3, 'pole-distribution': 3, 'ngon-count': 3,
      'non-manifold': 11, 'overlapping': 7, 'boundary-holes': 4,
      'structure': 7, 'flat-optimization': 3, 'density': 6, 'loop-edges': 4,
      'joint-density': 17, 'joint-loop': 18,
    },
    symmetryMax: 10,
  },
  'general-static': {
    dimWeights: { 'face-quality': 26, 'face-errors': 22, 'edge-flow': 52 },
    critMax: {
      'quad-tri-ratio': 9, 'tri-distribution': 7, 'pole-distribution': 5, 'ngon-count': 5,
      'non-manifold': 11, 'overlapping': 7, 'boundary-holes': 4,
      'structure': 11, 'flat-optimization': 6, 'density': 10, 'loop-edges': 8,
    },
    symmetryMax: 17,
  },
  'general-dynamic': {
    dimWeights: { 'face-quality': 17, 'face-errors': 20, 'edge-flow': 38, 'animation-friendly': 25 },
    critMax: {
      'quad-tri-ratio': 7, 'tri-distribution': 4, 'pole-distribution': 3, 'ngon-count': 3,
      'non-manifold': 10, 'overlapping': 6, 'boundary-holes': 4,
      'structure': 8, 'flat-optimization': 4, 'density': 7, 'loop-edges': 6,
      'joint-density': 13, 'joint-loop': 12,
    },
    symmetryMax: 13,
  },
}

/**
 * 根据 EvaluationType 获取对应的评测标准
 * @param symmetryEnabled 是否启用对称性评测（启用后 edge-flow 权重 ×1.5，其他维度按比例缩减）
 */
export function getStandardByType(type: EvaluationType, symmetryEnabled = false): EvaluationStandard {
  const base = EVALUATION_STANDARDS[type]
  const cfg = SYMMETRY_CONFIG[type]

  return {
    ...base,
    dimensions: base.dimensions.map((dim) => {
      // 对称性启用时使用调整后的权重和 maxScore
      const newWeight = symmetryEnabled ? (cfg.dimWeights[dim.id] ?? dim.weight) : dim.weight

      const criteria = dim.criteria.map((crit) => {
        if (symmetryEnabled && cfg.critMax[crit.id] !== undefined) {
          return { ...crit, maxScore: cfg.critMax[crit.id] }
        }
        return crit
      })

      // edge-flow 维度：始终在最前面插入对称性准则
      if (dim.id === 'edge-flow') {
        const symCriterion = {
          ...SYMMETRY_CRITERION_BASE,
          maxScore: symmetryEnabled ? cfg.symmetryMax : 0,
          optional: true,
        }
        return {
          ...dim,
          weight: newWeight,
          criteria: [symCriterion, ...criteria],
        }
      }

      return {
        ...dim,
        weight: newWeight,
        criteria,
      }
    }),
  }
}

// ============================================================================
// Phase 1 向后兼容导出
// ============================================================================

/** @deprecated 使用 GAME_STATIC_STANDARD 替代 */
export const STATIC_MODEL_STANDARD = EVALUATION_STANDARDS['game-static']
/** @deprecated 使用 GAME_DYNAMIC_STANDARD 替代 */
export const DYNAMIC_MODEL_STANDARD = EVALUATION_STANDARDS['game-dynamic']

/** 游戏·静态模型评测标准 */
export const GAME_STATIC_STANDARD = EVALUATION_STANDARDS['game-static']
/** 游戏·可动模型评测标准 */
export const GAME_DYNAMIC_STANDARD = EVALUATION_STANDARDS['game-dynamic']
/** 通用·静态模型评测标准 */
export const GENERAL_STATIC_STANDARD = EVALUATION_STANDARDS['general-static']
/** 通用·可动模型评测标准 */
export const GENERAL_DYNAMIC_STANDARD = EVALUATION_STANDARDS['general-dynamic']

// ============================================================================
// 标准列表（含元信息，用于 Dashboard 和标准页展示）
// ============================================================================

export interface StandardMeta {
  type: EvaluationType
  name: string
  usage: string
  animation: string
  description: string
  dimensionCount: number
  criterionCount: number
}

export const STANDARDS_META: StandardMeta[] = [
  {
    type: 'game-static',
    name: '游戏·静态模型',
    usage: '游戏资产',
    animation: '静态',
    description: '用于游戏引擎的静态场景、道具、建筑等不参与骨骼动画的模型。对面错误容忍度极低，线框效率要求高。',
    dimensionCount: 3,
    criterionCount: 11,
  },
  {
    type: 'game-dynamic',
    name: '游戏·可动模型',
    usage: '游戏资产',
    animation: '可动',
    description: '用于游戏引擎的角色、生物等需要骨骼动画的模型。对关节布线、变形区域面数有严格要求。',
    dimensionCount: 4,
    criterionCount: 11,
  },
  {
    type: 'general-static',
    name: '通用·静态模型',
    usage: '通用3D资产',
    animation: '静态',
    description: '用于影视、动画、3D打印、展示等非游戏场景的静态模型。标准相对宽松，更注重造型和布线流畅度。',
    dimensionCount: 3,
    criterionCount: 11,
  },
  {
    type: 'general-dynamic',
    name: '通用·可动模型',
    usage: '通用3D资产',
    animation: '可动',
    description: '用于影视动画、VFX 等非游戏场景的可动模型。兼顾造型自由度和绑定动画需求。',
    dimensionCount: 4,
    criterionCount: 11,
  },
]
