/**
 * AIGC检测服务核心模块
 * 实现规则引擎调用、LLM辅助检测、综合评分等功能
 * 基于技术规格文档 TECH_SPEC-AIGC检测-MVP.md 第2.3-2.4节
 */

import {
  ParagraphResult,
  RuleEngineResult,
  LLMDetectResult,
  AIGCRiskLevel,
} from '../types/aigc';
import { runRuleEngine } from './ruleEngine';
import { AIServiceError } from '../types/paper';

// ==================== 常量定义 ====================

/** AIGC检测专用API配置 */
const AIGC_DETECT_API_CONFIG = {
  model: 'deepseek-chat',
  temperature: 0.1,
  max_tokens: 4000,
  top_p: 0.95,
  presence_penalty: 0,
  frequency_penalty: 0,
  timeout: 30000,
  maxRetries: 3,
} as const;

// ==================== 功能模块1：Prompt模板生成 ====================

/**
 * 生成AIGC检测的LLM Prompt
 * 包含完整的评分标准、判断依据和输出格式要求
 * @param paragraphs 待检测段落数组（含索引和文本）
 * @returns 完整的Prompt字符串
 */
export function generateAIGCDetectPrompt(
  paragraphs: Array<{ index: number; text: string }>
): string {
  const paragraphsText = paragraphs
    .map(p => `【段落${p.index}】\n${p.text}`)
    .join('\n\n');

  return `你是一个专业的AIGC文本检测器，专门识别中文AI生成内容。请对以下${paragraphs.length}个文本段落进行逐一分析。

## 评分标准（每个段落独立打分，0-100整数分）
- 0-20: 几乎确定为人类撰写
- 21-40: 可能是人类撰写，但有轻微AI特征
- 41-60: 有较明显AI生成特征
- 61-80: 大概率为AI生成
- 81-100: 几乎确定为AI生成

## 判断依据（请检查以下维度）
1. **句式均匀度**: 句子长度是否过于整齐划一
2. **过渡词使用**: 是否存在"综上所述""值得注意的是""不难发现"等AI高频表达
3. **词汇多样性**: 是否缺乏个性化的词汇选择
4. **逻辑流畅度**: 推理过程是否过于"完美"和程式化
5. **观点表达**: 是否缺乏作者个人立场或主观判断
6. **结构化程度**: 是否呈现过于工整的"总分总"或"第一第二第三"结构

## 待检测文本
${paragraphsText}

## 输出要求
请严格以JSON数组格式输出，不要添加任何其他文字：
[
  {
    "index": 段落序号(数字),
    "score": 0-100的疑似度分数(数字),
    "evidence": ["具体的AI写作特征证据1", "证据2", "证据3"],
    "reasoning": "简短的推理过程(不超过50字)"
  },
  ...（每个段落一个对象）
]`;
}

// ==================== 功能模块2：DeepSeek API调用 ====================

/**
 * 调用DeepSeek API进行AIGC检测
 * 使用专用配置：低温度确保一致性，高token上限支持多段落
 * @param apiClient API客户端实例（需实现chat方法）
 * @param paragraphs 待检测段落数组
 * @returns LLM检测结果数组
 * @throws {AIServiceError} API调用失败时抛出
 */
export async function callLLMDetect(
  apiClient: { chat: (prompt: string) => Promise<string> },
  paragraphs: Array<{ index: number; text: string }>
): Promise<LLMDetectResult[]> {
  const prompt = generateAIGCDetectPrompt(paragraphs);

  let rawResponse: string;
  try {
    rawResponse = await apiClient.chat(prompt);
  } catch (error) {
    throw new AIServiceError(
      `LLM检测调用失败: ${(error as Error).message}`,
      'DETECTION_FAILED' as any,
      true,
      error as Error
    );
  }

  return parseLLMDetectResponse(rawResponse, paragraphs.length);
}

// ==================== 功能模块3：结果解析与容错 ====================

/**
 * 解析LLM返回的JSON响应
 * 包含容错处理：异常值钳制、字段缺失补全、格式异常捕获
 * @param raw LLM原始响应文本
 * @param expectedCount 预期的段落数量
 * @returns 结构化的检测结果数组
 * @throws {AIServiceError} JSON解析失败时抛出PARSE_ERROR
 */
export function parseLLMDetectResponse(raw: string, expectedCount: number): LLMDetectResult[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new AIServiceError(
      'LLM返回格式异常：未找到JSON数组',
      'PARSE_ERROR' as any,
      false
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AIServiceError(
      'LLM返回JSON解析失败',
      'PARSE_ERROR' as any,
      false
    );
  }

  if (!Array.isArray(parsed)) {
    throw new AIServiceError('LLM返回非数组格式', 'PARSE_ERROR' as any, false);
  }

  return parsed.map((item: unknown, idx: number) => {
    const obj = item as Record<string, unknown>;
    return {
      index: typeof obj.index === 'number' ? obj.index : idx + 1,
      score: clampScore(obj.score),
      evidence: Array.isArray(obj.evidence) ? obj.evidence.slice(0, 3) : [],
      reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    };
  }).slice(0, expectedCount);
}

