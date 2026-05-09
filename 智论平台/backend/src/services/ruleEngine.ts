/**
 * AIGC检测规则引擎 — 纯算法函数库（无副作用）
 * 基于技术规格文档 TECH_SPEC-AIGC检测-MVP.md 第2-3章
 *
 * 模块清单：
 * 1. tokenizeChinese()        — 中文分词器（字符级bigram，MVP版）
 * 2. calculateTTR()           — TTR计算（困惑度代理指标）
 * 3. calculateSentenceVariance() — 句长方差分析（Burstiness代理）
 * 4. detectAIVocabulary()     — AI高频词汇检测（200词完整表）
 * 5. detectTransitionPatterns() — 过渡词模式匹配（10个正则）
 * 6. detectPassiveVoice()     — 被动语态统计（8个正则模式）
 * 7. runRuleEngine()          — 综合评分入口
 * 8. generateAIGCDetectPrompt()   — LLM检测Prompt模板
 * 9. generateAIGCRewritePrompt()  — 对抗性改写Prompt模板
 * 10. evaluateAIGCRewriteQuality() — 改写质量评估
 */

import {
  TTRResult,
  SentenceVarianceResult,
  VocabularyDetectionResult,
  TransitionPatternResult,
  PassiveVoiceResult,
  RuleEngineResult,
  DetectParagraph,
  LLMDetectResult,
  RewriteVersionType,
  AIGCRewriteOptions,
  DiffSegment,
  DiffSegmentType,
  RewriteQualityCheck,
  AIGCRewriteQualityResult,
  RuleRiskLevel,
} from '../types/aigc';

import { calculateSimilarity } from '../utils/textProcessing';

// ==================== 常量定义 ====================

/** 规则引擎各子指标权重配置 */
const RULE_WEIGHTS = {
  ttr: 0.22,
  sentenceVariance: 0.20,
  vocabulary: 0.22,
  transitions: 0.18,
  passiveVoice: 0.18,
} as const;

// ==================== 模块1: 中文分词器 ====================

/**
 * MVP版中文分词器（基于字符级bigram，无需外部依赖如jieba）
 *
 * 算法说明：
 * 1. 清理非中文/英文/数字字符
 * 2. 中文相邻两字组合为bigram（如"深度学习"→["深度","度学","学习"]）
 * 3. 英文单词整体提取并小写化
 * 4. 数字整体提取
 *
 * 时间复杂度: O(n)，n为文本字符数
 * 空间复杂度: O(n)，最坏情况下每个字符生成一个token
 *
 * @param text 输入文本
 * @returns token数组
 *
 * @example
 * // AI文本（重复性高）
 * tokenizeChinese('研究表明研究表明研究表明');
 * // → ['研究', '究表', '表明', '明研', '研究', '究表', '表明', '明研', '研究', '究表', '表明', '明研']
 * // TTR会很低 → 高风险 ✓
 *
 * @example
 * // 人类文本（多样性高）
 * tokenizeChinese('今天天气真好我和小明去了公园玩滑梯');
 * // → ['今天', '天天', '天气', '气真', '真好', '好我', '我和', '我小', '小明', '去了', '了公', '公园', '园玩', '玩滑', '滑梯']
 * // TTR较高 → 低风险 ✓
 */
export function tokenizeChinese(text: string): string[] {
  const cleaned = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const tokens: string[] = [];
  const chars = [...cleaned];
  let i = 0;

  while (i < chars.length) {
    const isChinese = /[\u4e00-\u9fa5]/.test(chars[i]);

    if (isChinese && i + 1 < chars.length && /[\u4e00-\u9fa5]/.test(chars[i + 1])) {
      tokens.push(chars[i] + chars[i + 1]);
      i += 1;
    } else if (/[a-zA-Z0-9]/.test(chars[i])) {
      let word = chars[i];
      i++;
      while (i < chars.length && /[a-zA-Z0-9]/.test(chars[i])) {
        word += chars[i];
        i++;
      }
      tokens.push(word.toLowerCase());
    } else {
      i++;
    }
  }

  return tokens;
}

// ==================== 模块2: TTR计算 ====================

/**
 * 计算Type-Token Ratio (TTR) —— 困惑度的代理指标
 *
 * 公式：TTR = 不重复token数 / 总token数
 *
 * AI文本典型值: 0.30-0.50（词汇贫乏、重复性高）
 * 人类文本典型值: 0.50-0.72（词汇丰富、表达多样）
 *
 * 阈值曲线：
 * - ttr < 0.30  → score = (0.30-ttr)*300+60, risk='high'
 * - 0.30≤ttr<0.50 → score = (0.50-ttr)*150+30, risk='medium'
 * - ttr ≥ 0.50  → score = (ttr-0.50)*80, risk='low'
 *
 * 时间复杂度: O(n)，n为token数量
 * 空间复杂度: O(n)，用于存储unique token集合
 *
 * @param text 输入文本
 * @returns TTR计算结果
 */
export function calculateTTR(text: string): TTRResult {
  const words = tokenizeChinese(text);

  if (words.length === 0) {
    return { ttr: 0, score: 50, risk: 'medium' };
  }

  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  let score: number;
  let risk: RuleRiskLevel;

  if (ttr < 0.30) {
    score = Math.max(0, Math.min(100, (0.30 - ttr) * 300 + 60));
    risk = 'high';
  } else if (ttr < 0.50) {
    score = Math.max(0, Math.min(100, (0.50 - ttr) * 150 + 30));
    risk = 'medium';
  } else {
    score = Math.max(0, Math.min(100, (ttr - 0.50) * 80));
    risk = 'low';
  }

  return {
    ttr: Math.round(ttr * 1000) / 1000,
    score: Math.round(score),
    risk,
  };
}

// ==================== 模块3: 句长方差分析 ====================

/**
 * 中文句子分割（支持中英文标点和换行符）
 *
 * 时间复杂度: O(n)
 * @param text 输入文本
 * @returns 句子数组
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?\n])(?=[^\s])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 计算句长方差 —— Burstiness代理指标
 *
 * 方差公式：Var(X) = Σ(xi - μ)² / N
 * 其中 xi = 第i个句子的字符长度, μ = 平均句长, N = 总句子数
 *
 * AI文本特征：句长趋于均匀，方差通常 < 15
 * 人类写作特征：句长变化大（突发性强），方差通常 > 30
 *
 * 阈值设定：
 * - variance < 15 → high (score: 60-110→clamp到100)
 * - 15 ≤ variance < 30 → medium (score: 20-60)
 * - variance ≥ 30 → low (score: 0-15)
 *
 * 时间复杂度: O(m)，m为句子数量
 * 空间复杂度: O(m)，存储每句长度
 *
 * @param text 输入文本
 * @returns 句长方差分析结果
 */
