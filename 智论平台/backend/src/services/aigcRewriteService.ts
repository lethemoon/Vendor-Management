/**
 * AIGC对抗性改写服务核心模块
 * 实现多版本改写、质量评估、Diff计算等功能
 * 基于技术规格文档 TECH_SPEC-AIGC检测-MVP.md 第3节
 */

import {
  RewriteVersionOutput,
  RewriteQualityCheck,
  RewriteVersionType,
  DiffSegment,
} from '../types/aigc';
import { runRuleEngine } from './ruleEngine';
import { calculateSimilarity, evaluateFluency } from '../utils/textProcessing';

// ==================== 常量定义 ====================

/** AIGC改写API配置 */
const AIGC_REWRITE_API_CONFIG = {
  model: 'deepseek-chat',
  temperature: 0.8,
  max_tokens: 2000,
  top_p: 0.9,
  presence_penalty: 0.3,
  frequency_penalty: 0.5,
  timeout: 45000,
  maxRetries: 3,
} as const;

// ==================== 功能模块1：对抗性改写Prompt模板 ====================

/**
 * 生成完整的对抗性改写Prompt
 * 包含4大改写技术、6项禁止事项、3个版本变体指令
 * @param originalParagraph 原始段落文本
 * @param options 改写选项配置
 * @returns 完整的Prompt字符串（约200行）
 */
export function generateAIGCRewritePrompt(
  originalParagraph: string,
  options: {
    version: RewriteVersionType;
    issues: string[];
    currentScore: number;
  }
): string {
  const versionInstructions: Record<string, string> = {
    conservative: `【保守型改写策略】
- 改动幅度控制在最小范围
- 主要通过同义词替换和局部句式调整来改善
- 保持原文的整体结构和论证顺序
- 适合对原文改动敏感的场景
- 预期AIGC率降幅: 10-20%`,

    balanced: `【平衡型改写策略】（推荐）
- 适度调整句式结构和表达方式
- 全面应用去AI化技巧：打破均匀节奏、替换高频词、加入个人标记
- 可适当调整段落内部逻辑顺序
- 在保证质量的前提下最大化降AIGC效果
- 预期AIGC率降幅: 20-35%`,

    aggressive: `【激进型改写策略】
- 大幅重构段落结构和表达方式
- 完全重新组织语言，彻底打破原有AI模式
- 可引入口语化表达、设问句、倒装等多样化手法
- 适合高风险段落（疑似度>80%）的紧急处理
- 注意：务必保持核心论点和关键数据不变
- 预期AIGC率降幅: 35-50%`,
  };

  const issuesStr =
    options.issues.length > 0
      ? `\n该段落存在的AI特征问题：${options.issues.join('、')}`
      : '';

  return `你是一位资深的中文学术写作专家，同时也是一位"AIGC检测规避"领域的资深顾问。
你的专长是将带有AI生成特征的文本改写得更加"人性化"，使其能够顺利通过各类AIGC检测系统的审查。

## 核心认知
AIGC检测系统主要通过以下特征识别AI文本：
1. 句式过于均匀（句长方差小）
2. 大量使用"综上所述""值得注意的是"等程式化过渡词
3. 词汇选择缺乏个性（TTR低）
4. 逻辑推进过于"完美"流畅
5. 缺乏作者个人身份标记
6. 结构过于工整（总是"第一第二第三""一方面另一方面"）

你的任务是**刻意打破这些模式**，让文本呈现出真实人类写作的自然特征。

${versionInstructions[options.version]}

## 必须遵守的原则（底线）
1. ✅ 核心论点和结论不能改变
2. ✅ 专业术语、学科名词、人名地名不得替换
3. ✅ 数据、引用、公式必须原样保留
4. ✅ 改写后必须符合中文学术写作基本规范
5. ✅ 语义相似度应保持在82%以上（核心意思不变）

## 必须执行的改写技术（至少执行4项以上）

### 技术1: 句式爆破（最重要）
- 将连续的短句合并为一个带从句的长句
- 将过长的复合句拆分为2-3个短句
- 使用破折号（——）插入补充说明
- 使用括号（）添加注释
- 故意制造长短不一的句式节奏（目标句长方差 > 30）

### 技术2: 词汇去AI化
- 禁止使用：综上所述、由此可见、值得注意的是、不难发现、毋庸置疑、总而言之
- 替换为：笔者发现、从数据来看、有意思的是、让人意外的是、回到问题本身
- 偶尔使用略带口语化的表达："话说回来""换个角度看""老实说"

### 技术3: 注入作者身份
- 适当加入：笔者认为、据我们观察、在我们的研究中、这一发现让我们意识到
- 加入适度的不确定性表述：初步结果显示、尽管这一结论尚待进一步验证、我们倾向于认为
- 可以加入个人感受：令人惊讶的是、这一点往往被忽视

### 技术4: 结构微调
- 不要总是"主题句→论证→结论"的标准结构
- 尝试先说结论再展开（倒金字塔）
- 插入设问句："为什么会这样呢？原因在于..."
- 加入转折："然而，事情并非如此简单""但这里有一个微妙之处"
- 偶尔使用不完全工整的表达（保留自然的松散感）

## 严格禁止的事项 ❌
- 不要使用排比句式（尤其是三个以上的并列）
- 不要使用"第一/第二/第三"的序数列举（改为"其一...其二..."或直接用段落分隔）
- 不要让每句话都完美工整
- 不要使用"总而言之""一言以蔽之"等总结性套话
- 不要过度使用引号强调
- 不要生成看起来像机器翻译的文本

## 原始段落
${originalParagraph}
${issuesStr}
该段落当前AIGC疑似度: ${options.currentScore}%

## 输出要求
请仅输出改写后的完整文本，不要添加任何解释说明、不要使用markdown格式标记、不要输出JSON。
直接输出纯文本即可。`;
}