/**
 * 钳制分数到合法范围 [0, 100]
 * 异常值（NaN、负数、超范围）使用默认值50
 * @param score 输入分数值
 * @returns 钳制后的有效分数
 */
function clampScore(score: unknown): number {
  const num = Number(score);
  if (isNaN(num) || num < 0) return 50;
  if (num > 100) return 100;
  return Math.round(num);
}

// ==================== 功能模块4：综合评分计算 ====================

/**
 * 计算最终综合得分
 * 加权融合规则引擎得分(40%)和LLM检测得分(60%)
 * 公式：final = rule_score × 0.4 + llm_score × 0.6
 * @param ruleScore 规则引擎得分 (0-100)
 * @param llmScore LLM检测得分 (0-100)
 * @returns 综合得分 (0-100)
 */
export function computeFinalScore(ruleScore: number, llmScore: number): number {
  const final = ruleScore * 0.4 + llmScore * 0.6;
  return Math.round(Math.max(0, Math.min(100, final)));
}

/**
 * 映射分数到风险等级
 * 四级分类：low/medium/medium-high/high
 * @param score 综合得分 (0-100)
 * @returns 风险等级枚举值
 */
export function mapRiskLevel(score: number): AIGCRiskLevel {
  if (score <= 20) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 70) return 'medium-high';
  return 'high';
}

// ==================== 功能模块5：自然语言摘要生成 ====================

/**
 * 根据检测结果生成自然语言摘要
 * 提供4档不同风险水平的描述性文字
 * @param paragraphs 段落结果数组
 * @param overallScore 总体评分
 * @returns 摘要文本字符串
 */
export function generateSummary(
  paragraphs: ParagraphResult[],
  overallScore: number
): string {
  const highRiskCount = paragraphs.filter(p => p.riskLevel === 'high').length;
  const mediumHighCount = paragraphs.filter(p => p.riskLevel === 'medium-high').length;
  const totalParagraphs = paragraphs.length;

  const riskPercent = overallScore.toFixed(1);

  if (overallScore >= 70) {
    return `本文整体AIGC疑似率较高（${riskPercent}%），共${totalParagraphs}个段落中有${highRiskCount}个高风险和${mediumHighCount}个中等偏高风险段落。建议重点优化标记为红色的段落，采用激进型改写策略以快速降低疑似率。`;
  } else if (overallScore >= 40) {
    return `本文AIGC疑似率为${riskPercent}%，处于中等水平。其中${highRiskCount}个段落需重点关注，${mediumHighCount}个段落建议选择性优化。推荐使用平衡型改写策略逐步改善。`;
  } else if (overallScore >= 20) {
    return `本文AIGC疑似率为${riskPercent}%，整体较为安全。仍有${highRiskCount + mediumHighCount}个段落可进一步优化以达到更低的风险水平。`;
  } else {
    return `恭喜！本文AIGC疑似率仅为${riskPercent}%，处于安全范围内，被主流AIGC检测系统标记的概率较低。如有个别段落仍不放心，可选择性地进行微调优化。`;
  }
}

// ==================== 功能模块6：段落级结果构建 ====================

/**
 * 构建单个段落的完整检测结果
 * 整合规则引擎细分得分和LLM证据
 * @param index 段落索引
 * @param text 段落文本
 * @param finalScore 综合得分
 * @param ruleResult 规则引擎结果
 * @param llmEvidence LLM证据（可选）
 * @param startOffset 起始偏移量
 * @returns 完整的段落结果对象
 */
export function buildParagraphResult(
  index: number,
  text: string,
  finalScore: number,
  ruleResult: RuleEngineResult,
  llmEvidence?: string[],
  startOffset: number = 0
): ParagraphResult {
  const preview =
    text.length > 100 ? text.substring(0, 100) + '...' : text;

  return {
    index,
    preview,
    fullText: text,
    score: finalScore,
    riskLevel: mapRiskLevel(finalScore),
    issues: [...ruleResult.issues],
    wordCount: text.replace(/\s/g, '').length,
    startOffset,
    endOffset: startOffset + text.length,
    ruleBreakdown: {
      ttr: ruleResult.ttr.score,
      sentenceVariance: ruleResult.sentenceVariance.score,
      vocabulary: ruleResult.vocabulary.score,
      transitions: ruleResult.transitions.score,
      passiveVoice: ruleResult.passiveVoice.score,
    },
    llmEvidence,
  };
}
