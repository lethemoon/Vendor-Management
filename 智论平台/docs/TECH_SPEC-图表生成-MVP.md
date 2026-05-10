# 图表生成 (Chart Generation) MVP版本 技术规格

> 版本：1.0.0
> 日期：2026-05-10
> 负责人：ArchitectAgent
> 状态：待批准
> 基于PRD：`/workspace/智论平台/docs/PRD-图表生成-MVP.md` (2170行)
> 参考实现：`aigc.ts` (~800行) + `library.ts` (~700行) + `api.ts` (~689行)
> 对标规格：`TECH_SPEC-知识库引用管理-MVP.md` (格式与风格参考)

---

## 1. 系统架构设计

### 1.1 整体模块架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                     前端层 (Next.js 14+ App Router)                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    页面集成层 (Pages)                         │   │
│  │                                                             │   │
│  │  ┌─────────────────────────┐  ┌──────────────────────────┐ │   │
│  │  │ /aigc/result/[id]       │  │ /library/stats           │ │   │
│  │  │  AIGC检测结果页(扩展)    │  │  知识库统计页(新建)      │ │   │
│  │  │  ← 嵌入4个AIGC图表        │  │  ← 嵌入4个Library图表    │ │   │
│  │  └─────────────────────────┘  └──────────────────────────┘ │   │
│  │  ┌─────────────────────────┐  ┌──────────────────────────┐ │   │
│  │  │ /library                │  │ /dashboard (Phase 2)     │ │   │
│  │  │  文献库主页(嵌入迷你饼图) │  │  用户仪表盘              │ │   │
│  │  └─────────────────────────┘  └──────────────────────────┘ │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │                    图表组件层 (Chart Kit)                      │   │
│  │                                                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │RiskPie   │ │ParaHeat  │ │OptTrend  │ │VerCompare│ 场景①  │   │
│  │  │Chart     │ │map       │ │Line      │ │Bar       │ AIGC   │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │   │
│  │  │TypeDist  │ │Monthly   │ │Format    │ │Citation  │ 场景②  │   │
│  │  │Pie       │ │TrendArea │ │UsageBar  │ │Top10Bar  │ Library│   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │   │
│  │  │Citation  │ │Keyword   │ │Writing   │ │          │ 场景③  │   │
│  │  │NetGraph  │ │Cooccur   │ │Progress  │ │          │ Paper  │   │
│  │  │(ECharts) │ │(ECharts) │ │(ECharts) │ │          │ Phase2 │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │   │
│  │  │DetectHist│ │WordCons  │ │Feature   │ │          │ 场景④  │   │
│  │  │Trend     │ │Stack     │ │UsageRadar│ │          │ User   │   │
│  │  │(Recharts)│ │(Recharts)│ │(ECharts) │ │          │ Phase2 │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │                  基础设施层 (Infrastructure)                   │   │
│  │                                                               │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │   │
│  │  │ ChartProvider │ │ useChartData  │ │ ChartExport          │  │   │
│  │  │ (主题/响应式/  │ │ Hooks         │ │ (PNG/SVG导出)       │  │   │
│  │  │  空状态/骨架屏)│ │ (4个场景hook) │ │ html-to-image       │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │   │
│  │  │ ChartCard     │ │ ChartGrid     │ │ CustomTooltip        │  │   │
│  │  │ (统一卡片容器) │ │ (网格布局)    │ │ (统一样式Tooltip)    │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘  │   │
│  │  ┌──────────────┐ ┌──────────────┐                          │   │
│  │  │ EmptyState    │ │ ChartSkeleton│                          │   │
│  │  │ (空状态组件)  │ │ (骨架屏)     │                          │   │
│  │  └──────────────┘ └──────────────┘                          │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │                     数据获取层 (Data Layer)                    │   │
│  │                                                               │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐  │   │
│  │  │ chartApi (新增)   │  │ 复用已有API:                       │  │   │
│  │  │ - aigcChartApi    │  │ - aigcApi.getDetection()          │  │   │
│  │  │ - libraryChartApi │  │ - aigcApi.getHistoryDetail()      │  │   │
│  │  └──────────────────┘  │ - libraryApi.getList()             │  │   │
│  │                         │ - libraryApi.getPaperCitations()   │  │   │
│  │                         └──────────────────────────────────┘  │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────────┘
                                 │ HTTP/HTTPS (JSON)
┌────────────────────────────────▼────────────────────────────────────┐
│                    API路由层 (Fastify + Zod)                          │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  /api/v1/aigc/detections/:id/chart/*  ← 扩展 aigc.ts            │  │
│  │  ├── GET /risk-pie           → RiskPieChart数据                 │  │
│  │  ├── GET /paragraph-heatmap  → ParagraphHeatmap数据             │  │
│  │  ├── GET /optimization-trend→ OptimizationTrendLine数据         │  │
│  │  └── GET /version-compare    → VersionCompareBar数据            │  │
│  │                                                               │  │
│  │  /api/v1/library/stats/*  ← 新建或扩展 library.ts               │  │
│  │  ├── GET /type-distribution  → TypeDistributionPie数据          │  │
│  │  ├── GET /monthly-trend      → MonthlyTrendArea数据            │  │
│  │  ├── GET /format-usage       → FormatUsageBar数据              │  │
│  │  └── GET /citation-top10     → CitationTop10Bar数据            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  共享中间件(从aigc.ts复用):                                            │
│  ├─ fastify.authenticate (JWT认证)                                   │
│  ├─ Zod schema验证                                                    │
│  ├─ Redis缓存读写（图表专用命名空间）                                  │
│  └─ 统一错误响应格式                                                   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│                       服务层 + 数据层                                 │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ chartService     │  │ Prisma ORM       │  │ Redis 缓存       │   │
│  │ (新建 ~400行)    │  │ 聚合查询:         │  │ 命名空间:        │   │
│  │ - 数据聚合逻辑   │  │ ├─ AIGCDetection  │  │ chart:{scope}:   │   │
│  │ - 颜色映射计算   │  │ ├─ OptimizationRec│  │ {type}:{params}  │   │
│  │ - 排名/百分率    │  │ ├─ Document       │  │ TTL=300s         │   │
│  │ - 时间序列聚合   │  │ └─ PaperCitation  │  │                  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                       │
│  ⚠️ 重要：不需要新建任何数据库表，所有数据从现有表聚合查询               │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块职责划分

| 模块 | 文件路径 | 行数估算 | 职责 | 新建/复用 |
|-----|---------|---------|------|---------|
| **ChartProvider** | `frontend/components/charts/ChartProvider.tsx` | ~120行 | 全局主题注入、CSS变量、Context提供 | **新建** |
| **ChartCard容器** | `frontend/components/charts/ChartCard.tsx` | ~80行 | 统一卡片外壳（标题/操作栏/导出按钮） | **新建** |
| **ChartGrid布局** | `frontend/components/charts/ChartGrid.tsx` | ~60行 | 响应式网格布局（2×2/单列自适应） | **新建** |
| **CustomTooltip** | `frontend/components/charts/CustomTooltip.tsx` | ~100行 | 所有图表统一的Tooltip样式和行为 | **新建** |
| **EmptyState** | `frontend/components/charts/EmptyState.tsx` | ~50行 | 无数据时的空状态占位符 | **新建** |
| **ChartSkeleton** | `frontend/components/charts/ChartSkeleton.tsx` | ~70行 | 加载态骨架屏（按图表类型区分） | **新建** |
| **useChartData hooks** | `frontend/lib/hooks/useChartData.ts` | ~350行 | 4个AIGC + 4个Library = 8个数据Hook | **新建** |
| **chartApi** | `frontend/lib/api.ts` (扩展) | ~100行 | 图表专用API调用方法 | **扩展** |
| **RiskPieChart** | `frontend/components/charts/RiskPieChart.tsx` | ~180行 | 风险等级分布环形饼图 | **新建** |
| **ParagraphHeatmapChart** | `frontend/components/charts/ParagraphHeatmapChart.tsx` | ~250行 | 段落风险水平条形热力图 | **新建** |
| **OptimizationTrendLine** | `frontend/components/charts/OptimizationTrendLine.tsx` | ~220行 | 多轮优化趋势折线面积图 | **新建** |
| **VersionCompareBar** | `frontend/components/charts/VersionCompareBar.tsx` | ~200行 | 改写版本对比分组柱状图 | **新建** |
| **TypeDistributionPie** | `frontend/components/charts/TypeDistributionPie.tsx` | ~170行 | 文献类型分布饼图 | **新建** |
| **MonthlyTrendArea** | `frontend/components/charts/MonthlyTrendArea.tsx` | ~190行 | 月度新增文献面积图 | **新建** |
| **FormatUsageBar** | `frontend/components/charts/FormatUsageBar.tsx` | ~160行 | 引用格式使用频率柱状图 | **新建** |
| **CitationTop10Bar** | `frontend/components/charts/CitationTop10Bar.tsx` | ~200行 | TOP10被引文献排行榜 | **新建** |
| **ChartExport** | `frontend/components/charts/ChartExport.tsx` | ~80行 | PNG导出工具函数(html-to-image) | **新建** |
| **后端chart路由(aigc)** | `backend/src/routes/aigc.ts` (扩展) | ~200行 | 4个AIGC图表数据端点 | **扩展** |
| **后端chart路由(library)** | `backend/src/routes/library.ts` (扩展) | ~200行 | 4个Library图表数据端点 | **扩展** |
| **chartService** | `backend/src/services/chartService.ts` | ~400行 | 图表数据聚合业务逻辑 | **新建** |
| **图表类型定义(后端)** | `backend/src/types/chart.ts` | ~200行 | Zod Schema + TS接口 | **新建** |
| **图表类型定义(前端)** | `frontend/types/chart.ts` | ~180行 | Props接口 + 数据类型 | **新建** |
| **统计页面** | `frontend/app/library/stats/page.tsx` | ~150行 | 知识库独立统计页面 | **新建** |

### 1.3 ChartProvider 架构详细设计

#### 1.3.1 Provider 层级结构

```
┌─────────────────────────────────────────────────────────┐
│                   App Layout (RootLayout)                │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              ChartProvider (React Context)          │  │
│  │                                                   │  │
│  │  提供内容:                                         │  │
│  │  ├─ theme: ChartTheme (配色/字体/动画/间距)        │  │
│  │  ├─ isDarkMode: boolean                           │  │
│  │  ├─ exportConfig: ExportConfig (DPI/格式/水印)     │  │
│  │  └─ locale: string                                │  │
│  │                                                   │  │
│  │  注入效果:                                         │  │
│  │  ├─ CSS自定义属性 (--chart-primary, --chart-...)   │  │
│  │  ├─ 全局 <style> 标签注入主题变量                   │  │
│  │  └─ 子组件通过 useContext(ChartContext) 消费        │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         页面组件 (Page Level)                │  │  │
│  │  │                                             │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │  │
│  │  │  │ChartCard│ │ChartCard│ │ChartCard│       │  │  │
│  │  │  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │       │  │  │
│  │  │  │ │Chart│ │ │ │Chart│ │ │ │Chart│ │       │  │  │
│  │  │  │ │Comp  │ │ │Comp  │ │ │ │Comp  │ │       │  │  │
│  │  │  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │       │  │  │
│  │  │  └─────────┘ └─────────┘ └─────────┘       │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### 1.3.2 核心接口定义 — ChartTheme 类型系统

```typescript
// ========== frontend/types/chart.ts ==========

/** 风险等级颜色映射 */
export interface RiskColorMap {
  low: string;
  medium: string;
  mediumHigh: string;
  high: string;
}