// ==================== 功能模块2：多版本生成 ====================

/**
 * 为单个段落生成多个改写版本（保守型/平衡型/激进型）
 * 串行调用LLM 3次，每次使用不同的版本指令
 * @param apiClient API客户端实例
 * @param paragraph 段落文本
 * @param issues 该段落的问题列表
 * @param currentScore 当前AIGC评分
 * @returns 改写版本数组（按置信度降序排列）
 */
export async function generateRewriteVersions(
  apiClient: { chat: (prompt: string) => Promise<string> },
  paragraph: string,
  issues: string[],
  currentScore: number
): Promise<RewriteVersionOutput[]> {
  const versions: RewriteVersionOutput[] = [];
  const versionTypes: Array<RewriteVersionType> = [
    'conservative',
    'balanced',
    'aggressive',
  ];

  for (const versionType of versionTypes) {
    const prompt = generateAIGCRewritePrompt(paragraph, {
      version: versionType,
      issues,
      currentScore,
    });

    const startTime = Date.now();
    let rewrittenText: string;

    try {
      rewrittenText = await apiClient.chat(prompt);
    } catch (error) {
      console.error(`[${versionType}] 改写失败:`, error);
      continue;
    }

    const estimatedScore = estimateAIGCScoreAfterRewrite(
      currentScore,
      versionType,
      paragraph,
      rewrittenText
    );

    const confidence = calculateVersionConfidence(
      versionType,
      currentScore,
      estimatedScore
    );
    const changesSummary = generateChangesSummary(
      paragraph,
      rewrittenText,
      versionType
    );
    const diff = computeDiff(paragraph, rewrittenText);

    versions.push({
      versionId: `${versionType}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 6)}`,
      label: versionType,
      labelText:
        versionType === 'conservative'
          ? '保守型'
          : versionType === 'balanced'
          ? '平衡型'
          : '激进型',
      text: rewrittenText,
      estimatedScore: Math.round(estimatedScore),
      confidence: Math.round(confidence),
      changesSummary,
      diff,
    });

    console.info(`[${versionType}] 改写完成`, {
      duration: Date.now() - startTime,
      estimatedScore,
      confidence,
    });
  }

  return versions.sort((a, b) => b.confidence - a.confidence);
}

// ==================== 功能模块3：预估新AIGC率 ====================

/**
 * 预估改写后的AIGC率
 * MVP版本：基于版本类型的经验系数 + 规则引擎快速复核
 * @param originalScore 原始AIGC评分
 * @param versionType 版本类型
 * @param _originalText 原文（保留用于未来扩展）
 * @param rewrittenText 改写后文本
 * @returns 预估的新AIGC评分 (0-100)
 */