export function calculateSentenceVariance(text: string): SentenceVarianceResult {
  const sentences = splitSentences(text);

  if (sentences.length < 3) {
    return { variance: 0, meanLength: 0, sentenceCount: sentences.length, score: 50, risk: 'medium' };
  }

  const lengths = sentences.map((s) => s.replace(/\s+/g, '').length);
  const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

  const squaredDiffs = lengths.map((len) => Math.pow(len - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / lengths.length;

  let score: number;
  let risk: RuleRiskLevel;

  if (variance < 15) {
    score = Math.max(0, Math.min(100, (15 - variance) * 4 + 50));
    risk = 'high';
  } else if (variance < 30) {
    score = Math.max(0, Math.min(100, (30 - variance) * 2 + 20));
    risk = 'medium';
  } else {
    score = Math.max(0, Math.min(100, 15 - variance * 0.3));
    risk = 'low';
  }

  return {
    variance: Math.round(variance * 100) / 100,
    meanLength: Math.round(mean * 10) / 10,
    sentenceCount: sentences.length,
    score: Math.round(score),
    risk,
  };
}

// ==================== 模块4: AI高频词汇检测（200词完整表）====================

/**
 * AI高频词汇表（200词，按10大类分组）
 *
 * 数据来源参考：
 * - ChatGPT/GPT-4常见输出模式特征提取
 * - 知网AIGC检测报告中的高频词列表
 * - 学术写作中的程式化表达汇总
 * - GPTZero/Originality.ai公开的特征描述
 * - 大量AI生成文本样本统计分析
 *
 * weight含义：
 * - 1.3-1.5: 最高危词汇（总结过渡、学术套话核心词）
 * - 1.1-1.2: 中高危词汇（引导注意、序数列举、结构化表达）
 * - 0.8-1.0: 一般风险词汇（发现表明、程度副词、逻辑连接）
 * - 0.7-0.8: 低风险但需关注的辅助词汇
 */
const AI_HIGH_FREQ_WORDS: ReadonlyArray<{
  word: string;
  category: string;
  weight: number;
}> = [
  // ================================================================
  // 类别1: 总结过渡词 (28个) — weight: 1.2-1.5 — 最具AI辨识度
  // ================================================================
  { word: '综上所述', category: '总结过渡', weight: 1.5 },
  { word: '由此可见', category: '总结过渡', weight: 1.5 },
  { word: '总而言之', category: '总结过渡', weight: 1.5 },
  { word: '一言以蔽之', category: '总结过渡', weight: 1.4 },
  { word: '概括来说', category: '总结过渡', weight: 1.3 },
  { word: '总的来说', category: '总结过渡', weight: 1.2 },
  { word: '归根结底', category: '总结过渡', weight: 1.2 },
  { word: '简而言之', category: '总结过渡', weight: 1.4 },
  { word: '综上', category: '总结过渡', weight: 1.3 },
  { word: '总之', category: '总结过渡', weight: 1.2 },
  { word: '由此可见', category: '总结过渡', weight: 1.5 },
  { word: '由上可知', category: '总结过渡', weight: 1.3 },
  { word: '基于以上分析', category: '总结过渡', weight: 1.3 },
  { word: '从上述讨论可以看出', category: '总结过渡', weight: 1.4 },
  { word: '通过以上论述', category: '总结过渡', weight: 1.3 },
  { word: '综合以上几点', category: '总结过渡', weight: 1.3 },
  { word: '从整体来看', category: '总结过渡', weight: 1.2 },
  { word: '总体来看', category: '总结过渡', weight: 1.2 },
  { word: '总的来说', category: '总结过渡', weight: 1.2 },
  { word: '总的来讲', category: '总结过渡', weight: 1.2 },
  { word: '由此可见一斑', category: '总结过渡', weight: 1.3 },
  { word: '可见', category: '总结过渡', weight: 1.1 },
  { word: '显然', category: '总结过渡', weight: 1.1 },
  { word: '显而易见', category: '总结过渡', weight: 1.2 },
  { word: '不言而喻', category: '总结过渡', weight: 1.3 },
  { word: '毋庸置疑', category: '总结过渡', weight: 1.3 },
  { word: '毫无疑问', category: '总结过渡', weight: 1.3 },
  { word: '毫无疑义', category: '总结过渡', weight: 1.2 },

  // ================================================================
  // 类别2: 引导注意词 (22个) — weight: 1.2-1.3 — 典型AI"提醒读者"
  // ================================================================
  { word: '值得注意的是', category: '引导注意', weight: 1.3 },
  { word: '需要特别指出的是', category: '引导注意', weight: 1.3 },
  { word: '尤其值得关注的是', category: '引导注意', weight: 1.3 },
  { word: '不容忽视的是', category: '引导注意', weight: 1.2 },
  { word: '显而易见', category: '引导注意', weight: 1.2 },
  { word: '毋庸置疑', category: '引导注意', weight: 1.3 },
  { word: '毫无疑问', category: '引导注意', weight: 1.3 },
  { word: '不可否认', category: '引导注意', weight: 1.2 },
  { word: '需要强调的是', category: '引导注意', weight: 1.2 },
  { word: '必须指出', category: '引导注意', weight: 1.2 },
  { word: '应当看到', category: '引导注意', weight: 1.1 },
  { word: '值得强调', category: '引导注意', weight: 1.2 },
  { word: '值得注意的是', category: '引导注意', weight: 1.3 },
  { word: '尤其重要的是', category: '引导注意', weight: 1.3 },
  { word: '关键在于', category: '引导注意', weight: 1.1 },
  { word: '核心问题在于', category: '引导注意', weight: 1.2 },
  { word: '根本原因在于', category: '引导注意', weight: 1.2 },
  { word: '重要的一点是', category: '引导注意', weight: 1.2 },
  { word: '尤为关键的是', category: '引导注意', weight: 1.3 },
  { word: '特别需要指出', category: '引导注意', weight: 1.3 },
  { word: '这一点至关重要', category: '引导注意', weight: 1.3 },
  { word: '不可忽视的一点', category: '引导注意', weight: 1.2 },

  // ================================================================
  // 类别3: 发现/表明词 (26个) — weight: 1.0-1.1 — AI论证程式化
  // ================================================================
  { word: '不难发现', category: '发现表明', weight: 1.1 },
  { word: '研究表明', category: '发现表明', weight: 1.1 },
  { word: '实验结果表明', category: '发现表明', weight: 1.1 },
  { word: '数据表明', category: '发现表明', weight: 1.0 },
  { word: '结果显示', category: '发现表明', weight: 1.0 },
  { word: '可以看出', category: '发现表明', weight: 1.0 },
  { word: '由此可知', category: '发现表明', weight: 1.1 },
  { word: '从中可以看出', category: '发现表明', weight: 1.1 },
  { word: '可以发现', category: '发现表明', weight: 1.0 },
  { word: '观察发现', category: '发现表明', weight: 1.0 },
  { word: '分析发现', category: '发现表明', weight: 1.0 },
  { word: '调查结果证实', category: '发现表明', weight: 1.1 },
  { word: '实践证明', category: '发现表明', weight: 1.0 },
  { word: '事实充分证明', category: '发现表明', weight: 1.1 },
  { word: '大量事实表明', category: '发现表明', weight: 1.1 },
  { word: '相关研究显示', category: '发现表明', weight: 1.0 },
  { word: '已有研究证明', category: '发现表明', weight: 1.0 },
  { word: '现有研究指出', category: '发现表明', weight: 1.0 },
  { word: '前人研究认为', category: '发现表明', weight: 1.0 },
  { word: '学界普遍认为', category: '发现表明', weight: 1.1 },
  { word: '学术界普遍认为', category: '发现表明', weight: 1.1 },
  { word: '众多学者一致认为', category: '发现表明', weight: 1.1 },
  { word: '多数研究者认为', category: '发现表明', weight: 1.0 },
  { word: '据相关统计数据显示', category: '发现表明', weight: 1.1 },
  { word: '根据实证研究结果', category: '发现表明', weight: 1.1 },
  { word: '从统计数据来看', category: '发现表明', weight: 1.0 },

  // ================================================================
  // 类别4: 序数列举词 (32个) — weight: 1.0-1.2 — AI结构化偏好
  // ================================================================
  { word: '首先', category: '序数列举', weight: 1.2 },
  { word: '其次', category: '序数列举', weight: 1.2 },
  { word: '再次', category: '序数列举', weight: 1.1 },
  { word: '最后', category: '序数列举', weight: 1.0 },
  { word: '第一', category: '序数列举', weight: 1.1 },
  { word: '第二', category: '序数列举', weight: 1.1 },
  { word: '第三', category: '序数列举', weight: 1.1 },
  { word: '第四', category: '序数列举', weight: 1.0 },
  { word: '一方面', category: '序数列举', weight: 1.2 },
  { word: '另一方面', category: '序数列举', weight: 1.2 },
  { word: '其一', category: '序数列举', weight: 1.1 },
  { word: '其二', category: '序数列举', weight: 1.1 },
  { word: '其三', category: '序数列举', weight: 1.0 },
  { word: '除此之外', category: '序数列举', weight: 1.0 },
  { word: '此外', category: '序数列举', weight: 0.9 },
  { word: '另外', category: '序数列举', weight: 0.8 },
  { word: '同时', category: '序数列举', weight: 0.8 },
  { word: '与之相对应的是', category: '序数列举', weight: 1.1 },
  { word: '与此形成对比的是', category: '序数列举', weight: 1.1 },
  { word: '具体来说', category: '序数列举', weight: 1.0 },
  { word: '具体而言', category: '序数列举', weight: 1.0 },
  { word: '主要包括以下几个方面', category: '序数列举', weight: 1.1 },
  { word: '可以从以下几个角度', category: '序数列举', weight: 1.1 },
  { word: '具体表现在以下方面', category: '序数列举', weight: 1.1 },
  { word: '大致可以分为以下几类', category: '序数列举', weight: 1.0 },
  { word: '主要包含以下几个部分', category: '序数列举', weight: 1.0 },
  { word: '归纳起来主要有以下几点', category: '序数列举', weight: 1.1 },
  { word: '可以归纳为以下几种情况', category: '序数列举', weight: 1.0 },
  { word: '可以分为以下三个层面', category: '序数列举', weight: 1.1 },
  { word: '主要体现在以下三个方面', category: '序数列举', weight: 1.1 },
  { word: '具有以下显著特点', category: '序数列举', weight: 1.0 },
  { word: '具有以下几个方面的特征', category: '序数列举', weight: 1.0 },

  // ================================================================
  // 类别5: 程度副词 (25个) — weight: 0.7-0.9 — AI过度使用修饰
  // ================================================================
  { word: '非常', category: '程度副词', weight: 0.8 },
  { word: '十分', category: '程度副词', weight: 0.8 },
  { word: '极其', category: '程度副词', weight: 0.9 },
  { word: '尤为', category: '程度副词', weight: 0.9 },
  { word: '相当', category: '程度副词', weight: 0.7 },
  { word: '显著', category: '程度副词', weight: 0.8 },
  { word: '明显', category: '程度副词', weight: 0.7 },
  { word: '大幅', category: '程度副词', weight: 0.8 },
  { word: '高度', category: '程度副词', weight: 0.8 },
  { word: '极为', category: '程度副词', weight: 0.9 },
  { word: '格外', category: '程度副词', weight: 0.8 },
  { word: '特别', category: '程度副词', weight: 0.7 },
  { word: '十分', category: '程度副词', weight: 0.8 },
  { word: '颇为', category: '程度副词', weight: 0.8 },
  { word: '相当', category: '程度副词', weight: 0.7 },
  { word: '较为', category: '程度副词', weight: 0.7 },
  { word: '进一步', category: '程度副词', weight: 0.7 },
  { word: '持续', category: '程度副词', weight: 0.7 },
  { word: '广泛', category: '程度副词', weight: 0.7 },
  { word: '深入', category: '程度副词', weight: 0.8 },
  { word: '全面', category: '程度副词', weight: 0.7 },
  { word: '有效', category: '程度副词', weight: 0.7 },
  { word: '积极', category: '程度副词', weight: 0.7 },
  { word: '重要', category: '程度副词', weight: 0.7 },
  { word: '关键', category: '程度副词', weight: 0.8 },

  // ================================================================
  // 类别6: 学术套话+结构化表达 (34个) — weight: 1.0-1.3 — AI论文标配
  // ================================================================
  { word: '具有重要意义', category: '学术套话', weight: 1.0 },
  { word: '发挥着重要作用', category: '学术套话', weight: 1.0 },
  { word: '具有深远影响', category: '学术套话', weight: 1.0 },
  { word: '广泛应用', category: '学术套话', weight: 0.9 },
  { word: '得到了广泛关注', category: '学术套话', weight: 1.0 },
  { word: '成为研究热点', category: '学术套话', weight: 1.0 },
  { word: '在...背景下', category: '结构化表达', weight: 1.2 },
  { word: '随着...的发展', category: '结构化表达', weight: 1.1 },
  { word: '基于上述分析', category: '结构化表达', weight: 1.2 },
  { word: '通过深入研究', category: '结构化表达', weight: 1.1 },
  { word: '本文旨在', category: '结构化表达', weight: 1.2 },
  { word: '学术界普遍认为', category: '结构化表达', weight: 1.3 },
  { word: '现有文献表明', category: '结构化表达', weight: 1.2 },
  { word: '前人研究指出', category: '结构化表达', weight: 1.2 },
  { word: '大量研究表明', category: '结构化表达', weight: 1.3 },
  { word: '一般来说', category: '结构化表达', weight: 1.1 },
  { word: '总体而言', category: '结构化表达', weight: 1.1 },
  { word: '从某种意义上说', category: '结构化表达', weight: 1.2 },
  { word: '换句话说', category: '逻辑连接', weight: 1.0 },
  { word: '也就是说', category: '逻辑连接', weight: 1.0 },
  { word: '换言之', category: '逻辑连接', weight: 1.0 },
  { word: '因此', category: '逻辑连接', weight: 0.9 },
  { word: '然而', category: '逻辑连接', weight: 0.8 },
  { word: '此外', category: '逻辑连接', weight: 0.8 },
  { word: '同时', category: '逻辑连接', weight: 0.7 },
  { word: '不仅...而且...', category: '结构化表达', weight: 1.2 },
  { word: '既...又...', category: '结构化表达', weight: 1.0 },
  { word: '在当前形势下', category: '结构化表达', weight: 1.1 },
  { word: '在当今时代背景下', category: '结构化表达', weight: 1.2 },
  { word: '随着科技的不断进步', category: '结构化表达', weight: 1.1 },
  { word: '在信息化时代的今天', category: '结构化表达', weight: 1.2 },
  { word: '随着社会经济的快速发展', category: '结构化表达', weight: 1.1 },
  { word: '在全球化浪潮的推动下', category: '结构化表达', weight: 1.1 },
  { word: '理论与实践相结合', category: '结构化表达', weight: 1.0 },

  // ================================================================
  // 类别7: 补充过渡/连接词 (18个) — weight: 0.8-1.1 — AI高频连接
  // ================================================================
  { word: '不仅如此', category: '补充过渡', weight: 1.1 },
  { word: '更为重要的是', category: '补充过渡', weight: 1.2 },
  { word: '与此同时', category: '补充过渡', weight: 0.9 },
  { word: '相应地', category: '补充过渡', weight: 0.9 },
  { word: '在此基础上', category: '补充过渡', weight: 1.0 },
  { word: '鉴于此', category: '补充过渡', weight: 1.1 },
  { word: '基于此', category: '补充过渡', weight: 1.0 },
  { word: '正是由于', category: '补充过渡', weight: 1.0 },
  { word: '之所以...是因为...', category: '补充过渡', weight: 1.1 },
  { word: '归根到底是因为', category: '补充过渡', weight: 1.1 },
  { word: '追根溯源', category: '补充过渡', weight: 1.0 },
  { word: '进一步地', category: '补充过渡', weight: 0.9 },
  { word: '更进一步说', category: '补充过渡', weight: 1.0 },
  { word: '深入分析可以发现', category: '补充过渡', weight: 1.1 },
  { word: '仔细观察不难发现', category: '补充过渡', weight: 1.2 },
  { word: '透过现象看本质', category: '补充过渡', weight: 1.1 },
  { word: '从本质上讲', category: '补充过渡', weight: 1.0 },
  { word: '从根本上说', category: '补充过渡', weight: 1.0 },

  // ================================================================
  // 类别8: 论证框架词 (15个) — weight: 1.0-1.2 — AI论证套路
  // ================================================================
  { word: '首先...其次...最后', category: '论证框架', weight: 1.2 },
  { word: '一方面...另一方面', category: '论证框架', weight: 1.2 },
  { word: '虽然...但是...', category: '论证框架', weight: 1.0 },
  { word: '尽管...然而...', category: '论证框架', weight: 1.1 },
  { word: '不仅...而且...', category: '论证框架', weight: 1.1 },
  { word: '与其说...不如说...', category: '论证框架', weight: 1.1 },
  { word: '并不是...而是...', category: '论证框架', weight: 1.0 },
  { word: '无论...都...', category: '论证框架', weight: 1.0 },
  { word: '除了...(还/也/同时)', category: '论证框架', weight: 1.0 },
  { word: '以...为例', category: '论证框架', weight: 0.9 },
  { word: '正如...所指出的那样', category: '论证框架', weight: 1.1 },
  { word: '正如前面所提到的', category: '论证框架', weight: 1.0 },
  { word: '正如上文所述', category: '论证框架', weight: 1.0 },
  { word: '如前所述', category: '论证框架', weight: 1.0 },
  { word: '前面已经提到', category: '论证框架', weight: 0.9 },
];

/**
 * AI高频词汇检测函数
 *
 * 匹配算法：
 * 1. 遍历200词词汇表，对每个词在文本中进行正则匹配
 * 2. 计算加权命中次数（次数 × 词权重）
 * 3. 计算加权密度 = 加权命中总数 / 总字数 × 1000（次/千字）
 *
 * 密度阈值与评分：
 * - density > 8   → high (score: 60-100)
 * - 5 < density ≤ 8 → medium (score: 30-60)
 * - 2 < density ≤ 5 → low (score: 0-30)
 * - density ≤ 2   → score: 0
 *
 * 时间复杂度: O(V × n)，V=200(词汇量), n=文本长度（正则扫描）
 * 空间复杂度: O(M)，M=匹配到的不同词汇数量（最多200）
 *
 * @param text 待检测文本
 * @param wordCount 文本总字数（用于计算密度）
 * @returns 词汇检测结果
 */
export function detectAIVocabulary(
  text: string,
  wordCount: number
): VocabularyDetectionResult {
  const matchedWords: Array<{ word: string; category: string; count: number }> =
    [];
  let totalWeightedCount = 0;

  for (const entry of AI_HIGH_FREQ_WORDS) {
    const regex = new RegExp(entry.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      totalWeightedCount += matches.length * entry.weight;
      matchedWords.push({
        word: entry.word,
        category: entry.category,
        count: matches.length,
      });
    }
  }

  const density = wordCount > 0 ? (totalWeightedCount / wordCount) * 1000 : 0;

  let score: number;
  let risk: RuleRiskLevel;

  if (density > 8) {
    score = Math.min(100, 60 + (density - 8) * 5);
    risk = 'high';
  } else if (density > 5) {
    score = Math.min(100, 30 + (density - 5) * 10);
    risk = 'medium';
  } else if (density > 2) {
    score = Math.min(100, (density - 2) * 10);
    risk = 'low';
  } else {
    score = 0;
    risk = 'low';
  }

  matchedWords.sort((a, b) => b.count - a.count);

  return {
    density: Math.round(density * 100) / 100,
    matchedWords: matchedWords.slice(0, 15),
    score: Math.round(score),
    risk,
  };
}

// ==================== 模块5: 过渡词模式匹配（10个正则）====================

/**
 * 过渡词模式列表（10个正则表达式）
 *
 * 每个模式包含：
 * - pattern: 正则表达式（全局匹配）
 * - label: 模式的人类可读标签
 * - penalty: 单次匹配的基础惩罚分
 * - description: 该模式的特征描述
 *
 * 实际惩罚分 = penalty × min(匹配次数, 3)（上限3次防止单一模式主导）
 */
const TRANSITION_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  label: string;
  penalty: number;
  description: string;
}> = [
  {
    pattern: /一方面[，,]?[^。]*另一方面/g,
    label: '一方面...另一方面',
    penalty: 8,
    description: '对称式过渡结构，AI高度偏好',
  },
  {
    pattern: /不仅[^。]*而且[^。]*(?:还|也)/g,
    label: '不仅...而且(还/也)',
    penalty: 7,
    description: '递进式固定搭配',
  },
  {
    pattern: /首先[^。]*其次[^。]*(?:再次[^。]*)?(?:最后)?/g,
    label: '首先...其次...(最后)',
    penalty: 9,
    description: '三段式列举，最典型的AI结构标志',
  },
  {
    pattern: /虽然[^。]*但是[^。]*/g,
    label: '虽然...但是',
    penalty: 5,
    description: '标准转折搭配',
  },
  {
    pattern: /尽管[^。]*然而[^。]*/g,
    label: '尽管...然而',
    penalty: 6,
    description: '正式转折搭配',
  },
  {
    pattern: /无论[^。]*都[^。]*/g,
    label: '无论...都',
    penalty: 5,
    description: '条件让步结构',
  },
  {
    pattern: /除了[^。]*(?:之外|以外)[^。]*(?:还|也|同时)/g,
    label: '除了...(还/也/同时)',
    penalty: 6,
    description: '补充说明结构',
  },
  {
    pattern: /与其说[^。]*不如说[^。]*/g,
    label: '与其说...不如说',
    penalty: 7,
    description: '比较选择结构',
  },
  {
    pattern: /并不是[^。]*而是[^。]*/g,
    label: '并不是...而是',
    penalty: 6,
    description: '纠正式转折',
  },
  {
    pattern: /(?:换言之|换句话说|也就是说)[^。]{10,}/g,
    label: '解释性插入语',
    penalty: 4,
    description: '频繁解释说明',
  },
];

/**
 * 过渡词模式检测函数
 *
 * 对文本逐一应用10个正则模式，累计惩罚分
 * 最终得分 = min(totalPenalty × 3, 100)
 *
 * 时间复杂度: O(P × n)，P=10(模式数), n=文本长度
 * 空间复杂度: O(P)，最多存储10个模式匹配结果
 *
 * @param text 待检测文本
 * @returns 过渡词检测结果
 */
export function detectTransitionPatterns(
  text: string
): TransitionPatternResult {
  const patterns: Array<{ label: string; count: number; penalty: number }> = [];
  let totalPenalty = 0;

  for (const tp of TRANSITION_PATTERNS) {
    const matches = text.match(tp.pattern);
    if (matches && matches.length > 0) {
      const count = matches.length;
      const cappedPenalty = tp.penalty * Math.min(count, 3);
      totalPenalty += cappedPenalty;
      patterns.push({
        label: tp.label,
        count,
        penalty: Math.round(cappedPenalty),
      });
    }
  }

  const score = Math.min(100, Math.round(totalPenalty * 3));

  return {
    patterns: patterns.sort((a, b) => b.penalty - a.penalty),
    totalPenalty: Math.round(totalPenalty),
    score,
  };
}

// ==================== 模块6: 被动语态统计（8个正则模式）====================

/**
 * 被动语态识别正则模式列表（8个）
 *
 * 覆盖中文被动语态的主要形式：
 * 1. "被..." 结构
 * 2. "由...构成/组成/产生..." 结构
 * 3. "受到...的影响/制约/限制..." 结构
 * 4. "予以..." 结构
 * 5. "加以..." 结构
 * 6. "给...带来/造成..." 结构
 * 7. "为...所..." 结构
 * 8. "据...显示/表明..." 结构
 */
const PASSIVE_PATTERNS: ReadonlyArray<RegExp> = [
  /被[^，。]{2,20}(所.{1,5})?/g,
  /由[^，。]{2,20}(构成|组成|产生|引起|导致|完成|执行|实施|进行)/g,
  /受到[^，。]{2,20}(的影响|的制约|的限制|的作用|的关注)/g,
  /予以[^，。]{2,}/g,
  /加以[^，。]{2,}/g,
  /给[^，。]{2,10}(带来|造成|引发|引起)/g,
  /为[^，。]{2,}(所.{1,5})?/g,
  /据[^，。]{2,10}(显示|表明|报道|介绍|透露|反映)/g,
];

/**
 * 被动语态比例统计函数
 *
 * 算法：
 * 1. 使用8个正则模式匹配所有被动语态句式
 * 2. 计算被动句数量 / 总句子数 = 被动比例
 *
 * 比例阈值与评分：
 * - ratio > 0.5  → score: 50-100 (严重过度使用)
 * - 0.3 < ratio ≤ 0.5 → score: 20-50 (明显偏高)
 * - 0.15 < ratio ≤ 0.3 → score: 0-20 (轻微偏高)
 * - ratio ≤ 0.15 → score: 0 (正常范围)
 *
 * 时间复杂度: O(P × n)，P=8(被动模式数), n=文本长度
 * 空间复杂度: O(1)
 *
 * @param text 待检测文本
 * @param sentenceCount 总句子数（来自calculateSentenceVariance）
 * @returns 被动语态检测结果
 */
export function detectPassiveVoice(
  text: string,
  sentenceCount: number
): PassiveVoiceResult {
  if (sentenceCount === 0) {
    return { passiveCount: 0, ratio: 0, score: 0 };
  }

  let passiveCount = 0;
  for (const pattern of PASSIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      passiveCount += matches.length;
    }
  }

  const ratio = passiveCount / sentenceCount;

  let score: number;
  if (ratio > 0.5) {
    score = Math.min(100, 50 + (ratio - 0.5) * 100);
  } else if (ratio > 0.3) {
    score = Math.min(100, 20 + (ratio - 0.3) * 150);
  } else if (ratio > 0.15) {
    score = Math.min(100, (ratio - 0.15) * 133);
  } else {
    score = 0;
  }

  return {
    passiveCount,
    ratio: Math.round(ratio * 1000) / 1000,
    score: Math.round(score),
  };
}