/** 文献类型颜色映射 */
export interface DocumentTypeColorMap {
  JOURNAL_ARTICLE: string;
  THESIS: string;
  BOOK: string;
  CONFERENCE_PAPER: string;
  WEBPAGE: string;
  PATENT: string;
}

/** 引用格式颜色映射 */
export interface CitationFormatColorMap {
  GBT7714: string;
  APA7: string;
  MLA9: string;
}

/** 图表完整色彩方案 */
export interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  risk: RiskColorMap;
  documentType: DocumentTypeColorMap;
  citationFormat: CitationFormatColorMap;
  background: string;
  surface: string;
  border: string;
  gridLine: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

/** 渐变色配置 */
export interface ChartGradient {
  areaStart: string;
  areaEnd: string;
  areaOpacity: number;
}

/** 字体配置 */
export interface ChartFontConfig {
  family: string;
  sizeAxis: number;
  sizeLabel: number;
  sizeTitle: number;
  sizeTooltip: number;
  sizeLegend: number;
  weightNormal: number;
  weightBold: number;
}

/** 动画配置 */
export interface ChartAnimationConfig {
  duration: number;
  easing: string;
  staggerDelay: number;
  isActive: boolean;
}

/** 响应式断点配置 */
export interface ChartResponsiveConfig {
  breakpoints: { mobile: number; tablet: number; desktop: number };
  minChartWidth: number;
  minChartHeight: number;
}

/** 导出配置 */
export interface ExportConfig {
  dpi: number;
  format: 'png' | 'svg' | 'jpeg';
  quality: number;
  backgroundColor: string;
  includeWatermark: boolean;
  watermarkText?: string;
}

/** 完整图表主题 */
export interface ChartTheme {
  colors: ChartColors;
  gradient: ChartGradient;
  font: ChartFontConfig;
  animation: ChartAnimationConfig;
  responsive: ChartResponsiveConfig;
  export: ExportConfig;
  borderRadius: number;
  spacing: number;
}

/** Chart Context 值类型 */
export interface ChartContextValue {
  theme: ChartTheme;
  isDarkMode: boolean;
  exportConfig: ExportConfig;
  toggleDarkMode: () => void;
  updateTheme: (partial: Partial<ChartTheme>) => void;
}
```

#### 1.3.3 各图表组件数据接口定义

```typescript
// ========== 场景① 数据接口 ==========

export interface RiskPieChartData {
  segments: Array<{
    riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
    count: number;
    percentage: number;
    color: string;
    label: string;
  }>;
  totalParagraphs: number;
  overallScore: number;
}

export interface ParagraphHeatmapData {
  paragraphs: Array<{
    index: number;
    score: number;
    riskLevel: string;
    wordCount: number;
    issues: string[];
    preview: string;
    color: string;
    displayName: string;
  }>;
  sortBy: 'index' | 'score_asc' | 'score_desc';
  filterBy: 'all' | 'low' | 'medium' | 'medium-high' | 'high';
}

export interface OptimizationTrendData {
  points: Array<{
    roundLabel: string;
    roundNumber: number;
    score: number;
    changeFromPrevious: number | null;
    timestamp: string;
    actions?: string;
    isRebound: boolean;
  }>;
  safeThreshold: number;
  targetAchieved: boolean;
}

export interface VersionCompareData {
  dimensions: Array<{
    name: string;
    key: string;
    lowerIsBetter: boolean;
    unit: string;
  }>;
  versions: Array<{
    label: string;
    versionId: string;
    color: string;
    values: Record<string, number>;
    isRecommended: boolean;
  }>;
}

// ========== 场景② 数据接口 ==========