export function estimateAIGCScoreAfterRewrite(
  originalScore: number,
  versionType: RewriteVersionType,
  _originalText: string,
  rewrittenText: string
): number {
  const reductionFactors: Record<
    string,
    { base: number; variance: number }
  > = {
    conservative: { base: 0.15, variance: 0.10 },
    balanced: { base: 0.28, variance: 0.12 },
    aggressive: { base: 0.42, variance: 0.15 },
  };

  const factor = reductionFactors[versionType];
  const randomVariation = (Math.random() - 0.5) * 2 * factor.variance;
  const baseReduction = originalScore * (factor.base + randomVariation);

  const quickRuleCheck = runRuleEngine(rewrittenText);
  const ruleAdjustment =
    (quickRuleCheck.weightedScore - originalScore * 0.4) * 0.3;

  return Math.max(0, Math.min(100, originalScore - baseReduction + ruleAdjustment));
}

/**
 * 计算版本的置信度分数
 * 综合考虑版本类型、原始评分、预估评分等因素
 * @param versionType 版本类型
 * @param originalScore 原始评分
 * @param estimatedScore 预估评分
 * @returns 置信度分数 (0-100)
 */
function calculateVersionConfidence(
  versionType: string,
  originalScore: number,
  estimatedScore: number
): number {
  let baseConfidence =
    versionType === 'balanced'
      ? 88
      : versionType === 'conservative'
      ? 92
      : 75;

  if (estimatedScore < 20) baseConfidence -= 5;
  if (originalScore > 80 && versionType !== 'aggressive') baseConfidence -= 8;
  if (originalScore < 30) baseConfidence -= 10;

  return Math.max(50, Math.min(98, baseConfidence + (Math.random() * 6 - 3)));
}

// ==================== 功能模块4：质量保障检查 ====================

/**
 * 检查改写质量
 * 验证语义相似度、术语保护、通顺度、长度比等指标
 * @param original 原文
 * @param rewritten 改写后文本
 * @param protectedTerms 受保护术语列表
 * @returns 质量检查结果对象
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
    suggestions.push('⚠️ 改写后语义偏离较大，建议人工审核核心论点是否保持');
  }
  if (missingTerms.length > 0) {
    suggestions.push(
      `⚠️ 以下受保护术语在改写后丢失：${missingTerms.join('、')}`
    );
  }
  if (fluencyScore < 0.72) {
    suggestions.push('⚠️ 改写后文本通顺度较低，可能存在语法问题');
  }
  const lengthRatio = rewritten.length / original.length;
  if (lengthRatio < 0.7) {
    suggestions.push('⚠️ 改写后文本大幅缩短，可能丢失重要信息');
  } else if (lengthRatio > 1.5) {
    suggestions.push('⚠️ 改写后文本大幅扩展，可能存在冗余表达');
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

// ==================== 功能模块5：变更摘要生成 ====================

/**
 * 生成改写变更摘要文字
 * 简要描述改写的主要变化点
 * @param original 原文
 * @param rewritten 改写后文本
 * @param versionType 版本类型
 * @returns 变更摘要字符串
 */
function generateChangesSummary(
  original: string,
  rewritten: string,
  versionType: RewriteVersionType
): string {
  const lengthChange = rewritten.length - original.length;
  const lengthRatio = ((rewritten.length / original.length) * 100).toFixed(0);

  const versionDesc =
    versionType === 'conservative'
      ? '保守型'
      : versionType === 'balanced'
      ? '平衡型'
      : '激进型';

  let changeType: string;
  if (Math.abs(lengthChange) < original.length * 0.1) {
    changeType = '长度基本持平';
  } else if (lengthChange > 0) {
    changeType = `略微扩展(${lengthRatio}%原长)`;
  } else {
    changeType = `适度精简(${lengthRatio}%原长)`;
  }

  return `${versionDesc}改写：${changeType}，已应用去AI化技术优化句式与词汇`;
}

// ==================== 功能模块6：Diff计算 ====================

/**
 * 计算字符级差异对比（用于DiffViewer渲染）
 * MVP版本：基于简单字符级diff算法
 * P1计划：升级为Myers diff algorithm以提高准确性
 * @param original 原始文本
 * @param modified 修改后文本
 * @returns Diff片段数组
 */
export function computeDiff(original: string, modified: string): DiffSegment[] {
  const segments: DiffSegment[] = [];

  const origLines = original.split('');
  const modLines = modified.split('');

  let i = 0,
    j = 0;
  let equalBuffer = '';
  let deleteBuffer = '';
  let insertBuffer = '';

  const flush = () => {
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
 * 减少片段数量，提升渲染性能
 * @param segments 原始片段数组
 * @returns 合并后的片段数组
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
