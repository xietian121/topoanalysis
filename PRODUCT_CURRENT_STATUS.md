# TopoEval — 产品当前状态文档

> AI 3D 拓扑低模评测工具 · 完整开发状态说明
> 版本：Phase 2（当前版本）· 日期：2026-07-26

---

## 目录

1. [产品概览](#1-产品概览)
2. [用户场景与工作流](#2-用户场景与工作流)
3. [页面架构与路由](#3-页面架构与路由)
4. [功能模块详解](#4-功能模块详解)
5. [评测体系设计（当前）](#5-评测体系设计当前)
6. [评分计算系统](#6-评分计算系统)
7. [3D 可视化系统](#7-3d-可视化系统)
8. [状态管理与数据流](#8-状态管理与数据流)
9. [数据持久化策略](#9-数据持久化策略)
10. [视觉设计系统](#10-视觉设计系统)
11. [技术架构概览](#11-技术架构概览)
12. [当前已知限制](#12-当前已知限制)
13. [已完成功能清单](#13-已完成功能清单)
14. [下一阶段规划建议](#14-下一阶段规划建议)

---

## 1. 产品概览

### 1.1 产品定位

TopoEval 是一款面向游戏美术和 TA（技术美术）的 3D 低模拓扑质量评测工具。通过**自动算法检测（7项）+ 人工逐条审核**相结合的方式，对低多边形模型的拓扑结构进行系统性打分。支持 4 种模型类型的差异化评测标准，内置 8 个示例模型作为参考基准。

### 1.2 核心价值

| 痛点 | 解决方案 |
|------|----------|
| 拓扑质量靠肉眼检查，效率低 | 自动检测 7 项拓扑指标（三角面占比、N-gon、非流形边、重叠面、破洞面、极点、密度），3D 视图实时高亮 |
| 评价标准不统一 | 内置 4 套评测标准（game-static / game-dynamic / general-static / general-dynamic），各 11 条评测指标，明确评分阈值 |
| 缺乏量化打分机制 | 逐条 1-10 打分 + 自动映射，百分制总分，1 位小数精度 |
| 多模型对比困难 | 双视口同步浏览 + 高低模结构重叠 + 模型对比池 |
| 新手缺乏参考 | 8 个内置示例模型（优秀/问题各半），已预评测并显示分数和 3D 缩略图 |

### 1.3 目标用户

- **游戏美术人员**：评估自己制作的模型的拓扑质量
- **技术美术（TA）**：制定/审核模型规范，批量检查外包模型
- **面试/评测场景**：作为标准化工具测试候选人的模型制作能力（核心场景）
- **学习者**：通过示例模型了解什么是好的拓扑

---

## 2. 用户场景与工作流

### 2.1 主工作流：评测向导（推荐）

```
首页 → 选择评测标准向导 → 上传模型 → 自动分析 → 逐条审核 → 查看结果 → 保存/查看报告
```

**详细步骤：**

1. **开始**：首页点击"加载模型开始评测"，进入评测向导页
2. **选择标准**：向导中选定模型类型（游戏/通用 × 静态/可动 = 4 种）
3. **上传模型**：拖放 .obj/.fbx 文件，可选上传参考高模
4. **自动分析**：系统运行 7 项自动检测，3D 视图渲染高亮叠加层
5. **逐条审核**：右侧面板展示完整评测列表，逐条打分（1-10），3D 视图联动高亮
6. **完成**：显示总分（1 位小数）+ 雷达图 + 维度得分
7. **保存**：持久化到 localStorage，可查看详细报告页

### 2.2 辅助工作流：浏览示例模型

```
首页 → 示例模型区域 → 筛选（游戏/通用 × 静态/可动）→ 点击卡片查看 3D 缩略图 + 分数 → 进入查看器
```

**特点：**
- 8 个预评测示例模型，4 个优秀 + 4 个问题案例
- 每张卡片显示真实 3D 缩略图（线框+实体混合渲染）
- 点击可直接加载模型（含高模参考），进入评测查看器
- 评测类型在查看器中锁定（已在示例中预设）

### 2.3 辅助工作流：高低模结构对比

```
查看器页面 → 低模加载后自动检测结构跟随性 → 切换到结构评测 → 高低模重叠显示
```

**特点：**
- 双视口：左侧高模参考 / 结构重叠视图，右侧低模评测
- 结构跟随性评测时，高模与低模在同一视口中半透明重叠（蓝色 `#4a90d9` opacity 0.55）
- 两侧相机同步联动

### 2.4 辅助工作流：模型对比分析

```
首页 → 模型对比页 → 从评测记录中选择 2 个模型 → 查看雷达图对比 + 差异分析
```

### 2.5 辅助工作流：数据分析

```
首页 → 数据分析页 → 查看整体评测统计（平均分、优秀率、维度分布、短板分析）
```

---

## 3. 页面架构与路由

### 3.1 页面清单

| 路由 | 页面组件 | 功能说明 |
|------|----------|----------|
| `/` | `DashboardPage` | 首页：示例模型展示 + 我的模型列表 + 统计概览 |
| `/eval/wizard` | `EvalWizardPage` | 评测向导：选类型 → 上传模型 → 自动分析 → 逐条审核 |
| `/viewer` | `UploadPage` | 模型上传页（查看器的入口状态） |
| `/viewer/single` | `ViewerPage` | 单/双模型 3D 查看 + 评测面板（锁定类型） |
| `/viewer/compare` | `ComparePage` | 高低模对比双视口 + 对比评测面板 |
| `/compare` | `ModelComparePage` | 多模型对比分析（对比池选 2 个模型，雷达图+差异分析） |
| `/report/:id` | `ReportPage` | 评测报告详情页（总分、雷达图、优化建议） |
| `/standards` | `StandardsPage` | 4 套评测标准展示（Tab 切换类型） |
| `/history` | `HistoryPage` | 评测历史记录列表 + 展开详情 |
| `/analytics` | `AnalyticsPage` | 数据分析面板（统计图表、短板分析、类别对比） |

### 3.2 布局结构

所有页面共享 `AppLayout`：

```
┌──────────────────────────────────────────────┐
│  Header (48px): Logo + 导航栏                  │
├──────────────────────────────────────────────┤
│                                               │
│  <Outlet />  ← 页面内容区（flex-1）             │
│                                               │
└──────────────────────────────────────────────┘
```

**ViewerPage 双视口布局：**

```
┌─────────────────────┬────┬──────────────┐
│ 左视口 (flex-1)      │工  │ 评测面板      │
│ 参考高模 / 结构重叠   │具  │ (27rem)      │
│                     │栏  │ 评测类型锁定   │
├─────────────────────┤    │              │
│ 右视口 (flex-1)      │    │ 自动检测数据   │
│ 低模 + 高亮叠加      │    │ 逐条审核列表   │
└─────────────────────┴────┴──────────────┘
```

---

## 4. 功能模块详解

### 4.1 模型上传模块

**组件：** `ModelDropZone`

- 支持 OBJ（推荐）和 FBX（实验性）
- 单模型 ≤100MB，高模 ≤1024MB
- 拖放悬停态缩放 `scale-[1.01]`
- 加载中旋转动画 + "正在解析模型..."
- 错误态：警告图标 + 重新选择

### 4.2 首页 Dashboard

**组件：** `DashboardPage`, `ModelCard`, `ModelCardThumbnail`, `StatsCard`

**结构：**

1. **Hero 区域**：标题 + 描述 + CTA 按钮
2. **统计卡片**：已评测模型数 / 平均总分 / 优秀率 / 最普遍问题
3. **示例模型区**（独立筛选）：
   - 用途筛选：全部 / 游戏 / 通用
   - 类型筛选：全部类型 / 静态 / 可动
   - 4 优秀 + 4 问题案例卡片
   - 每张卡片：3D 缩略图 + 名称 + 格式 + 大小（MB/KB 智能切换） + 分数（1 位小数） + 评级条
4. **我的模型区**（独立筛选）：
   - 同上筛选逻辑
   - 用户评测过的模型列表
   - 点击 → 已评测去报告页，未评测去向导

**3D 缩略图技术（ModelCardThumbnail）：**
- 单例 WebGLRenderer（`preserveDrawingBuffer: true`）
- 离屏渲染 400×300 → PNG data URL → `<img>` 显示
- 自动居中 + 缩放到合适尺寸（`dist = radius / sin(fov/2)`）
- 线框+实体混合渲染：灰色面 + 深色半透明线框
- 渲染结果缓存 `Map<string, string>`，避免重复渲染
- 解决浏览器 WebGL 上下文限制（~8-16 个）

### 4.3 3D 模型浏览

**组件：** `ViewerCanvas`, `ViewerScene`, `LoadedModel`, `CompareCanvas`, `CompareScene`, `DualViewport`, `SyncedOrbitControls`

**三种渲染模式：** 线框 / 线框+实体 / 白模

**结构重叠模式（ViewerPage 特有）：**
- 评测"结构跟随性"时自动启用
- 高模（蓝色半透明，opacity 0.55）与低模在同一视口叠加
- 可直观对比布线偏离程度

**模型归一化：** 自动居中缩放，包围盒最大维度归一化

### 4.4 自动检测模块（7 项）

**文件：** `topology-analyzer.ts`（~810 行）

| 检测项 | 算法 | 输出 |
|--------|------|------|
| 面型统计 | OBJ 原始面遍历，不依赖三角化 | 四边/三角/N-gon 数量+占比 |
| 非流形边 | 位置去重，统计边共享面数，≥3 面 = 非流形 | 数量 + 3D 坐标 |
| 重叠面 | 基于 OBJ 原始面，重心+顶点重合判定 | 重叠对 + 原始面索引 |
| **破洞面（新增）** | 位置去重，统计边共享面数，=1 面 = 边界边 | 数量 + 3D 坐标 |
| 极点 | OBJ 原始面邻接图，valence ≥6 = 极点 | 数量 + 坐标 |
| 密度分布 | 三角面面积 → 顶点平均 → 归一化 [0,1] | 每顶点密度值 |
| 循环线 | 四边面对边关系 → 追踪闭合回路 | 循环线数量 + 边坐标 |

### 4.5 评测审核模块

**组件：** `EvalPanel`, `CompareEvalPanel`, `FlowReviewCard`, `ManualRatingRow`, `AutoResultRow`, `ScoreBadge`, `RadarChart`

**三种评测模式：**

1. **传统模式**（EvalPanel 默认）：自动检测自动计分 + 人工五档评级（糟糕/差/普通/良好/优秀）
2. **逐条审核模式**（FlowReviewCard）：每条 1-10 打分，3D 高亮联动
3. **锁定模式**（EvalPanel `locked=true`）：评测类型不可更改，已在向导中设定

**3D 高亮联动（8 种）：**

| 评测项 | 高亮颜色 | 高亮类型 |
|--------|----------|----------|
| 四边/三角面比例 | `#ff9500` 橙色 | 三角面填充 |
| 三角面分布合理性 | 同上 | 三角面填充 |
| N-gon 数量 | `#ff3b30` 红色 | N-gon 面填充 |
| 极点分布 | `#4a90d9` 蓝色 | 蓝色圆点 |
| 非流形边 | `#ff3b30` 红色 | 红色线段 |
| 重叠面 | `#af52de` 紫色 | 重叠面填充 |
| 密度分布合理性 | 蓝-红渐变 | 全模顶点着色 |
| 循环线完整性 | `#34c759` 绿色 | 绿色线段 |

### 4.6 优化建议引擎

**文件：** `suggestion-engine.ts`

根据自动检测结果 + 人工评分自动生成：
- **严重问题（critical）**：必须修复的拓扑错误
- **建议优化（warning）**：推荐改进的方向
- **做得好的（good）**：继续保持的亮点
- **总结（summary）**：一段概括性的质量评估

### 4.7 模型对比模块

**组件：** `ModelComparePage`

- 对比池管理（`comparePoolStore`）：从评测记录选中 2 个模型
- 雷达图双模型叠加对比
- 各维度差异高亮（谁优谁劣）
- 共同问题和差异分析

### 4.8 数据分析模块

**组件：** `AnalyticsPage`

- 分数分布直方图
- 质量分级（优/中/差占比）
- 各维度平均得分
- 类别对比（游戏 vs 通用）
- 频繁问题排名
- 自动洞察生成

### 4.9 评测标准展示

**组件：** `StandardsPage`

- 4 套标准 Tab 切换
- 每套标准：维度列表 + 各条目详情（名称、满分、检测方式、评分规则、描述）

### 4.10 评测历史

**组件：** `HistoryPage`, `HistoryCard`

- 列表：模型名 + 格式 + 大小 + 日期 + 分数 + 评级
- 展开：雷达图 + 维度得分 + 自动/人工得分 + 删除

---

## 5. 评测体系设计（当前）

### 5.1 四套评测标准概览

| | game-static | game-dynamic | general-static | general-dynamic |
|---|---|---|---|---|
| **适用场景** | 游戏场景道具 | 游戏角色/生物 | 影视/建筑/展示 | 影视动画角色 |
| **总分** | 100 | 100 | 100 | 100 |
| **维度数** | 3 | 4 | 3 | 4 |
| **条目数** | 11 | 11 | 11 | 11 |
| **自动检测** | 7 项 | 7 项 | 7 项 | 7 项 |
| **人工评测** | 4 项 | 4 项 | 4 项 | 4 项 |

### 5.2 评测维度与权重

| 维度 | game-static | game-dynamic | general-static | general-dynamic |
|---|---|---|---|---|
| 面型质量 | 30 | 15 | 35 | 20 |
| 面错误 | 30 | 25 | 30 | 25 |
| 布线合理性 | 40 | 20 | 35 | 25 |
| 绑定动画友好性 | — | 40 | — | 30 |

### 5.3 面型质量维度（所有类型共有，分值不同）

| 条目 | 检测方式 | 规则 |
|------|----------|------|
| 四边/三角面比例 | 自动 | 面数阶梯阈值扣分 |
| 三角面分布合理性 | 人工 | 1-5 五档评级 |
| 极点分布 | 人工 | 1-5 五档评级 |
| N-gon 数量 | 自动 | 每 1 个扣 1 分 |

### 5.4 面错误维度（所有类型共有，分值不同）

| 条目 | 检测方式 | 规则 |
|------|----------|------|
| 非流形边 | 自动 | 每条扣 0.5 分 |
| 重叠面 | 自动 | 每组扣 0.5 分 |
| **破洞面** | 自动 | 每条边界边扣 0.5 分 |

### 5.5 布线合理性维度（所有类型共有，分值不同）

| 条目 | 检测方式 | 规则 |
|------|----------|------|
| 结构跟随性 | 人工 | 1-5 五档评级，偏差大则≤6分 |
| **平坦区域面数控制** | 人工 | 1-5 五档评级 |
| 密度分布合理性 | 人工 | 1-5 五档评级 |
| 循环线完整性 | 人工 | 1-5 五档评级 |

### 5.6 绑定动画友好性维度（game-dynamic / general-dynamic 特有）

| 条目 | 检测方式 | 规则 |
|------|----------|------|
| 可动部位面数支撑 | 人工 | 1-5 五档评级 |
| 可动部位环形线 | 人工 | 1-5 五档评级 |

### 5.7 各类型详细分值分配

**game-static (100分)：**
- 面型质量(30)：四边/三角面比例(10) + 三角面分布(8) + 极点分布(6) + N-gon(6)
- 面错误(30)：非流形边(15) + 重叠面(10) + 破洞面(5)
- 布线合理性(40)：结构跟随性(13) + 平坦区域面数控制(7) + 密度分布(10) + 循环线(10)

**game-dynamic (100分)：**
- 面型质量(15)：四边/三角面比例(5) + 三角面分布(4) + 极点分布(3) + N-gon(3)
- 面错误(25)：非流形边(12) + 重叠面(8) + 破洞面(5)
- 布线合理性(20)：结构跟随性(7) + 平坦区域面数控制(3) + 密度分布(6) + 循环线(4)
- 绑定动画友好性(40)：可动部位面数支撑(20) + 可动部位环形线(20)

**general-static (100分)：**
- 面型质量(35)：四边/三角面比例(11) + 三角面分布(10) + 极点分布(7) + N-gon(7)
- 面错误(30)：非流形边(15) + 重叠面(10) + 破洞面(5)
- 布线合理性(35)：结构跟随性(11) + 平坦区域面数控制(6) + 密度分布(10) + 循环线(8)

**general-dynamic (100分)：**
- 面型质量(20)：四边/三角面比例(7) + 三角面分布(5) + 极点分布(4) + N-gon(4)
- 面错误(25)：非流形边(12) + 重叠面(8) + 破洞面(5)
- 布线合理性(25)：结构跟随性(8) + 平坦区域面数控制(4) + 密度分布(7) + 循环线(6)
- 绑定动画友好性(30)：可动部位面数支撑(15) + 可动部位环形线(15)

---

## 6. 评分计算系统

### 6.1 精度

所有分数精确到**小数点后 1 位**，使用 `roundScore(n) = Math.round(n * 10) / 10` 统一舍入。

### 6.2 自动评分算法

```
computeAutoScore(criterion, report):
  switch criterion.id:
    quad-tri-ratio:  基于面数阶梯阈值，超出按比例扣分 → roundScore
    ngon-count:      maxScore - ngonCount → roundScore
    non-manifold:    maxScore - count × 0.5 → roundScore
    overlapping:     maxScore - count × 0.5 → roundScore
    boundary-holes:  maxScore - count × 0.5 → roundScore
```

### 6.3 人工评分算法

```
五档评级模式：
  computeManualScore(criterion, level):
    return roundScore(RATING_PCTS[level] × criterion.maxScore)
    // RATING_PCTS: 1→0, 2→0.25, 3→0.5, 4→0.75, 5→1

逐条审核模式：
  mapped = roundScore((rawScore / 10) × criterion.maxScore)
  total = roundScore(Σ mapped)
```

### 6.4 总分计算

```
computeTotalScore(evaluationType, report, manualRatings):
  autoTotal    = roundScore(Σ computeAutoScore(auto criteria))
  manualTotal  = roundScore(Σ computeManualScore(manual criteria))
  total        = roundScore(autoTotal + manualTotal)
  maxTotal     = standard.totalScore (= 100)
```

---

## 7. 3D 可视化系统

### 7.1 渲染引擎

- Three.js 0.185 + @react-three/fiber（声明式 3D）
- 双 WebGL 上下文：交互视口（R3F Canvas）+ 缩略图渲染（单例 renderer）

### 7.2 场景组织

**单模型场景（ViewerScene）：**
```
Canvas
├── Lights（环境光 + 方向光）
├── Grid（参考网格，可隐藏）
├── LoadedModel（归一化 + 居中）
│   └── Mesh（PBR MeshStandardMaterial）
└── HighlightOverlay（8种高亮类型）
    ├── 面高亮（三角/N-gon/重叠/密度）
    ├── 线高亮（非流形边/循环线）
    └── 点高亮（极点）
```

**结构重叠场景（ViewerPage 结构模式）：**
```
Canvas
├── Lights
├── LoadedModel（高模，蓝色半透明 opacity=0.55）
├── LoadedModel（低模，实体渲染）
└── HighlightOverlay（评测联动高亮）
```

### 7.3 高亮叠加技术

- 合并所有子 Mesh geometry + index 到统一 BufferGeometry
- OBJ 原始面索引 → 三角化面索引映射表
- 归一化变换与 LoadedModel 一致
- `polygonOffset(-10, -10)` 避免 z-fighting
- 极点/线条放大 `scale 1.002` 避免与表面重叠

### 7.4 缩略图渲染（ModelCardThumbnail）

- 单例 WebGLRenderer + `preserveDrawingBuffer: true`
- 400×300 离屏渲染 → `toDataURL('image/png')` → `<img>` 标签
- 自动适配相机（`dist = radius / sin(fov/2)`）
- 线框+实体混合：`MeshStandardMaterial({ color: 0xd4d4d8 })` + `EdgesGeometry` + `LineBasicMaterial({ color: 0x333333, opacity: 0.4 })`
- 渲染结果缓存 `Map<string, string>`
- 解决 8 张卡片同时渲染的 WebGL 上下文限制

---

## 8. 状态管理与数据流

### 8.1 Store 职责划分（10 个 Store）

| Store | 职责 | 持久化 |
|-------|------|--------|
| `modelStore` | 单模型加载/卸载（含参考高模 referenceModel） | session |
| `compareStore` | 对比双模加载/卸载 | session |
| `evalStore` | 评测核心状态（evaluationType, autoReport, manualRatings, flowReviewScores） | session |
| `evalFlowStore` | 逐条审核流程（isActive, currentIndex, criteria[], reviewScores） | session |
| `highlightStore` | 当前高亮项（criterionId） + 检测结构模式 | session |
| `viewerStore` | 3D 视图设置（renderMode, showGrid, material properties） | localStorage |
| `evalHistoryStore` | 评测历史记录（records[]，含示例模型的预评测数据） | localStorage |
| `wizardStore` | 评测向导步骤状态 | session |
| `comparePoolStore` | 模型对比池（可放多个模型，选 2 个对比） | session |
| `uiStore` | 全局 UI 状态（侧边栏等） | session |

### 8.2 核心数据流

```
用户操作
    ↓
modelStore.loadModel() / compareStore 加载
    ↓
model-parser.ts 解析 OBJ/FBX
    ↓
topology-analyzer.ts 7 项自动检测
    ↓
evalStore.setAutoReport()
    ↓
用户逐条打分 / 五档评级
    ↓
computeAutoScore + computeManualScore → computeTotalScore
    ↓
roundScore 舍入到 1 位小数
    ↓
evalHistoryStore.addRecord() → localStorage
    ↓
suggestion-engine.ts 生成优化建议
```

### 8.3 3D 高亮同步机制

```
评测面板点击条目
    ↓
highlightStore.setCriterion(criterionId)
    ↓
HighlightOverlay 订阅 criterionId
    ↓
getHighlightData(criterionId, model, faceData, report)
    ↓
构建高亮 geometry → 渲染到 3D 场景
    ↓
（结构跟随性特殊处理：自动切换为结构重叠模式）
```

### 8.4 示例模型加载流程

```
Dashboard 点击示例卡片
    ↓
fetch low.obj → text() → new File → loadModel()
    ↓
fetch high.obj → text() → new File → loadReferenceModel()
    ↓
evalStore.setEvaluationType(exampleRecord.evaluationType)
    ↓
navigate('/viewer/single')
    ↓
EvalPanel locked=true（类型不可更改）
```

---

## 9. 数据持久化策略

### 9.1 持久化内容

| 数据 | 存储方式 | Key | 上限 |
|------|----------|-----|------|
| 3D 视图设置 | localStorage | `topoeval-viewer-settings` | 无 |
| 评测历史记录 | localStorage（v2 migrate） | `topoeval-history` | 最近 200 条 |
| 最近模型列表 | localStorage | `topoeval-recent-models` | 最近 20 个 |

### 9.2 示例模型数据

- 8 个示例模型定义在 `example-models.ts` 中硬编码
- 评测分数为预估值（`evalStatus: 'completed'`）
- 实际 .obj 文件放在 `public/models/examples/{type}/` 下
- 运行时通过 fetch 加载，不走 localStorage

### 9.3 数据迁移

`evalHistoryStore` 有 v1→v2 迁移逻辑：
- 旧 `modelType: 'static'|'dynamic'` → 新 `evaluationType: 'game-static'|'game-dynamic'`
- 新增 `evalStatus` 默认为 `'completed'`

---

## 10. 视觉设计系统

### 10.1 设计语言

- **风格：** Apple HIG — 大圆角、玻璃质感（glass morphism）、极简留白
- **配色：** 中性色（黑白灰阶梯） + 蓝色 accent #0071e3 + 红/黄/绿三元色
- **字体：** 系统无衬线 + mono 等宽数字
- **圆角：** rounded-lg(8px) / rounded-2xl(16px) / rounded-full
- **Glass 样式：** `bg-white/72 + backdrop-blur-xl + border-black/5`

### 10.2 评分色彩分级

| 得分率 | 颜色 | 评级 |
|--------|------|------|
| < 40% | `text-red-500` | 需改进 |
| 40-70% | `text-amber-500` | 良好 |
| > 70% | `text-emerald-500` | 优秀 |

### 10.3 布局规范

- 评测面板：固定 `w-[27rem]` (432px)
- Header：固定 `h-12` (48px)
- 首页最大宽：`max-w-[1100px]`
- 工具卡片：`p-4` (16px)
- 评测条目展开：CSS Grid `grid-rows-[0fr]` ↔ `grid-rows-[1fr]` 动画

---

## 11. 技术架构概览

### 11.1 技术栈

| 技术 | 用途 |
|------|------|
| React 19 + TypeScript 5.7 | UI 框架 |
| Vite 7 | 构建工具 |
| Tailwind CSS v4 | 样式系统 |
| Three.js 0.185 + @react-three/fiber | 3D 渲染 |
| Zustand 5 | 状态管理 |
| React Router 7 | SPA 路由 |
| Vercel | 部署平台 |

### 11.2 项目结构

```
src/
├── components/
│   ├── evaluation/     (7 个组件) — EvalPanel, CompareEvalPanel, FlowReviewCard, ManualRatingRow, AutoResultRow, RadarChart, ScoreBadge
│   ├── layout/         (3 个组件) — Header, AppLayout, Sidebar
│   ├── viewer/         (14 个组件) — 3D 场景、工具栏、高亮、缩略图
│   ├── standards/      (3 个组件) — 评测标准展示
│   ├── ui/             (8 个组件) — 通用 UI 原语
│   └── shared/         (3 个组件) — 加载/错误/空状态
├── pages/              (10 个页面) — Dashboard, Viewer, Compare, EvalWizard, ModelCompare, Report, Standards, History, Analytics, Upload
├── stores/             (10 个 Store) — model, compare, eval, evalFlow, highlight, viewer, evalHistory, wizard, comparePool, ui
├── lib/                (8 个模块) — topology-analyzer, model-parser, highlight-data, suggestion-engine, storage, constants, utils, cameraSync
├── data/               (2 个文件) — 4 套评测标准 + 8 个示例模型
├── types/              (2 个文件) — evaluation, model
├── hooks/              (1 个 Hook) — useDragAndDrop
└── routes/             (1 个文件) — 路由配置
```

**总计：约 80 个源文件**

---

## 12. 当前已知限制

### 12.1 功能限制

1. **FBX 支持不完整**：仅支持基础三角面统计，原始面数据检测精度较低
2. **仅本地存储**：评测结果仅保存在浏览器 localStorage，无云端同步
3. **无批量评测**：每次只能评测一个模型
4. **无用户系统**：无登录/多用户隔离
5. **无导出功能**：评测结果不能导出为 PDF/Excel
6. **自动化程度有限**：11 条中 7 条自动、4 条人工。布线质量完全依赖人工判断
7. **无模型编辑能力**：仅查看和评测，不能修改模型
8. **无动画预览**：可动模型的绑定动画评测依赖静态判断
9. **示例模型不全**：目前仅 game-dynamic 类型有完整的 3 个 OBJ 文件，其余 3 种类型（game-static, general-static, general-dynamic）共 9 个文件待上传
10. **评测标准不可自定义**：4 套标准硬编码，用户无法修改权重或添加维度
11. **破洞面检测无 3D 高亮**：目前只在报告和评测卡中显示数据，3D 视口无对应高亮叠加层
12. **模型对比仅支持 2 个**：对比池可放多个但只能选 2 个做对比

### 12.2 技术限制

1. **大模型性能**：合并 geometry + 构建映射表对 >100K 面模型有开销
2. **重叠面检测 O(n²)**：面片对比较，面数多时性能下降
3. **循环线仅支持四边面**：三角面为主的网格无法检测
4. **localStorage 5-10MB 限制**
5. **高模 47MB 加载慢**：game-dynamic 高模首次加载需数秒

### 12.3 浏览器兼容性

- 需要 WebGL 2.0
- 需要 ES2020+
- 不支持 IE 11

---

## 13. 已完成功能清单

### Phase 1 完成

- [x] OBJ/FBX 模型上传和解析
- [x] 3D 线框/实体/混合渲染
- [x] 6 项自动拓扑检测（面型、非流形、重叠、极点、密度、循环线）
- [x] 2 套评测标准（静态/可动，共 9 条指标）
- [x] 逐条审核流程（Flow Review）
- [x] 3D 高亮联动（7 种高亮类型）
- [x] 打分进度条和动画
- [x] 雷达图（纯 SVG）
- [x] 评测历史记录（localStorage）
- [x] 评测标准展示页面
- [x] 双视口高低模对比

### Phase 2 完成

- [x] **4 套评测标准**（game/general × static/dynamic）
- [x] **评测向导**（选类型 → 上传 → 评测）
- [x] **新增 2 条评测指标**：破洞面（自动检测）、平坦区域面数控制（人工评测），共 11 条
- [x] **破洞面检测算法**（`detectBoundaryEdges`）
- [x] **评分 1 位小数精度**（`roundScore` 全局统一舍入）
- [x] **首页重设计**：示例模型区 + 我的模型区，独立筛选
- [x] **8 个示例模型**（4 优秀 + 4 问题），预评测分数
- [x] **3D 缩略图**（离屏渲染 + 线框混合 + 缓存）
- [x] **ViewerPage 双视口 + 结构重叠模式**
- [x] **EvalPanel 锁定模式**（locked prop）
- [x] **评测报告页**（ReportPage）：总分 + 雷达图 + 优化建议
- [x] **优化建议引擎**（suggestion-engine）
- [x] **模型对比页**（ModelComparePage）：对比池 + 雷达图对比
- [x] **数据分析页**（AnalyticsPage）：统计 + 洞察
- [x] **文件大小智能显示**（≥1MB 显示 MB，<1MB 显示 KB）
- [x] **示例模型真实 OBJ 资产**（game-dynamic 完整，其余待上传）
- [x] **破洞面优化建议 + 零错误检查更新**

---

## 14. 下一阶段规划建议

### 14.1 资产完善

- [ ] 上传剩余 9 个 OBJ 文件（game-static ×3, general-static ×3, general-dynamic ×3）
- [ ] 完善示例模型的 `autoReport`（运行时 `analyzeTopology` 真实分析替代预估值）

### 14.2 评测体验增强

- [ ] 破洞面 3D 视口高亮叠加（当前缺，类似非流形边的红色线段高亮）
- [ ] 平坦区域面数控制的自动检测辅助（计算平面区域面密度 vs 曲面区域面密度比）
- [ ] 评测对比报告导出（PDF/图片）
- [ ] 评测模板预设（快速应用某套评分）

### 14.3 模型对比增强

- [ ] 对比池支持 3+ 模型
- [ ] 自动结构差异分析（高模→低模 Hausdorff 距离热力图）
- [ ] 模型版本对比（同一模型的不同版本）

### 14.4 数据管理

- [ ] 评测结果导出（JSON/CSV/PDF）
- [ ] 评测记录批量删除
- [ ] 评测记录搜索和排序
- [ ] IndexedDB 升级（替代 localStorage，突破 5MB 限制）

### 14.5 用户体验

- [ ] 键盘快捷键（评测导航、打分 1-10 数字键）
- [ ] 深色模式
- [ ] 移动端适配（平板查看 3D 模型）
- [ ] 国际化（英文版）
- [ ] 加载骨架屏（替代 spinner）

### 14.6 自动化增强

- [ ] AI 辅助评分（用大模型根据渲染图 + 线框图生成评分建议）
- [ ] 面片数阶梯阈值可配置化
- [ ] 评测标准自定义编辑器（拖拽调整权重）

---

> 本文档反映 TopoEval 截至 2026-07-26 的完整开发状态，包含 Phase 1 + Phase 2 全部功能。
> 下阶段规划从第 14 节出发，可根据优先级和资源选取实现。