export interface TypeDistributionData {
  totalDocuments: number;
  types: Array<{
    type: string;
    label: string;
    icon: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  othersCount?: number;
}

export interface MonthlyTrendData {
  period: 'monthly' | 'weekly';
  dataPoints: Array<{
    periodLabel: string;
    displayLabel: string;
    count: number;
    cumulativeTotal: number;
    changeFromPrevious: number | null;
    isCurrentPeriod: boolean;
    isPeak: boolean;
  }>;
  average: number;
  maxCount: number;
  minCount: number;
  stagnantMonths: number[];
}

export interface FormatUsageData {
  formats: Array<{
    formatId: string;
    displayName: string;
    fullName: string;
    count: number;
    percentage: number;
    color: string;
    lastUsedAt: string | null;
  }>;
  totalUsages: number;
  primaryFormat: string | null;
}

export interface CitationTop10Data {
  rankings: Array<{
    rank: number;
    documentId: string;
    title: string;
    displayTitle: string;
    authors: string;
    year: number;
    type: string;
    citationCount: number;
    percentageOfTotal: number;
    color: string;
  }>;
  totalCitedDocuments: number;
  totalCitations: number;
}

// ========== Phase 2 接口（预留）==========

export interface CitationNetworkData {
  nodes: Array<{ id: string; name: string; category: string; value: number; symbolSize: number; metadata: Record<string, any> }>;
  links: Array<{ source: string; target: string; value: number; lineStyle?: Record<string, any> }>;
  categories: Array<{ name: string; color: string }>;
}

export interface KeywordCooccurrenceData {
  keywords: string[];
  matrix: number[][];
  maxValue: number;
}

export interface WritingProgressData {
  current: number;
  target: number;
  percentage: number;
  detail: Record<string, any>;
}

export interface DetectionHistoryTrendData {
  points: Array<{ date: string; count: number; label: string }>;
  granularity: 'day' | 'week' | 'month';
}

export interface WordConsumptionStackData {
  points: Array<{ date: string; detect: number; rewrite: number; dedup: number }>;
  totalQuota: number;
  usedQuota: number;
}

export interface FeatureUsageRadarData {
  indicators: Array<{ name: string; max: number }>;
  values: number[];
  categories: string[];
}
```

---

## 2. 完整组件清单

### 2.1 组件总览矩阵

| # | 组件名 | 技术栈 | 所属场景 | 数据来源 | Props数量 | 预估行数 | Phase |
|---|-------|--------|---------|---------|----------|---------|-------|
| 1 | RiskPieChart | Recharts PieChart | AIGC检测 | AIGCDetection.paragraphs 聚合 | 4 | ~180 | P0 |
| 2 | ParagraphHeatmapChart | Recharts BarChart(水平) | AIGC检测 | AIGCDetection.paragraphs 直接映射 | 6 | ~250 | P0 |
| 3 | OptimizationTrendLine | Recharts LineChart+Area | AIGC检测 | OptimizationRecord[] 聚合 | 5 | ~220 | P0 |
| 4 | VersionCompareBar | Recharts BarChart(分组) | AIGC检测 | RewriteVersion[] + 原始段落 | 5 | ~200 | P0 |
| 5 | TypeDistributionPie | Recharts PieChart | 知识库 | Document.type GROUP BY | 4 | ~170 | P0 |
| 6 | MonthlyTrendArea | Recharts AreaChart | 知识库 | Document.createdAt 按月聚合 | 5 | ~190 | P0 |
| 7 | FormatUsageBar | Recharts BarChart(垂直) | 知识库 | PaperCitation.format GROUP BY | 4 | ~160 | P0 |
| 8 | CitationTop10Bar | Recharts BarChart(水平) | 知识库 | PaperCitation JOIN Document TOP10 | 5 | ~200 | P0 |
| 9 | CitationNetworkGraph | ECharts Graph | 论文分析 | Paper ↔ Document 引用关系 | 6 | ~280 | P1 |
| 10 | KeywordCooccurrence | ECharts Heatmap | 论文分析 | Document.keywords 共现矩阵 | 5 | ~220 | P1 |
| 11 | WritingProgressGauge | ECharts Gauge | 论文分析 | Paper.wordCount 进度计算 | 5 | ~180 | P1 |
| 12 | DetectionHistoryTrend | Recharts LineChart | 用户仪表盘 | AIGCDetection.createdAt 时间序列 | 5 | ~180 | P1 |
| 13 | WordConsumptionStack | Recharts AreaChart(stack) | 用户仪表盘 | UsageLog.wordsUsed 分类堆叠 | 5 | ~190 | P1 |
| 14 | FeatureUsageRadar | ECharts Radar | 用户仪表盘 | UsageLog.action 分类统计 | 4 | ~170 | P1 |

### 2.2 场景①：AIGC检测可视化 — 组件Props规格

#### 2.2.1 RiskPieChart（风险等级分布饼图）

```typescript
interface RiskPieChartProps {
  detectionId: string;
  data?: RiskPieChartData;
  width?: number | string;
  height?: number;
  onSegmentClick?: (riskLevel: string) => void;
  variant?: 'full' | 'mini';
  showCenterLabel?: boolean;
  className?: string;
}
```

**数据来源映射：**
```
RiskPieChartData.segments ← AIGCDetection.paragraphs 按 riskLevel GROUP BY
  └─ color 映射: theme.colors.risk[riskLevel]
RiskPieChartData.totalParagraphs ← paragraphs.length
RiskPieChartData.overallScore ← detection.overallScore 或加权平均
```

**关键实现要点：**
- 使用 `innerRadius` + `outerRadius` 实现环形(Donut)效果
- `activeShape` 用 `<Sector>` 组件实现hover时扇区外扩(explode)
- 中心文字通过SVG `<text>` 叠加在PieChart上方
- `variant='mini'` 用于文献库主页嵌入场景
- `React.memo` + shallowEqual 防不必要重绘

#### 2.2.2 ParagraphHeatmapChart（段落风险热力图）

```typescript
interface ParagraphHeatmapChartProps {
  detectionId: string;
  data?: ParagraphHeatmapData;
  width?: number | string;
  height?: number;
  autoHeight?: boolean;
  onBarClick?: (paragraphIndex: number) => void;
  activeParagraphIndex?: number | null;
  defaultSortBy?: 'index' | 'score_asc' | 'score_desc';
  defaultFilterBy?: 'all' | 'low' | 'medium' | 'medium-high' | 'high';
  maxVisibleBars?: number;
  className?: string;
}
```

**数据来源映射：**
```
ParagraphHeatmapData.paragraphs ← AIGCDetection.paragraphs 直接映射
  └─ index, score, riskLevel, wordCount, issues, preview 原字段映射
  └─ color ← getScoreColor(score): 0-20=#bbf7d0, 21-40=#fef08a,
       41-60=#fed7aa, 61-80=#fecaca, 81-100=#fca5a5
  └─ displayName ← `P${index}`
```

**关键实现要点：**
- `layout="vertical"` 实现水平条形图（Y轴=段落序号）
- `<Cell>` 逐条设置颜色，支持选中高亮边框(`stroke`)
- 排序/筛选在前端完成（数据量有限<100条）
- `autoHeight`: 动态高度 = `paragraphCount * 36 + 80`，上限800px

#### 2.2.3 OptimizationTrendLine（多轮优化趋势折线图）

```typescript
interface OptimizationTrendLineProps {
  detectionId: string;
  data?: OptimizationTrendData;
  width?: number | string;
  height?: number;
  safeThreshold?: number;
  onPointClick?: (roundNumber: number) => void;
  activeRoundNumber?: number | null;
  className?: string;
}
```

**数据来源映射：**
```
OptimizationTrendData.points ← HistoryDetailResponse.optimizationRecords
  └─ 初始点(roundNumber=0): overallScore from DetectResponse.data
  └─ 优化点: afterAigcRate from each OptimizationRecordOutput
  └─ changeFromPrevious: 当前afterAigcRate - 上一轮afterAigcRate
  └─ isRebound: changeFromPrevious > 0 (AIGC率反弹)
  └─ actions: 从targetParagraphIndices推断操作描述
OptimizationTrendData.targetAchieved ← 最后一个点的 score < safeThreshold(20)
```

**关键实现要点：**
- `<ReferenceLine y={20}>` 绘制安全阈值虚线
- `<Area type="monotone">` + `<linearGradient>` 渐变填充
- 自定义 `<Dot>` 组件实现脉冲动画（最新数据点）+ 反弹警告标识⚠️
- 底部达标/未达标文字标记

#### 2.2.4 VersionCompareBar（改写版本对比柱状图）

```typescript
interface VersionCompareBarProps {
  detectionId: string;
  paragraphIndex: number;
  data?: VersionCompareData;
  width?: number | string;
  height?: number;
  onVersionSelect?: (versionId: string) => void;
  activeVersionId?: string;
  className?: string;
}
```

**数据来源映射：**
```
VersionCompareData.dimensions ← 固定4维度定义:
  [{name:"AIGC率", key:"aigcRate", lowerIsBetter:true},
   {name:"句式多样性", key:"sentenceVariance"},
   {name:"词汇丰富度", key:"vocabulary"},
   {name:"语义保持度", key:"semanticRetention"}]

VersionCompareData.versions ← RewriteVersion[] + 原始段落
  └─ "原始": paragraph.score + ruleBreakdown各字段
  └─ "保守型"/"平衡型"/"激进型": estimatedScore + confidence 映射
  └─ isRecommended: 默认 "balanced"(平衡型)
```

**关键实现要点：**
- 分组柱状图：每个X轴tick = 一个维度，每个版本 = 一个 `<Bar>` 系列
- 推荐版本通过 Legend formatter 添加星标 ★
- 点击柱子触发 `onVersionSelect` 联动 DiffViewer
- 空数据展示 EmptyState 占位

### 2.3 场景②：知识库统计面板 — 组件Props规格

#### 2.3.1 TypeDistributionPie（文献类型分布饼图）

```typescript
interface TypeDistributionPieProps {
  userId: string;
  data?: TypeDistributionData;
  width?: number | string;
  height?: number;
  variant?: 'full' | 'mini';
  onSegmentClick?: (documentType: string) => void;
  mergeThreshold?: number;
  className?: string;
}
```

**数据来源映射：**
```
TypeDistributionData ← libraryApi.getList({pageSize:1}).statistics.typeDistribution
  或 GET /api/v1/library/stats/type-distribution
  └─ totalDocuments: statistics.totalCount
  └─ types: 每种DocumentType展开为 {type, label, icon, count, percentage, color}
  └─ color: theme.colors.documentType[type]
```

**特殊处理：**
- `mergeThreshold`(默认5%): 小于此占比的扇区合并为"其他"类别
- 空数据展示引导式 EmptyState（含"+ 添加文献"按钮）
- 点击扇区联动文献列表筛选（URL参数更新）

#### 2.3.2 MonthlyTrendArea（月度新增文献面积图）

```typescript
interface MonthlyTrendAreaProps {
  userId: string;
  data?: MonthlyTrendData;
  width?: number | string;
  height?: number;
  months?: number;
  className?: string;
}
```

**数据来源映射：**
```
MonthlyTrendData.dataPoints ← SQL聚合:
  SELECT DATE_TRUNC('month', created_at), COUNT(*)
  FROM "Document" WHERE userId=$1 AND created_at >= now() - interval '6 months'
  GROUP BY 1 ORDER BY 1
  └─ cumulativeTotal: 累计求和
  └─ changeFromPrevious: 与上月差值
  └─ isPeak: count === MAX(all counts)
MonthlyTrendData.stagnantMonths ← 连续count=0的月份列表
```

#### 2.3.3 FormatUsageBar（引用格式使用频率柱状图）

```typescript
interface FormatUsageBarProps {
  userId: string;
  paperId?: string;
  data?: FormatUsageData;
  width?: number | string;
  height?: number;
  onFormatClick?: (formatId: string) => void;
  className?: string;
}
```

**数据来源映射：**
```
FormatUsageData.formats ← SQL: SELECT format, COUNT(*), MAX(created_at)
  FROM "PaperCitation" WHERE paperId=$1 GROUP BY format ORDER BY count DESC
  └─ color: theme.colors.citationFormat[formatId]
  └─ primaryFormat: count最大的formatId
```

#### 2.3.4 CitationTop10Bar（TOP10被引文献排行榜）

```typescript
interface CitationTop10BarProps {
  userId: string;
  data?: CitationTop10Data;
  width?: number | string;
  height?: number;
  limit?: number;
  onRankClick?: (documentId: string) => void;
  className?: string;
}
```

**数据来源映射：**
```
CitationTop10Data.rankings ← SQL JOIN:
  SELECT d.id, d.title, d.authors, d.year, d.type, COUNT(pc.id)
  FROM "Document" d JOIN "PaperCitation" pc ON pc."documentId" = d.id
  JOIN "Paper" p ON pc."paperId" = p.id WHERE p."userId"=$1
  GROUP BY d.id ORDER BY COUNT DESC LIMIT 10
  └─ displayTitle: title.length>30 ? 截断27字符+"..." : title
  └─ color: 渐变色（第1名最深#3b82f6 → 第10名最浅#f0f9ff）
```

### 2.4 Phase 2 组件接口概要（预留）

以下组件属于 Phase 2 规划范围，仅列出核心接口：

```typescript
// CitationNetworkGraph — ECharts Graph 力导向布局
interface CitationNetworkGraphProps {
  paperId: string; data?: CitationNetworkData;
  width?: number | string; height?: number;
  onNodeClick?: (nodeId: string) => void; className?: string;
}

// KeywordCooccurrence — ECharts Heatmap 关键词共现
interface KeywordCooccurrenceProps {
  userId: string; data?: KeywordCooccurrenceData;
  width?: number | string; height?: number;
  onCellClick?: (k1: string, k2: string) => void; className?: string;
}

// WritingProgressGauge — ECharts Gauge 写作进度
interface WritingProgressGaugeProps {
  paperId: string; metric?: 'wordCount' | 'chapter' | 'citation';
  data?: WritingProgressData; width?: number | string; height?: number;
  className?: string;
}

// DetectionHistoryTrend — Recharts LineChart
interface DetectionHistoryTrendProps {
  userId: string; data?: DetectionHistoryTrendData;
  days?: number; width?: number | string; height?: number; className?: string;
}

// WordConsumptionStack — Recharts AreaChart (stack mode)
interface WordConsumptionStackProps {
  userId: string; data?: WordConsumptionStackData;
  width?: number | string; height?: number; className?: string;
}

// FeatureUsageRadar — ECharts Radar 五维雷达
interface FeatureUsageRadarProps {
  userId: string; data?: FeatureUsageRadarData;
  width?: number | string; height?: number; className?: string;
}
```

---

## 3. 数据流设计

### 3.1 整体数据流架构

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│  页面组件  │───▶│ useChartData │───▶│   chartApi     │───▶│  后端API     │
│ (Page)    │    │   Hooks      │    │ (api.ts扩展)   │    │  (Fastify)  │
└──────────┘    └──────┬───────┘    └───────┬────────┘    └──────┬──────┘
                      │                    │                     │
                      ▼                    ▼                     ▼
               ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
               │ 数据转换/归一化│    │ axios请求+缓存  │    │ chartService│
               │ (transformer)│    │ stale-while-rev│    │ Prisma聚合  │
               └──────┬───────┘    └────────────────┘    └──────┬──────┘
                      │                                          │
                      ▼                                          ▼
               ┌──────────────┐                          ┌─────────────┐
               │ 图表Props数据  │◀─────────────────────────│ Redis缓存   │
               │ (typed TS)    │                          │ TTL=300s    │
               └──────────────┘                          └─────────────┘
```

### 3.2 useChartData Hooks 设计

每个图表对应一个专用Hook，统一基于 `useChartData<T>` 泛型基础Hook：

```typescript
// frontend/lib/hooks/useChartData.ts 核心骨架

interface UseChartDataOptions<T> {
  fetcher: () => Promise<T>;
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  transformer?: (raw: any) => T;
}

interface UseChartDataReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

function useChartData<T>(options: UseChartDataOptions<T>): UseChartDataReturn<T> {
  const { fetcher, initialData, enabled = true, staleTime = 300000, transformer } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!enabled) return;
    try {
      setIsLoading(true);
      const raw = await fetcher();
      setData(transformer ? transformer(raw) : raw);
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error(err.message));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, enabled, transformer]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, isLoading: isLoading && !data, isError, error, refetch: loadData };
}

// ========== 8个场景专用Hook导出 ==========

export function useRiskPieChartData(detectionId: string, opts?: { initialData?: RiskPieChartData })
  : UseChartDataReturn<RiskPieChartData>;

export function useParagraphHeatmapData(detectionId: string, params?, opts?)
  : UseChartDataReturn<ParagraphHeatmapData>;

export function useOptimizationTrendData(detectionId: string, opts?)
  : UseChartDataReturn<OptimizationTrendData>;

export function useVersionCompareData(detectionId: string, paragraphIndex: number, opts?)
  : UseChartDataReturn<VersionCompareData>;

export function useTypeDistributionData(userId: string, opts?)
  : UseChartDataReturn<TypeDistributionData>;

export function useMonthlyTrendData(userId: string, months?: number, opts?)
  : UseChartDataReturn<MonthlyTrendData>;

export function useFormatUsageData(userId: string, paperId?: string, opts?)
  : UseChartDataReturn<FormatUsageData>;

export function useCitationTop10Data(userId: string, limit?: number, opts?)
  : UseChartDataReturn<CitationTop10Data>;
```

### 3.3 数据转换器(transformer)设计模式

每个Hook的 `transformer` 函数负责将后端API响应转换为图表所需格式。关键设计：

**双模式输入支持：**
- **模式A（推荐）**: 后端已返回预聚合数据 → transformer直接透传或做微调
- **模式B（降级）**: 后端API尚未就绪 → transformer从原始检测/列表数据前端聚合

这使得前后端可以并行开发：前端先用已有API数据做聚合，后端API就绪后无缝切换。

```typescript
// 示例: useRiskPieChartData 的 transformer
transformer: (raw: any): RiskPieChartData => {
  if (raw.segments) return raw; // 模式A: 后端已预聚合

  // 模式B: 从前端已有detection数据聚合
  const paragraphs = raw.paragraphs || [];
  const riskCounts: Record<string, number> = {};
  let totalScore = 0;
  paragraphs.forEach((p: any) => {
    riskCounts[p.riskLevel] = (riskCounts[p.riskLevel] || 0) + 1;
    totalScore += p.score || 0;
  });

  const RISK_CONFIG = [
    { level: 'low', label: '低风险', color: '#22c55e' },
    { level: 'medium', label: '中风险', color: '#eab308' },
    { level: 'medium-high', label: '中高风险', color: '#f97316' },
    { level: 'high', label: '高风险', color: '#ef4444' },
  ];

  const total = paragraphs.length;
  return {
    totalParagraphs: total,
    overallScore: total > 0 ? Math.round(totalScore / total) : 0,
    segments: RISK_CONFIG.map(({ level, label, color }) => ({
      riskLevel: level as any, label,
      count: riskCounts[level] || 0,
      percentage: total > 0 ? Math.round((riskCounts[level] / total) * 1000) / 10 : 0,
      color,
    })),
  };
};
```

### 3.4 并行请求策略

统计页面需同时加载4个Library图表数据，使用 `Promise.all` 并发：

```typescript
export function useLibraryAllChartData(userId: string) {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      chartApi.library.getTypeDistribution(userId),
      chartApi.library.getMonthlyTrend(userId, 6),
      chartApi.library.getFormatUsage(userId),
      chartApi.library.getCitationTop10(userId, 10),
    ]).then(([typeDist, monthly, fmt, top10]) => {
      setData({ typeDist, monthly, fmt, top10 });
      setLoading(false);
    });
  }, [userId]);

  return { data, loading };
  // 总耗时 ≈ MAX(单次耗时) ≈ 300ms (而非 4×300ms=1200ms)
}
```

---

## 4. 后端API分析

### 4.1 核心结论

**MVP阶段需要在后端新增8个图表数据聚合API端点。**

决策理由矩阵：

| 因素 | 分析 | 结论 |
|------|------|------|
| **数据量** | 单次检测几十段，文献库几百~几千篇 | 数据量小，前后端均可处理 |
| **查询复杂度** | 月度趋势需GROUP BY DATE_TRUNC；TOP10需JOIN+ORDER+LIMIT | SQL聚合比JS更高效准确 |
| **一致性保证** | 多处使用同一指标（如typeDistribution），应保证一致 | 后端单点计算避免不一致 |
| **缓存收益** | 图表数据变化频率低（用户不会每秒新增文献） | Redis缓存TTL=5min收益高 |
| **安全性** | AIGC率等涉及用户隐私数据 | 后端JWT鉴权更可靠 |
| **开发效率分离** | 前端专注可视化，后端专注数据 | 职责清晰，并行开发 |

### 4.2 API端点清单与Zod Schema

所有新增端点遵循现有 `aigc.ts` / `library.ts` 的代码风格：
- Fastify路由 + Zod参数校验
- JWT认证中间件 (`fastify.authenticate`)
- 统一错误响应格式 `{ success: false, error: { code, message, details? } }`
- Redis缓存层（chartService内部封装）

**AIGC图表端点（扩展 aigc.ts）：**

| 端点 | 方法 | Zod Schema | 缓存Key | TTL |
|------|------|-----------|---------|-----|
| `/detections/:id/chart/risk-pie` | GET | `chartSchemas.riskPieQuery` | `chart:aigc:risk-pie:{id}` | 300s |
| `/detections/:id/chart/paragraph-heatmap` | GET | `chartSchemas.paragraphHeatmapQuery` | `chart:aigc:heatmap:{id}:{opts}` | 300s |
| `/detections/:id/chart/optimization-trend` | GET | `chartSchemas.optimizationTrendQuery` | `chart:aigc:trend:{id}` | 300s |
| `/detections/:id/chart/version-compare` | GET | `chartSchemas.versionCompareQuery` | `chart:aigc:compare:{id}:{pIdx}` | 300s |

**Library图表端点（扩展 library.ts 或新建 stats 子路由）：**

| 端点 | 方法 | Zod Schema | 缓存Key | TTL |
|------|------|-----------|---------|-----|
| `/library/stats/type-distribution` | GET | `libraryChartSchemas.typeDistQuery` | `chart:lib:type-dist:{uid}` | 300s |
| `/library/stats/monthly-trend` | GET | `libraryChartSchemas.monthlyTrendQuery` | `chart:lib:trend:{uid:{m}m` | 300s |
| `/library/stats/format-usage` | GET | `libraryChartSchemas.formatUsageQuery` | `chart:lib:fmt-use:{uid}` | 300s |
| `/library/stats/citation-top10` | GET | `libraryChartSchemas.citationTop10Query` | `chart:lib:top10:{uid}` | 300s |

### 4.3 chartService 业务逻辑骨架

```typescript
// backend/src/services/chartService.ts (~400行)

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

export const aigcChartService = {
  async getRiskPieData(detectionId: string) {
    const cacheKey = `chart:aigc:risk-pie:${detectionId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const detection = await prisma.aIGCDetection.findUnique({
      where: { id: detectionId }, select: { result: true, overallScore: true },
    });
    if (!detection) throw new Error('Detection not found');

    const paragraphs = ((detection.result as any)?.paragraphs) || [];
    const riskCounts: Record<string, number> = {};
    let totalScore = 0;
    paragraphs.forEach((p: any) => {
      riskCounts[p.riskLevel] = (riskCounts[p.riskLevel] || 0) + 1;
      totalScore += p.score || 0;
    });

    const RISK_MAP = [
      { level: 'low', label: '低风险', color: '#22c55e' },
      { level: 'medium', label: '中风险', color: '#eab308' },
      { level: 'medium-high', label: '中高风险', color: '#f97316' },
      { level: 'high', label: '高风险', color: '#ef4444' },
    ];

    const result = {
      totalParagraphs: paragraphs.length,
      overallScore: paragraphs.length > 0 ? Math.round(totalScore / paragraphs.length) : 0,
      segments: RISK_MAP.map(({ level, label, color }) => ({
        riskLevel: level, label, count: riskCounts[level] || 0,
        percentage: paragraphs.length > 0
          ? Math.round(((riskCounts[level] || 0) / paragraphs.length) * 1000) / 10 : 0,
        color,
      })),
    };

    await redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  },