// ==================== 模块7: 规则引擎综合评分入口 ====================

/**
 * 规则引擎主入口 —— 并行执行5个子模块并加权融合
 *
 * 权重分配（总计100%）：
 * - TTR计算:          22%
 * - 句长方差分析:      20%
 * - AI高频词汇检测:    22%
 * - 过渡词模式匹配:    18%
 * - 被动语态统计:      18%
 *
 * weightedScore = Σ(subScore_i × weight_i)
 *
 * 同时收集各子模块触发的问题描述，用于前端展示和LLM参考
 *
 * 时间复杂度: O(V×n + P×n + n) ≈ O(n)，各子模块串行执行
 * （实际生产环境可用Promise.all并行优化至O(max(子模块))）
 * 空间复杂度: O(n)，主要用于存储中间结果
 *
 * @param text 待检测文本（建议100-50000字）
 * @returns 规则引擎综合结果
 */
export function runRuleEngine(text: string): RuleEngineResult {
  const wordCount = (text.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length;

  const ttr = calculateTTR(text);
  const sentenceVariance = calculateSentenceVariance(text);
  const vocabulary = detectAIVocabulary(text, wordCount);
  const transitions = detectTransitionPatterns(text);
  const passiveVoice = detectPassiveVoice(text, sentenceVariance.sentenceCount);

  const weightedScore = Math.round(
    ttr.score * RULE_WEIGHTS.ttr +
      sentenceVariance.score * RULE_WEIGHTS.sentenceVariance +
      vocabulary.score * RULE_WEIGHTS.vocabulary +
      transitions.score * RULE_WEIGHTS.transitions +
      passiveVoice.score * RULE_WEIGHTS.passiveVoice
  );

  const issues: string[] = [];
  if (ttr.risk !== 'low') issues.push(`词汇多样性不足(TTR=${ttr.ttr})`);
  if (sentenceVariance.risk !== 'low')
    issues.push(`句式单一(句长方差=${sentenceVariance.variance})`);
  if (vocabulary.risk !== 'low')
    issues.push(`用词模式化(AI高频词密度:${vocabulary.density}/千字)`);
  if (transitions.totalPenalty > 5)
    issues.push(`过渡词高频出现(惩罚分:${transitions.totalPenalty})`);
  if (passiveVoice.score > 20)
    issues.push(`被动语态比例过高(${(passiveVoice.ratio * 100).toFixed(1)}%)`);

  return {
    ttr,
    sentenceVariance,
    vocabulary,
    transitions,
    passiveVoice,
    weightedScore,
    issues,
  };
}

// ==================== 模块8: AIGC检测Prompt模板 ====================

/**
 * AIGC检测专用API参数配置
 *
 * 设计理由：
 * - temperature=0.1: 检测任务需要确定性和一致性，低温度减少评分波动
 * - max_tokens=4000: 8段落×~300字JSON≈2400字，余量1600应对长段落
 */
export const AIGC_DETECT_API_CONFIG = {
  model: 'deepseek-chat',
  temperature: 0.1,
  maxTokens: 4000,
  topP: 0.95,
  presencePenalty: 0,
  frequencyPenalty: 0,
  timeout: 30000,
  maxRetries: 3,
} as const;

/**
 * 生成AIGC检测Prompt模板
 *
 * 核心设计原则：
 * 1. 角色定位为专业AIGC检测器（非通用助手）
 * 2. 明确的评分标准（5档，0-100整数分）
 * 3. 6维判断维度覆盖所有AI特征
 * 4. 严格的JSON输出格式要求（便于程序解析）
 * 5. 多次容错提示确保格式正确
 *
 * 与论文降重Prompt的关键差异：
 * - 这是**检测判断**任务，不是改写任务
 * - temperature应该很低（0.1）保证一致性
 * - 输出必须是结构化JSON（不是自由文本）
 * - 需要6维度的证据列表
 *
 * @param paragraphs 待检测段落数组
 * @returns 完整的检测Prompt字符串
 */
export function generateAIGCDetectPrompt(
  paragraphs: DetectParagraph[]
): string {
  const paragraphsText = paragraphs
    .map((p) => `【段落${p.index}】\n${p.text}`)
    .join('\n\n');

  return `你是一个专业的AIGC文本检测器，专门识别中文AI生成内容。请对以下${paragraphs.length}个文本段落进行逐一分析。

## 评分标准（每个段落独立打分，0-100整数分）
- 0-20: 几乎确定为人类撰写
- 21-40: 可能是人类撰写，但有轻微AI特征
- 41-60: 有较明显AI生成特征
- 61-80: 大概率为AI生成
- 81-100: 几乎确定为AI生成

## 判断依据（请检查以下6个维度）
1. **句式均匀度**: 句子长度是否过于整齐划一？人类写作通常长短不一
2. **过渡词使用**: 是否存在"综上所述""值得注意的是""不难发现""一言以蔽之"等AI高频表达？
3. **词汇多样性**: 是否缺乏个性化的词汇选择？是否反复使用相同的形容词和副词？
4. **逻辑流畅度**: 推理过程是否过于"完美"和程式化？缺乏思维跳跃或个人观点？
5. **观点表达**: 是否缺乏作者个人立场或主观判断？语气是否过于中立客观？
6. **结构化程度**: 是否呈现过于工整的"总分总"或"第一第二第三"结构？

## 待检测文本
${paragraphsText}

## 输出要求
请严格以JSON数组格式输出，不要添加任何其他文字、不要使用markdown代码块标记：
[
  {
    "index": 段落序号(数字),
    "score": 0-100的疑似度分数(数字),
    "evidence": ["具体的AI写作特征证据1", "证据2", "证据3"],
    "reasoning": "简短的推理过程(不超过50字)"
  },
  ...（每个段落一个对象，共${paragraphs.length}个）
]
请严格返回JSON数组，不要包含其他文字。`;
}

/**
 * 解析LLM检测响应
 *
 * 容错策略：
 * 1. 从原始响应中提取JSON数组（容忍前后缀文字）
 * 2. JSON解析失败时抛出PARSE_ERROR
 * 3. 非数组格式时抛出错误
 * 4. 逐条校验字段，缺失值使用默认值
 * 5. 分数越界时钳制到[0,100]范围
 *
 * @param raw LLM返回的原始文本
 * @param expectedCount 期望的段落数量
 * @returns 结构化的检测结果数组
 * @throws 解析失败时包含'PARSE_ERROR'信息
 */
export function parseLLMDetectResponse(
  raw: string,
  expectedCount: number
): LLMDetectResult[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(
      'LLM返回格式异常：未找到JSON数组。原始响应: ' + raw.slice(0, 200)
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(
      'LLM返回JSON解析失败。原始片段: ' + jsonMatch[0].slice(0, 200)
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error('LLM返回非数组格式，预期JSON Array');
  }

  return parsed
    .map((item: unknown, idx: number) => {
      const obj = item as Record<string, unknown>;
      return {
        index:
          typeof obj.index === 'number' ? obj.index : idx + 1,
        score: clampScore(obj.score),
        evidence: Array.isArray(obj.evidence)
          ? (obj.evidence as string[]).slice(0, 3)
          : [],
        reasoning:
          typeof obj.reasoning === 'string' ? obj.reasoning : '',
      };
    })
    .slice(0, expectedCount);
}

/**
 * 分数钳制工具函数
 * 将任意输入安全映射到[0, 100]范围
 *
 * @param score 待钳制的分数
 * @returns 安全范围内的整数分数
 */
function clampScore(score: unknown): number {
  const num = Number(score);
  if (isNaN(num) || num < 0) return 50;
  if (num > 100) return 100;
  return Math.round(num);
}

// ==================== 模块9: 对抗性改写Prompt模板 ====================

/**
 * AIGC改写专用API参数配置
 *
 * 设计理由（vs 论文降重的差异）：
 * - temperature=0.8: 更高的创造性以打破AI模式
 * - presence_penalty=0.3: 鼓励新颖表达方式
 * - frequency_penalty=0.5: 强力惩罚重复表达
 * - max_tokens=2000: 改写后可能比原文更长（插入语等）
 */
export const AIGC_REWRITE_API_CONFIG = {
  model: 'deepseek-chat',
  temperature: 0.8,
  maxTokens: 2000,
  topP: 0.9,
  presencePenalty: 0.3,
  frequencyPenalty: 0.5,
  timeout: 45000,
  maxRetries: 3,
} as const;

/**
 * 生成对抗性改写Prompt模板
 *
 * 核心认知差异（vs 论文降重Prompt）：
 * | 维度         | 论文降重Prompt       | AIGC对抗改写Prompt       |
 * |-------------|-------------------|----------------------|
 * | 核心目标     | 降低与文献相似度      | 降低被AIGC检测概率         |
 * | 改写方向     | 同义词替换+重组       | 打破AI模式+注入人类特征      |
 * | 质量基准     | 保持学术规范         | 保持规范+增加"不完美"       |
 * | temperature | 0.7               | 0.8 (更高创造性)          |
 * | presence_penalty | 0            | 0.3 (鼓励新表达)          |
 * | frequency_penalty | 0           | 0.5 (惩罚重复)            |
 *
 * @param originalParagraph 原始段落文本
 * @param options 改写选项（版本类型、问题列表、当前分数）
 * @returns 完整的改写Prompt字符串
 */
export function generateAIGCRewritePrompt(
  originalParagraph: string,
  options: AIGCRewriteOptions
): string {
  const versionInstructions: Record<RewriteVersionType, string> = {
    conservative: `【保守型改写策略】
- 改动幅度控制在最小范围
- 主要通过同义词替换和局部句式调整来改善
- 保持原文的整体结构和论证顺序
- 适合对原文改动敏感的场景
- 预期AIGC率降幅: 10-25%，置信度85-95%`,

    balanced: `【平衡型改写策略】（推荐✓）
- 适度调整句式结构和表达方式
- 全面应用去AI化技巧：打破均匀节奏、替换高频词、加入个人标记
- 可适当调整段落内部逻辑顺序
- 在保证质量的前提下最大化降AIGC效果
- 预期AIGC率降幅: 20-38%，置信度80-92%`,

    aggressive: `【激进型改写策略】
- 大幅重构段落结构和表达方式
- 完全重新组织语言，彻底打破原有AI模式
- 可引入口语化表达、设问句、倒装等多样化手法
- 适合高风险段落（疑似度>80%）的紧急处理
- 注意：务必保持核心论点和关键数据不变
- 预期AIGC率降幅: 32-52%，置信度65-82%`,
  };

  const issuesStr =
    options.issues.length > 0
      ? `\n该段落存在的AI特征问题：${options.issues.join('、')}`
      : '';

  return `你是一位资深的中文学术写作专家，同时也是一位"AIGC检测规避"领域的资深顾问。
你的专长是将带有AI生成特征的文本改写得更加"人性化"，使其能够顺利通过各类AIGC检测系统的审查。

## 核心认知
AIGC检测系统主要通过以下6大特征识别AI文本：
1. 句式过于均匀（句长方差小，每句话长度差不多）
2. 大量使用"综上所述""值得注意的是""不难发现"等程式化过渡词
3. 词汇选择缺乏个性（TTR低，反复使用相同表达）
4. 逻辑推进过于"完美"流畅（缺少思维跳跃和个人观点插入）
5. 缺乏作者个人身份标记（没有"笔者认为""我们发现"等第一人称介入）
6. 结构过于工整（总是"第一第二第三""一方面另一方面"的对称结构）

你的任务是**刻意打破这些模式**，让文本呈现出真实人类写作的自然特征。

${versionInstructions[options.version as RewriteVersionType]}

## 必须遵守的原则（底线 ✅）
1. 核心论点和结论不能改变
2. 专业术语、学科名词、人名地名不得替换
3. 数据、引用、公式必须原样保留
4. 改写后必须符合中文学术写作基本规范
5. 语义相似度应保持在82%以上（核心意思不变）

## 必须执行的改写技术（至少执行4项以上）

### 技术1: 句式爆破（最重要⭐）
- 将连续的短句合并为一个带从句的长句
- 将过长的复合句拆分为2-3个短句
- 使用破折号（——）插入补充说明或转折
- 使用括号（）添加注释或补充信息
- 故意制造长短不一的句式节奏（目标句长方差 > 30）

### 技术2: 词汇去AI化
- 禁止使用：综上所述、由此可见、值得注意的是、不难发现、毋庸置疑、总而言之、一言以蔽之
- 替换为：笔者发现、从数据来看、有意思的是、让人意外的是、回到问题本身、说实话
- 偶尔使用略带口语化的表达："话说回来""换个角度看""老实说"

### 技术3: 注入作者身份
- 适当加入：笔者认为、据我们观察、在我们的研究中、这一发现让我们意识到
- 加入适度的不确定性表述：初步结果显示、尽管这一结论尚待进一步验证、我们倾向于认为
- 可以加入个人感受：令人惊讶的是、这一点往往被忽视、笔者在此想强调

### 技术4: 结构微调
- 不要总是"主题句→论证→结论"的标准结构
- 尝试先说结论再展开（倒金字塔结构）
- 插入设问句："为什么会这样呢？原因在于..."
- 加入转折："然而，事情并非如此简单""但这里有一个微妙之处"
- 偶尔使用不完全工整的表达（保留自然的松散感）

## 严格禁止的事项 ❌
- 不要使用排比句式（尤其是三个以上的并列成分）
- 不要使用"第一/第二/第三"的序数列举（改为"其一...其二..."或直接用段落分隔）
- 不要让每句话都完美工整（人类写作天然有松散感）
- 不要使用"总而言之""一言以蔽之"等总结性套话
- 不要过度使用引号强调（偶尔用即可）
- 不要生成看起来像机器翻译的文本（避免过度欧化句式）

## 原始段落
${originalParagraph}
${issuesStr}
该段落当前AIGC疑似度: ${options.currentScore}%

## 输出要求
请仅输出改写后的完整文本，不要添加任何解释说明、不要使用markdown格式标记、不要输出JSON。
直接输出纯文本即可。`;
}

// ==================== 模块10: 质量评估算法 ====================

/**
 * 通顺度快速评估（轻量级启发式）
 *
 * 基于简单规则估算文本通顺度：
 * - 句子长度合理性（不过长也不过短）
 * - 标点符号使用规范性
 * - 无明显乱码或异常字符
 *
 * @param text 待评估文本
 * @returns 通顺度评分 (0-1)
 */
function evaluateFluency(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const sentences = splitSentences(text);
  if (sentences.length === 0) return 0.5;

  let fluencyScore = 0.8;

  const avgLen =
    sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

  if (avgLen < 5) fluencyScore -= 0.3;
  else if (avgLen < 10) fluencyScore -= 0.1;
  else if (avgLen > 150) fluencyScore -= 0.2;
  else if (avgLen > 80) fluencyScore -= 0.1;

  const punctuationRatio =
    (text.match(/[，。！？、；：""''（）《》【】]/g) || []).length /
    text.length;
  if (punctuationRatio < 0.02) fluencyScore -= 0.15;
  if (punctuationRatio > 0.25) fluencyScore -= 0.1;

  const hasRepeatedChars = /(.)\1{4,}/.test(text.replace(/\s/g, ''));
  if (hasRepeatedChars) fluencyScore -= 0.2;

  return Math.max(0, Math.min(1, fluencyScore));
}

/**
 * AIGC改写质量评估（针对AIGC场景调整权重）
 *
 * vs 论文降重的evaluateRewriteQuality()差异：
 * - 语义相似度权重降低（0.35→0.25）：允许更大改动幅度以打破AI模式
 * - 新增"AIGC率降低"维度（0.45）：这是核心优化目标
 * - 通顺度保持（0.30）：基本质量底线
 *
 * 各版本期望值：
 * | 版本类型   | 语义相似度 | AIGC降幅  | 通顺度  |
 * |-----------|-----------|----------|---------|
 * | 保守型     | 0.92-0.97 | >0.12    | >0.78   |
 * | 平衡型     | 0.84-0.93 | >0.20    | >0.74   |
 * | 激进型     | 0.78-0.88 | >0.32    | >0.70   |
 *
 * 时间复杂度: O(n²)（来自Levenshtein相似度计算）
 * 空间复杂度: O(n)
 *
 * @param original 原始文本
 * @param rewritten 改写后文本
 * @param originalAIGCScore 原始AIGC疑似度分数
 * @param options 改写选项（含版本类型）
 * @returns 质量评估结果
 */
export function evaluateAIGCRewriteQuality(
  original: string,
  rewritten: string,
  originalAIGCScore: number,
  options: { version: RewriteVersionType }
): AIGCRewriteQualityResult {
  const semanticSimilarity = calculateSimilarity(original, rewritten);

  const quickRuleCheck = runRuleEngine(rewritten);
  const ruleComponentBefore = originalAIGCScore * 0.4;
  const ruleComponentAfter = quickRuleCheck.weightedScore * 0.4;
  const improvement =
    ruleComponentBefore > 0
      ? (ruleComponentBefore - ruleComponentAfter) / ruleComponentBefore
      : 0;

  const fluencyScore = evaluateFluency(rewritten);

  const overall =
    (semanticSimilarity * 0.25 +
      Math.max(0, improvement) * 0.45 +
      fluencyScore * 0.30) *
    100;

  const suggestions: string[] = [];
  if (semanticSimilarity < 0.78) {
    suggestions.push(
      '改写后语义偏离较大，建议人工审核核心论点是否保持'
    );
  }
  if (improvement < 0.10 && options.version !== 'conservative') {
    suggestions.push('AIGC率降低幅度不足，建议尝试更激进的改写版本');
  }
  if (fluencyScore < 0.70) {
    suggestions.push('改写后文本通顺度较低，可能存在语法问题');
  }
  const lengthRatio = rewritten.length / original.length;
  if (original.length > 0 && lengthRatio < 0.7) {
    suggestions.push('改写后文本大幅缩短，可能丢失重要信息');
  }
  if (original.length > 0 && lengthRatio > 1.5) {
    suggestions.push('改写后文本大幅扩展，可能存在冗余表达');
  }

  let confidence = 0.88;
  if (options.version === 'conservative') confidence = 0.92;
  if (options.version === 'aggressive') confidence = 0.78;
  if (fluencyScore < 0.70) confidence -= 0.08;
  if (semanticSimilarity < 0.80) confidence -= 0.06;
  if (improvement < 0.05) confidence -= 0.10;
  confidence = Math.max(0.50, Math.min(0.98, confidence));

  return {
    overall: Math.round(Math.max(0, Math.min(100, overall))),
    semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
    aigcScoreImprovement: Math.round(improvement * 1000) / 1000,
    fluencyScore: Math.round(fluencyScore * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    suggestions,
  };
}

/**
 * Diff计算（用于DiffViewer渲染）
 *
 * MVP版本：基于逐字符比对的最长公共子序列简化版
 * P1计划：升级为Myers diff algorithm以获得更好的性能
 *
 * 时间复杂度: O(m×n)，m=原文长度, n=修改文长度
 * 空间复杂度: O(m+n)
 *
 * @param original 原始文本
 * @param modified 修改后文本
 * @returns Diff片段数组
 */
export function computeDiff(
  original: string,
  modified: string
): DiffSegment[] {
  const segments: DiffSegment[] = [];

  const origLines = original.split('');
  const modLines = modified.split('');

  let i = 0;
  let j = 0;
  let equalBuffer = '';
  let deleteBuffer = '';
  let insertBuffer = '';

  const flush = (): void => {
    if (equalBuffer) {
      segments.push({ type: 'equal', value: equalBuffer });
      equalBuffer = '';
    }
    if (deleteBuffer || insertBuffer) {
      if (deleteBuffer && insertBuffer) {
        segments.push({ type: 'replace', value: deleteBuffer });
        segments.push({ type: 'insert', value: insertBuffer });
      } else if (deleteBuffer) {
        segments.push({ type: 'delete', value: deleteBuffer });
      } else {
        segments.push({ type: 'insert', value: insertBuffer });
      }
      deleteBuffer = '';
      insertBuffer = '';
    }
  };

  while (i < origLines.length || j < modLines.length) {
    if (
      i < origLines.length &&
      j < modLines.length &&
      origLines[i] === modLines[j]
    ) {
      flush();
      equalBuffer += origLines[i];
      i++;
      j++;
    } else {
      if (i < origLines.length) deleteBuffer += origLines[i++];
      if (j < modLines.length) insertBuffer += modLines[j++];
    }
  }
  flush();

  return mergeAdjacentSegments(segments);
}

/**
 * 合并相邻的同类型Diff片段
 *
 * @param segments 原始Diff片段数组
 * @returns 合并后的Diff片段数组
 */
function mergeAdjacentSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].type === seg.type
    ) {
      merged[merged.length - 1].value += seg.value;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

/**
 * 改写质量检查（术语保护+基本质量保障）
 *
 * @param original 原始文本
 * @param rewritten 改写后文本
 * @param protectedTerms 受保护术语列表（不得更改）
 * @returns 质量检查结果
 */
export function checkRewriteQuality(
  original: string,
  rewritten: string,
  protectedTerms: string[]
): RewriteQualityCheck {
  const semanticSimilarity = calculateSimilarity(original, rewritten);

  const missingTerms: string[] = [];
  for (const term of protectedTerms) {
    if (!rewritten.includes(term)) {
      missingTerms.push(term);
    }
  }

  const fluencyScore = evaluateFluency(rewritten);

  const suggestions: string[] = [];
  if (semanticSimilarity < 0.78) {
    suggestions.push(
      '改写后语义偏离较大，建议人工审核核心论点是否保持'
    );
  }
  if (missingTerms.length > 0) {
    suggestions.push(
      `以下受保护术语在改写后丢失：${missingTerms.join('、')}`
    );
  }
  if (fluencyScore < 0.72) {
    suggestions.push('改写后文本通顺度较低，可能存在语法问题');
  }
  const lengthRatio =
    original.length > 0 ? rewritten.length / original.length : 0;
  if (lengthRatio < 0.7) {
    suggestions.push('改写后文本大幅缩短，可能丢失重要信息');
  } else if (lengthRatio > 1.5) {
    suggestions.push('改写后文本大幅扩展，可能存在冗余表达');
  }

  const passed =
    semanticSimilarity >= 0.78 &&
    missingTerms.length === 0 &&
    fluencyScore >= 0.68;

  return {
    passed,
    semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
    termProtectionOk: missingTerms.length === 0,
    missingTerms,
    fluencyScore: Math.round(fluencyScore * 1000) / 1000,
    suggestions,
  };
}