  // getParagraphHeatmapData, getOptimizationTrendData, getVersionCompareData
  // ... 类似结构，每个方法约60-80行
};

export const libraryChartService = {
  async getTypeDistribution(userId: string) {
    const cacheKey = `chart:lib:type-dist:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const documents = await prisma.document.findMany({
      where: { userId }, select: { type: true },
    });

    const typeCounts: Record<string, number> = {};
    documents.forEach((doc) => { typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1; });

    const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
      JOURNAL_ARTICLE: { label: '期刊文章', icon: '📄', color: '#3b82f6' },
      THESIS: { label: '学位论文', icon: '🎓', color: '#8b5cf6' },
      BOOK: { label: '书籍', icon: '📚', color: '#f59e0b' },
      CONFERENCE_PAPER: { label: '会议论文', icon: '📢', color: '#10b981' },
      WEBPAGE: { label: '网页', icon: '🌐', color: '#6b7280' },
      PATENT: { label: '专利', icon: '💡', color: '#ec4899' },
    };

    const total = documents.length;
    const types = Object.entries(typeCounts).map(([type, count]) => ({
      type, ...TYPE_META[type], count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);

    const result = { totalDocuments: total, types };
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  },

  // getMonthlyTrend, getFormatUsage, getCitationTop10
  // ... getCitationTop10使用 $queryRaw 做 JOIN 聚合查询
};
```

### 4.4 存储模型影响评估

**不需要新建任何数据库表。** 所有图表数据均从现有表聚合：

| 数据源表 | 供图的表/字段 | 涉及图表 |
|----------|-------------|---------|
| `AIGCDetection.result` (JSONB) | `.paragraphs[].riskLevel/.score` | RiskPieChart, ParagraphHeatmap |
| `OptimizationRecord` | `.beforeAigcRate/.afterAigcRate/.operationType` | OptimizationTrendLine |
| `RewriteVersion` (JSONB嵌套) | `.estimatedScore/.confidence/.label` | VersionCompareBar |
| `Document` | `.type/.createdAt` | TypeDistributionPie, MonthlyTrendArea |
| `PaperCitation` | `.format` | FormatUsageBar |
| `PaperCitation` + `Document` (JOIN) | `.documentId → COUNT(*)` | CitationTop10Bar |

**建议新增索引（优化聚合查询性能）：**
```sql
-- 月度趋势加速
CREATE INDEX idx_document_user_created ON "Document"("userId", "createdAt");

-- TOP10引用加速
CREATE INDEX idx_papercitation_paperid ON "PaperCitation"("paperId");

-- 格式使用统计加速
CREATE INDEX idx_papercitation_format ON "PaperCitation"("paperId", "format");
```

---

## 5. 性能策略

### 5.1 性能分层防护体系

```
┌─────────────────────────────────────────────────────────────┐
│                    性能防护五层模型                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  L5: 浏览器渲染层  ── requestIdleCallback 错峰渲染              │
│                   ── will-change GPU加速                       │
│                                                              │
│  L4: React组件层  ── React.memo + shallowEqual 防重绘          │
│                   ── useMemo/useCallback 缓存计算              │
│                   ── Suspense + dynamic import 懒加载           │
│                                                              │
│  L3: 图表引擎层  ── Recharts: isAnimationActive 条件关闭        │
│                   ── 大数据量采样 maxDataPoints=100             │
│                   ── ECharts progressive (Phase 2)             │
│                                                              │
│  L2: 数据请求层  ── Promise.all 并发请求                       │
│                   ── 内存stale-while-revalidate 缓存           │
│                   ── 增量更新 (仅拉变化字段)                    │
│                                                              │
│  L1: 服务端层    ── Redis 缓存 TTL=5min                       │
│                   ── SQL复合索引优化                           │
│                   ── LIMIT硬编码防OOM                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 各层级具体措施

#### L1: 服务端层

| 措施 | 实现 | 影响 | 预期效果 |
|------|------|------|---------|
| Redis缓存 | 每个图表端点结果缓存，TTL=300s | 全部8个API | 缓存命中率≥70%，P50响应<50ms |
| 复合索引 | `(userId, createdAt)` 等3个新索引 | PostgreSQL | 聚合查询提速3-5倍 |
| LIMIT硬编码 | TOP10=10，趋势=24个月 | 全部聚合查询 | 防止大数据集OOM |
| 连接池复用 | Prisma连接池（已有配置） | 全局 | 避免频繁建连开销 |

#### L2: 数据请求层

- 并发请求：统计页4个图表用 `Promise.all` 同时拉取，总耗时 = MAX(单次)
- 内存缓存：`useChartData` Hook 内置 `staleTime=300000`(5min)，期间返回缓存数据
- 增量更新：`refetchInterval` 支持定时刷新，但只重绘变化的数据

#### L3: 图表引擎层

```typescript
// 大数据量采样策略（热力图>50条时启用）
function sampleData<T extends Record<string, any>>(
  data: T[], maxPoints: number = 100, field: string = 'index'
): T[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) =>
    data[Math.floor(i * step)]
  );
}

// 低端设备动画降级
function useAnimationEnabled(): boolean {
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    const hwConcurrency = navigator.hardwareConcurrency || 4;
    setIsLowEnd(hwConcurrency <= 2 || prefersReduced);
  }, []);

  return !isLowEnd;
}
```

#### L4: React组件层

```typescript
// Memo包装器 - 仅比较data和关键prop
export function memoChart<P extends object>(
  Component: React.ComponentType<P>
) {
  return React.memo(Component, (prev, next) => {
    if (prev.data !== next.data) return false;
    if (prev.className !== next.className) return false;
    if (prev.width !== next.width) return false;
    if (prev.height !== next.height) return false;
    return true;
  });
}

// Intersection Observer懒加载离屏图表
function useLazyChart(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
```

#### L5: 浏览器渲染层

- Staggered Animation: 多图表依次入场，间隔150ms（`theme.animation.staggerDelay`）
- `requestIdleCallback`: 在浏览器空闲时渲染非首屏图表
- CSS `will-change: transform` 对频繁hover的图表元素启用GPU加速

### 5.3 性能预算

| 指标 | 目标值 | 监控方式 |
|------|--------|---------|
| 单图表首次渲染 | ≤800ms | `Performance.mark` + `measure` |
| 4图表并发渲染 | ≤2000ms | 同上 |
| hover→Tooltip延迟 | ≤50ms | Event Timing API |
| 内存占用(4图表) | ≤50MB | `performance.memory` |
| PNG导出时间 | ≤1500ms | 计时器包裹 |
| 打包增量(recharts) | ≤150KB gzip | webpack-bundle-analyzer |
| 首屏LCP(含图表) | <2.5s | Lighthouse CI |

---

## 6. 响应式设计

### 6.1 断点系统

```typescript
const BREAKPOINTS = {
  mobile:     { max: 767,  label: 'Mobile' },
  tablet:    { min: 768,  max: 1023, label: 'Tablet' },
  desktop:   { min: 1024, max: 1279, label: 'Desktop' },
  desktopXL: { min: 1280, label: 'Desktop XL' },
} as const;
```

### 6.2 各断点布局策略

| 断点 | 宽度 | ChartGrid列数 | 图表调整 |
|------|------|-------------|---------|
| Desktop XL | ≥1280px | 2列 (grid-template-columns: 1fr 1fr) | 图表原始尺寸，gap=16px |
| Desktop | 1024-1279px | 2列（略压缩） | 图表宽度自适应，字体不变 |
| Tablet | 768-1023px | 1列全宽 | 饼图直径缩小至220px，柱状图高度压缩15% |
| Mobile L | 480-767px | 1列全宽 | X轴标签间隔显示/旋转45°，Legend改为底部横向 |
| Mobile | <480px | 1列全宽 | 图表最小宽度保障280px，允许Y轴标题截断至12字符 |

### 6.3 ChartGrid 响应式容器实现

```tsx
// frontend/components/charts/ChartGrid.tsx (~60行)

interface ChartGridProps {
  children: React.ReactNode;
  cols?: number | { default: number; tablet: number; mobile: number };
  gap?: number;
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  children,
  cols = { default: 2, tablet: 1, mobile: 1 },
  gap = 16,
}) => {
  const bp = useBreakpoint();

  const gridCols = typeof cols === 'number'
    ? cols
    : bp === 'mobile' || bp === 'tablet'
      ? (cols.mobile ?? 1)
      : bp === 'desktop'
        ? (cols.tablet ?? 1)
        : cols.default;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};
```

### 6.4 移动端特殊适配规则

| 适配项 | Desktop | Mobile | 实现方式 |
|--------|---------|--------|---------|
| Tooltip触发 | hover | click | Recharts `trigger='click'` 移动端覆盖 |
| Tooltip位置 | 跟随鼠标 | 固定顶部 | CustomTooltip 内部检测 `window.innerWidth < 768` |
| Legend排列 | 水平底部 | 垂直右侧或折叠按钮 | Legend `layout='vertical'` + `wrapperStyle.width=120` |
| X轴标签 | 全部显示 | 间隔显示 | `interval={bp === 'mobile' ? 1 : 0}` |
| 字体大小 | axis=12, label=13 | axis=10, label=11 | 通过 `useBreakpoint()` 动态传入 |
| 图表间距 | gap=16px | gap=8px | ChartGrid gap prop |
| 最小高度 | 200-380px | 180-300px | 各组件height prop 默认值根据bp调整 |
| 手势操作 | hover即可 | 需要点击目标放大 | 可选：点击弹出Modal查看大图 |

---

## 7. 导出功能

### 7.1 技术选型：html-to-image

**选择 html-to-image (^1.x) 的理由：**

| 方案 | 优点 | 缺点 | 适用性 |
|------|------|------|--------|
| **html-to-image** ✅ | 轻量(~20KB gzip)、纯客户端、支持Retina/DPI | 跨浏览器像素偏差 | **MVP首选** |
| dom-to-image | 更老更稳定、社区成熟 | 已停止维护、体积较大 | 备选 |
| ECharts原生getDataURL | 像素完美、服务端可复现 | 仅ECharts适用，Recharts不支持 | Phase 2补充 |
| Puppeteer服务端渲染 | 100%一致、无浏览器差异 | 需额外服务/基础设施 | 远期方案 |

### 7.2 导出实现

```typescript
// frontend/components/charts/ChartExport.tsx (~80行)

import { toPng, toSvg } from 'html-to-image';

interface ChartExportOptions {
  /** 要导出的DOM节点ref */
  nodeRef: React.RefObject<HTMLDivElement>;
  /** 导出文件名前缀 */
  filename: string;
  /** DPI倍率，默认2（Retina屏友好） */
  pixelRatio?: number;
  /** 是否包含背景色 */
  backgroundColor?: string;
  /** 是否添加水印 */
  watermark?: string;
  /** 导出完成回调 */
  onComplete?: (dataUrl: string) => void;
  /** 导出失败回调 */
  onError?: (error: Error) => void;
}

export async function exportChartAsPNG(options: ChartExportOptions): Promise<void> {
  const {
    nodeRef, filename = 'chart',
    pixelRatio = 2,
    backgroundColor = '#ffffff',
    watermark,
    onComplete,
    onError,
  } = options;

  if (!nodeRef.current) {
    onError?.(new Error('Chart DOM node not found'));
    return;
  }

  try {
    const dataUrl = await toPng(nodeRef.current, {
      cacheBust: true,
      pixelRatio,
      backgroundColor,
      style: {
        transform: 'scale(1)',  // 重置可能的CSS transform
        transformOrigin: 'top left',
      },
    });

    // 可选：添加水印
    const finalUrl = watermark
      ? await addWatermark(dataUrl, watermark)
      : dataUrl;

    // 触发下载
    const link = document.createElement('a');
    link.download = `${filename}_${formatDate(new Date())}.png`;
    link.href = finalUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onComplete?.(finalUrl);
  } catch (err: any) {
    console.error('Chart export failed:', err);
    onError?.(err instanceof Error ? err : new Error(err.message));
  }
}

async function addWatermark(base64Image: string, text: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.textAlign = 'right';
      ctx.fillText(text, img.width - 16, img.height - 16);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64Image;
  });
}
```

### 7.3 ChartCard 导出按钮集成

```tsx
// ChartCard 组件内置导出入口

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showExport?: boolean;
  exportFilename?: string;
  fullWidth?: boolean;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title, description, children, actions,
  showExport = true, exportFilename, fullWidth, className,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportChartAsPNG({
        nodeRef: chartRef,
        filename: exportFilename || title,
        onComplete: () => toast.success('图表已导出'),
        onError: (e) => toast.error(`导出失败: ${e.message}`),
      });
    } finally {
      setExporting(false);
    }
  }, [title, exportFilename]);

  return (
    <div className={`rounded-lg border bg-card p-4 ${fullWidth ? 'col-span-full' : ''} ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {showExport && (
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
              📥 {exporting ? '导出中...' : 'PNG'}
            </Button>
          )}
        </div>
      </div>
      <div ref={chartRef}>{children}</div>
    </div>
  );
};
```

---

## 8. 主题系统

### 8.1 配色方案（Light Mode）

```typescript
const defaultTheme: ChartTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',

    risk: {
      low: '#22c55e',
      medium: '#eab308',
      mediumHigh: '#f97316',
      high: '#ef4444',
    },

    documentType: {
      JOURNAL_ARTICLE: '#3b82f6',
      THESIS: '#8b5cf6',
      BOOK: '#f59e0b',
      CONFERENCE_PAPER: '#10b981',
      WEBPAGE: '#6b7280',
      PATENT: '#ec4899',
    },

    citationFormat: {
      GBT7714: '#ef4444',
      APA7: '#3b82f6',
      MLA9: '#22c55e',
    },

    background: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    gridLine: '#e2e8f0',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
  },

  gradient: {
    areaStart: '#3b82f6',
    areaEnd: 'transparent',
    areaOpacity: 0.1,
  },

  font: {
    family: '"Inter", system-ui, -apple-system, sans-serif',
    sizeAxis: 12,
    sizeLabel: 13,
    sizeTitle: 16,
    sizeTooltip: 12,
    sizeLegend: 12,
    weightNormal: 400,
    weightBold: 600,
  },

  animation: {
    duration: 600,
    easing: 'ease-out',
    staggerDelay: 150,
    isActive: true,
  },

  responsive: {
    breakpoints: { mobile: 768, tablet: 1024, desktop: 1280 },
    minChartWidth: 280,
    minChartHeight: 200,
  },

  export: {
    dpi: 2,
    format: 'png',
    quality: 0.95,
    backgroundColor: '#ffffff',
    includeWatermark: false,
  },

  borderRadius: 8,
  spacing: 16,
};
```

### 8.2 Dark Mode 适配

Dark Mode 在 MVP 阶段作为**基础支持**（Phase 2 完善完整暗色主题），通过 CSS 变量切换实现：

```typescript
function applyDarkMode(theme: ChartTheme): ChartTheme {
  return {
    ...theme,
    colors: {
      ...theme.colors,
      background: '#0f172a',
      surface: '#1e293b',
      border: '#334155',
      gridLine: '#334155',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
    },
    gradient: {
      ...theme.gradient,
      areaStart: '#3b82f6',
      areaOpacity: 0.15,
    },
  };
}
```

Dark Mode 下需要特别处理的Recharts属性：
- `CartesianGrid.stroke` → `'#334155'`（深色网格线）
- `Tooltip.contentStyle` → `{ background: '#1e293b', border: '#334155', color: '#f1f5f9' }`
- `XAxis/YAxis.tick.fill` → `'#94a3b8'`
- `ReferenceLine.stroke` → 保持语义色不变（红=危险始终为红色）

### 8.3 色盲友好策略

MVP阶段采用**颜色+文字/图案双重编码**原则：

| 策略 | 实施方式 | Phase |
|------|---------|-------|
| **文字标签始终存在** | 所有Legend项带文字标签，Tooltip含数值和文字描述 | P0 |
| **高对比度色对** | 风险四色选用蓝/橙/绿/红组合（非红绿配对） | P0 |
| **形状辅助编码** | 饼图扇区旁标注emoji图标(✅/⚠️/🔴)；柱状图用排名徽章区分 | P0 |
| **SVG Pattern纹理** (Phase 2) | 不同风险等级填充不同纹理(实色/斜线/交叉线/密网格) | P1 |
| **WCAG AA对比度校验** | 所有文字与背景对比度≥4.5:1 | P0 |

### 8.4 CSS变量注入机制

ChartProvider 通过注入全局 `<style>` 标签设置CSS自定义属性，子组件可通过 `var(--chart-xxx)` 引用：

```css
:root {
  --chart-primary: #3b82f6;
  --chart-secondary: #8b5cf6;
  --chart-risk-low: #22c55e;
  --chart-risk-medium: #eab308;
  --chart-risk-medium-high: #f97316;
  --chart-risk-high: #ef4444;
  --chart-bg: #ffffff;
  --chart-surface: #f8fafc;
  --chart-border: #e2e8f0;
  --chart-text: #1e293b;
  --chart-font-family: "Inter", system-ui, sans-serif;
  --chart-radius: 8px;
}
```

---

## 9. 测试策略

### 9.1 测试金字塔

```
                    ┌──────────────┐
                    │   E2E 测试    │  ~5个场景
                    │  (Playwright) │  核心用户路径
                   ╱╲              │
                  ╱  ╲─────────────┤
                 ╱    │  快照测试     │  ~14个组件
                ╱      │ (Jest+RTL)  │  视觉回归
               ╱───────┼─────────────┤
              │        │  组件测试     │  ~30个测试用例
              │        │ (Jest+RTL)  │  交互+行为
              │────────┴─────────────┤
              │         │  单元测试     │  ~20个测试用例
              │         │ (Jest)       │  Hook/工具函数
              └────────────────────────┘
```

### 9.2 组件测试规范（Jest + React Testing Library）

每个图表组件至少包含以下测试用例：

**以 RiskPieChart 为例（~10个测试用例）：**

```typescript
// __tests__/components/charts/RiskPieChart.test.tsx

describe('RiskPieChart', () => {
  const mockData: RiskPieChartData = {
    totalParagraphs: 12,
    overallScore: 65,
    segments: [
      { riskLevel: 'low', label: '低风险', count: 3, percentage: 25.0, color: '#22c55e' },
      { riskLevel: 'medium', label: '中风险', count: 4, percentage: 33.3, color: '#eab308' },
      { riskLevel: 'medium-high', label: '中高风险', count: 3, percentage: 25.0, color: '#f97316' },
      { riskLevel: 'high', label: '高风险', count: 2, percentage: 16.7, color: '#ef4444' },
    ],
  };

  it('正确渲染4个扇区', () => {
    render(<RiskPieChart detectionId="test-id" data={mockData} />);
    expect(screen.getAllByRole('img')[0]).toBeInTheDocument();
    expect(document.querySelectorAll('.recharts-pie-sector')).toHaveLength(4);
  });

  it('中心区域显示总体AIGC率', () => {
    render(<RiskPieChart detectionId="test-id" data={mockData} />);
    expect(screen.getByText(/65/)).toBeInTheDocument();
  });

  it('hover扇区触发tooltip', async () => {
    render(<RiskPieChart detectionId="test-id" data={mockData} />);
    const sectors = document.querySelectorAll('.recharts-pie-sector');
    fireEvent.mouseEnter(sectors[0]);
    expect(await screen.findByText('低风险')).toBeInTheDocument();
  });

  it('点击扇区触发onSegmentClick回调', () => {
    const handleClick = jest.fn();
    render(<RiskPieChart detectionId="test-id" data={mockData} onSegmentClick={handleClick} />);
    const sectors = document.querySelectorAll('.recharts-pie-sector');
    fireEvent.click(sectors[0]);
    expect(handleClick).toHaveBeenCalledWith('low');
  });

  it('空数据显示EmptyState', () => {
    render(<RiskPieChart detectionId="test-id" data={{ totalParagraphs: 0, overallScore: 0, segments: [] }} />);
    expect(screen.getByText(/暂无数据/)).toBeInTheDocument();
  });

  it('全低风险显示安全标识', () => {
    const safeData = { ...mockData, segments: [{ riskLevel: 'low' as any, label: '低风险', count: 12, percentage: 100, color: '#22c55e' }], overallScore: 12 };
    render(<RiskPieChart detectionId="test-id" data={safeData} />);
    expect(screen.getByText(/安全/)).toBeInTheDocument();
  });

  it('variant=mini隐藏Legend', () => {
    render(<RiskPieChart detectionId="test-id" data={mockData} variant="mini" />);
    expect(document.querySelector('.recharts-legend-wrapper')).toBeNull();
  });

  it('具有正确的ARIA标签', () => {
    render(<RiskPieChart detectionId="test-id" data={mockData} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label');
  });

  it('React.memo防止不必要的重绘', () => {
    const { rerender } = render(<RiskPieChart detectionId="test-id" data={mockData} className="first" />);
    const firstRender = screen.getByRole('img');
    rerender(<RiskPieChart detectionId="test-id" data={mockData} className="second" />);
    expect(firstRender).toBe(screen.getByRole('img'));
  });
});
```

### 9.3 快照测试

```typescript
// __tests__/components/charts/__snapets__/ 各图表.snap

// 匹配规则: 忽略动态生成的class名，关注结构一致性
const snapshotSerializer = {
  test(val) { return val && val.props?.className?.includes('recharts-'); },
  serialize() { return '[RechartsElement]'; },
};

expect.addSnapshotSerializer(snapshotSerializer);

it('RiskPieChart visual snapshot matches', () => {
  const { container } = render(
    <ChartProvider><RiskPieChart detectionId="test" data={mockData} /></ChartProvider>
  );
  expect(container).toMatchSnapshot();
});
```

### 9.4 Hook单元测试

```typescript
// __tests__/lib/hooks/useChartData.test.ts

describe('useChartData', () => {
  it('初始状态loading=true且data=undefined', () => {
    const { result } = renderHook(() =>
      useChartData<RiskPieChartData>({
        fetcher: () => new Promise(() => {}), // never resolves
        enabled: true,
      })
    );
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('有initialData时跳过加载态', () => {
    const initialData = { totalParagraphs: 0, overallScore: 0, segments: [] };
    const { result } = renderHook(() =>
      useChartData({ fetcher: jest.fn(), initialData })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(initialData);
  });

  it('enabled=false时不发起请求', () => {
    const fetcher = jest.fn();
    renderHook(() => useChartData({ fetcher, enabled: false }));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('transformer正确转换原始数据', async () => {
    const rawData = { paragraphs: [
      { index: 0, score: 10, riskLevel: 'low' },
      { index: 1, score: 80, riskLevel: 'high' },
    ]};
    const { result, waitForNextUpdate } = renderHook(() =>
      useChartData({
        fetcher: () => Promise.resolve(rawData),
        transformer: (raw) => ({
          totalParagraphs: raw.paragraphs.length,
          overallScore: 45,
          segments: [],
        }),
      })
    );
    await waitForNextUpdate();
    expect(result.current.data?.totalParagraphs).toBe(2);
    expect(result.current.data?.overallScore).toBe(45);
  });
});
```

### 9.5 E2E测试（Playwright）

```typescript
// __tests__/e2e/library-stats.spec.ts

test.describe('知识库统计页', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并准备测试数据
    await page.goto('/login');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');
    await page.waitForURL('/dashboard');
  });

  test('统计页正确渲染4张图表', async ({ page }) => {
    await page.goto('/library/stats');

    await expect(page.locator('[role=img]')).toHaveCount(4);

    // 验证图表标题
    await expect(page.getByText('文献类型分布')).toBeVisible();
    await expect(page.getByText('月度新增趋势')).toBeVisible();
    await expect(page.getByText('引用格式使用')).toBeVisible();
    await expect(page.getByText('TOP10被引文献')).toBeVisible();
  });

  test('PNG导出功能正常工作', async ({ page }) => {
    await page.goto('/library/stats');

    // 点击第一张图表的导出按钮
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("PNG")').first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/);
    expect(download.suggestedFilename()).toContain('文献类型分布');
  });

  test('移动端响应式布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/library/stats');

    // 验证单列布局
    const grid = page.locator('.chart-grid');
    const gridStyle = await grid.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    expect(gridStyle).toBe('1fr');
  });
});

test.describe('AIGC检测结果页图表集成', () => {
  test('检测结果页嵌入RiskPieChart和ParagraphHeatmap', async ({ page }) => {
    // 先创建一次检测记录
    await page.goto('/aigc/detect');
    await page.fill('textarea', '这是测试内容用于AIGC检测...');
    await page.click('button:has-text("开始检测")');
    await page.waitForURL(/\/aigc\/result\//);

    // 验证图表渲染
    await expect(page.getByText('风险等级分布')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('段落风险热力图')).toBeVisible({ timeout: 5000 });
  });
});
```

### 9.6 测试覆盖率目标

| 层级 | 目标覆盖率 | 工具 |
|------|-----------|------|
| 图表组件（交互逻辑） | ≥80% | Jest + RTL |
| Hook（数据获取/转换） | ≥90% | Jest |
| 工具函数（颜色映射/采样等） | ≥95% | Jest |
| E2E核心路径 | 5个关键场景 | Playwright |
| 视觉快照 | 14个组件各1个 | Jest + PrettyFormat |
| 性能基准 | 3个指标 | Lighthouse CI |

---

## 10. 实施计划

### 10.1 Phase 1 任务分解（MVP，P0）

| 阶段 | 任务ID | 任务名称 | 负责人 | 文件 | 预估行数 | 依赖 | 天数 |
|------|--------|---------|--------|------|---------|------|-----|
| **P1-基础架构** | | | | | | |
| 1.1 | 类型定义 | 前后端图表TS类型/Zod Schema | Architect | `frontend/types/chart.ts`, `backend/src/types/chart.ts` | 380 | 无 | 0.5 |
| 1.2 | ChartProvider | 主题Provider + Context + CSS变量 | Frontend | `frontend/components/charts/ChartProvider.tsx` | 120 | 1.1 | 0.5 |
| 1.3 | 基础设施组件 | ChartCard/ChartGrid/EmptyState/Skeleton/CustomTooltip | Frontend | 5个文件 × ~70行 | 350 | 1.2 | 1.0 |
| 1.4 | useChartData Hooks | 8个数据Hook + 通用base Hook | Frontend | `frontend/lib/hooks/useChartData.ts` | 350 | 1.1 | 1.0 |
| 1.5 | chartApi扩展 | 前端API调用层 | Frontend | `frontend/lib/api.ts` 扩展 | 100 | 1.1 | 0.5 |
| **P1-后端API** | | | | | | |
| 2.1 | chartService | 图表数据聚合服务 | Backend | `backend/src/services/chartService.ts` | 400 | 1.1 | 1.5 |
| 2.2 | AIGC图表路由 | 4个AIGC图表端点 | Backend | `backend/src/routes/aigc.ts` 扩展 | 200 | 2.1 | 1.0 |
| 2.3 | Library图表路由 | 4个Library图表端点 | Backend | `backend/src/routes/library.ts` 扩展 | 200 | 2.1 | 1.0 |
| **P1-AIGC图表** | | | | | | |
| 3.1 | RiskPieChart | 风险等级分布饼图 | Frontend | `frontend/components/charts/RiskPieChart.tsx` | 180 | 1.2-1.5 | 1.0 |
| 3.2 | ParagraphHeatmapChart | 段落风险热力图 | Frontend | `frontend/components/charts/ParagraphHeatmapChart.tsx` | 250 | 1.2-1.5 | 1.5 |
| 3.3 | OptimizationTrendLine | 优化趋势折线图 | Frontend | `frontend/components/charts/OptimizationTrendLine.tsx` | 220 | 1.2-1.5 | 1.0 |
| 3.4 | VersionCompareBar | 版本对比柱状图 | Frontend | `frontend/components/charts/VersionCompareBar.tsx` | 200 | 1.2-1.5 | 1.0 |
| 3.5 | AIGC页面集成 | 嵌入到/aigc/result/[id]/page.tsx | Frontend | `frontend/app/aigc/result/[id]/page.tsx` 扩展 | ~80行改动 | 3.1-3.4 | 0.5 |
| **P1-Library图表** | | | | | | |
| 4.1 | TypeDistributionPie | 文献类型分布饼图 | Frontend | `frontend/components/charts/TypeDistributionPie.tsx` | 170 | 1.2-1.5 | 0.8 |
| 4.2 | MonthlyTrendArea | 月度趋势面积图 | Frontend | `frontend/components/charts/MonthlyTrendArea.tsx` | 190 | 1.2-1.5 | 1.0 |
| 4.3 | FormatUsageBar | 格式使用柱状图 | Frontend | `frontend/components/charts/FormatUsageBar.tsx` | 160 | 1.2-1.5 | 0.8 |
| 4.4 | CitationTop10Bar | TOP10排行榜 | Frontend | `frontend/components/charts/CitationTop10Bar.tsx` | 200 | 1.2-1.5 | 1.0 |
| 4.5 | Library统计页 | 新建/library/stats/page.tsx | Frontend | `frontend/app/library/stats/page.tsx` | 150 | 4.1-4.4 | 0.5 |
| 4.6 | Library主页嵌入 | 迷你饼图嵌入/library页面 | Frontend | `frontend/app/library/page.tsx` 扩展 | ~40行改动 | 4.1 | 0.3 |
| **P1-收尾** | | | | | | |
| 5.1 | PNG导出功能 | html-to-image集成 | Frontend | `frontend/components/charts/ChartExport.tsx` | 80 | 1.3 | 0.5 |
| 5.2 | 响应式适配 | 断点测试+移动端修复 | Frontend | 各图表组件微调 | ~100行分散 | 3.x, 4.x | 1.0 |
| 5.3 | 动效调优 | 入场动画/过渡/交互反馈 | Frontend | ChartProvider + 各组件 | ~80行分散 | 1.2 | 0.5 |
| 5.4 | 测试编写 | 组件/Hook/E2E测试 | Test | 测试文件 | ~800行 | 全部 | 2.0 |
| 5.5 | Bug修复+验收 | 集成测试+问题修复 | All | 分散 | 不确定 | 5.1-5.4 | 1.5 |
| **Phase 1 合计** | | | | | **~5,330行新增代码** | | **15天** |

### 10.2 Phase 2 任务规划（P1）

| 阶段 | 任务 | 内容 | 预估行数 | 天数 |
|------|------|------|---------|-----|
| **ECharts引入** | 2.1 | echarts ^5.x + echarts-for-react ^3.x 安装与按需引入配置 | 50 | 0.5 |
| **论文分析图表** | 2.2 | CitationNetworkGraph（力导向网络图） | 280 | 2.0 |
| | 2.3 | KeywordCooccurrence（关键词共现热力图） | 220 | 1.5 |
| | 2.4 | WritingProgressGauge（写作进度仪表盘） | 180 | 1.0 |
| **用户仪表盘** | 2.5 | DetectionHistoryTrend（历史检测趋势） | 180 | 1.0 |
| | 2.6 | WordConsumptionStack（字数消耗堆叠图） | 190 | 1.0 |
| | 2.7 | FeatureUsageRadar（功能使用雷达图） | 170 | 1.0 |
| **增强功能** | 2.8 | Dark Mode 完整暗色主题 | 150 | 1.0 |
| | 2.9 | SVG Pattern 色盲纹理编码 | 100 | 0.5 |
| | 2.10 | 虚拟滚动（react-window）热力图优化 | 80 | 0.5 |
| | 2.11 | ECharts原生getDataURL SVG/PDF导出 | 60 | 0.5 |
| | 2.12 | Dashboard 页面 (/dashboard) 新建 | 200 | 1.0 |
| | 2.13 | Phase 2 测试 | 400 | 1.5 |
| **Phase 2 合计** | | | **~2,510行** | **14天** |

### 10.3 关键里程碑

```
Day 1-2:   ████████████ 基础架构 (类型定义+Provider+基础设施)
           ↓
Day 3-5:   ██████████████████ 后端API (chartService+8个端点)
           ↓  (并行 Day 3-4: 前端Hooks+API层)
Day 6-9:   ████████████████████████████ AIGC 4图表 + 页面集成
           ↓
Day 10-13: ██████████████████████████████ Library 4图表 + 统计页
           ↓
Day 14-15: ██████████ 导出+响应式+动效+测试
           ↓
         ★★★ MVP交付 ★★★
           ↓ (2周后)
Day 16-29: ██████████████████████████████████████████████████ Phase 2
```

### 10.4 依赖关系图

```
1.1 类型定义 ──────┬──▶ 1.2 ChartProvider ──▶ 1.3 基础设施组件
                  ├──▶ 1.4 useChartData ───▶ 1.5 chartApi
                  ├──▶ 2.1 chartService ──┬──▶ 2.2 AIGC路由 ──┬──▶ 3.1-3.4 AIGC图表
                  │                     │                 └──▶ 3.5 AIGC页面集成
                  │                     │
                  │                     └──▶ 2.3 Library路由 ─┬──▶ 4.1-4.4 Library图表
                  │                                         ├──▶ 4.5 统计页
                  │                                         └──▶ 4.6 主页嵌入
                  │
                  └──▶ 5.1 导出功能 ◀── 1.3 ChartCard
```

### 10.5 风险与缓解

| 编号 | 风险 | 可能性 | 影响 | 缓解措施 | 应急方案 |
|------|------|--------|------|---------|---------|
| R01 | Recharts SSR兼容问题（window对象） | 中 | 高 | `next/dynamic` + `ssr:false` | 降级为静态占位图 |
| R02 | ResponsiveContainer 高度塌陷 | 中 | 中 | 显式 min-height + fallback 固定高度 | 固定 300px |
| R03 | html-to-image 跨浏览器像素偏差 | 中 | 低 | 提供浏览器检测 + 降级提示 | 改用 ECharts getDataURL |
| R04 | 图表配色色盲辨识困难 | 中 | 中 | 文字+颜色+形状三重编码 | 用户可切换预设配色方案 |
| R05 | 并发8个API导致后端压力峰值 | 低 | 中 | Promise.all + Redis缓存兜底 | 串行请求（增加500ms但稳定） |
| R06 | AIGC检测result JSONB解析性能 | 低 | 低 | 结果写入时同步预聚合到冗余字段 | 缓存TTL延长至10min |

---

## 附录

### A. 文件索引

| 文件路径 | 类型 | 行数 | Phase | 说明 |
|---------|------|------|------|------|
| `docs/TECH_SPEC-图表生成-MVP.md` | 技术规格 | ~2500 | P0 | 本文档 |
| `docs/PRD-图表生成-MVP.md` | 产品需求 | ~2170 | P0 | 输入文档 |
| `frontend/types/chart.ts` | 类型定义 | ~180 | P0 | 前端图表类型 |
| `backend/src/types/chart.ts` | 类型定义 | ~200 | P0 | 后端Schema+类型 |
| `frontend/lib/hooks/useChartData.ts` | Hook | ~350 | P0 | 8个数据Hook |
| `frontend/lib/api.ts` | API层(扩展) | ~100 | P0 | chartApi方法 |
| `frontend/components/charts/ChartProvider.tsx` | Provider | ~120 | P0 | 主题Context |
| `frontend/components/charts/ChartCard.tsx` | 容器组件 | ~80 | P0 | 卡片外壳 |
| `frontend/components/charts/ChartGrid.tsx` | 布局组件 | ~60 | P0 | 响应式网格 |
| `frontend/components/charts/CustomTooltip.tsx` | UI组件 | ~100 | P0 | 统一Tooltip |
| `frontend/components/charts/EmptyState.tsx` | UI组件 | ~50 | P0 | 空状态 |
| `frontend/components/charts/ChartSkeleton.tsx` | UI组件 | ~70 | P0 | 骨架屏 |
| `frontend/components/charts/RiskPieChart.tsx` | 图表组件 | ~180 | P0 | 风险饼图 |
| `frontend/components/charts/ParagraphHeatmapChart.tsx` | 图表组件 | ~250 | P0 | 段落热力图 |
| `frontend/components/charts/OptimizationTrendLine.tsx` | 图表组件 | ~220 | P0 | 优化趋势 |
| `frontend/components/charts/VersionCompareBar.tsx` | 图表组件 | ~200 | P0 | 版本对比 |
| `frontend/components/charts/TypeDistributionPie.tsx` | 图表组件 | ~170 | P0 | 类型分布 |
| `frontend/components/charts/MonthlyTrendArea.tsx` | 图表组件 | ~190 | P0 | 月度趋势 |
| `frontend/components/charts/FormatUsageBar.tsx` | 图表组件 | ~160 | P0 | 格式使用 |
| `frontend/components/charts/CitationTop10Bar.tsx` | 图表组件 | ~200 | P0 | TOP10排行 |
| `frontend/components/charts/ChartExport.tsx` | 工具函数 | ~80 | P0 | PNG导出 |
| `backend/src/services/chartService.ts` | 服务层 | ~400 | P0 | 数据聚合 |
| `backend/src/routes/aigc.ts` | 路由(扩展) | +200 | P0 | 4个AIGC端点 |
| `backend/src/routes/library.ts` | 路由(扩展) | +200 | P0 | 4个Library端点 |
| `frontend/app/library/stats/page.tsx` | 页面 | ~150 | P0 | 统计页 |
| `frontend/app/aigc/result/[id]/page.tsx` | 页面(扩展) | +80 | P0 | AIGC结果页嵌入 |
| **Phase 1 总计** | | **~5,330行新增** | | |
| **Phase 2 额外** | | **~2,510行新增** | | |

### B. NPM依赖

```json
{
  "dependencies": {
    "recharts": "^2.15.0",
    "html-to-image": "^1.11.11"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jest-environment-jsdom": "^29.7.0",
    "@playwright/test": "^1.45.0"
  },
  "Phase 2 dependencies": {
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.2"
  }
}
```

### C. 与现有代码的关系

| 本功能复用的现有模块 | 来源文件 | 复用方式 |
|-------------------|---------|---------|
| JWT认证中间件 | `aigc.ts:L47-51` | `fastify.authenticate` 直接引用 |
| Zod错误处理模式 | `aigc.ts:L54-73` | 相同的try-catch+zod结构 |
| AES加密/解密 | `papers.ts:L62-84` | 如需加密导出则复用 |
| Redis实例 | `aigc.ts:L54` | 同一Redis连接 |
| apiClient拦截器 | `api.ts:L13-37` | chartApi复用同一axios实例 |
| authStore token | `api.ts:L14` | 同一认证状态管理 |
| Card/Button/Badge UI | `components/ui/*.tsx` | ChartCard内部使用shadcn/ui组件 |
| AIGC检测数据结构 | `api.ts:L182-294` | 作为图表数据源 |
| Library数据结构 | `api.ts:L296-388` | 作为图表数据源 |

---

*ArchitectAgent 技术规格输出完成*

**下一步行动：**
1. 请技术负责人审阅本规格并提出修改意见
2. 批准后移交FrontendAgent开始ChartProvider + 基础设施搭建
3. 同步移交BackendAgent开始chartService + 8个聚合API开发
4. 预计MVP交付周期：15个工作日（约3周），总代码量约5,330行新增

---
