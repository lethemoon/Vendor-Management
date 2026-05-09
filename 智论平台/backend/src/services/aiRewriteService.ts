/**
 * AI改写服务核心模块
 * 实现论文降重功能的完整AI引擎
 *
 * 功能模块：
 * A - Prompt模板管理系统
 * B - DeepSeek API调用封装
 * C - 质量评估系统
 * D - 成本统计系统
 */

import {
  RewriteOptions,
  RewriteStrength,
  RewriteStyle,
  RewriteResult,
  RewriteVersion,
  Change,
  QualityScore,
  TokenUsage,
  DailyUsage,
  QuotaCheckResult,
  DeepSeekConfig,
  AIServiceError,
  AIServiceErrorCode,
  OperationType,
  CostEstimate,
} from '../types/paper';

import {
  estimateTokens,
  generateContentHash,
  calculateSimilarity,
  calculateVariance,
} from '../utils/textProcessing';

// ==================== 常量定义 ====================

/** 改写强度映射表 */
const STRENGTH_MAP: Record<RewriteStrength, string> = {
  light: '轻度（同义词替换为主，句式微调）',
  medium: '中度（同义词替换+句式重组，适度调整段落结构）',
  heavy: '重度（大幅句式重组+段落重构，最大化降重效果）',
};

/** 写作风格映射表 */
const STYLE_MAP: Record<RewriteStyle, string> = {
  academic: '学术风格（严谨、客观、引用规范）',
  formal: '正式风格（规范、专业、商务化）',
  concise: '简洁风格（精炼、直白、去除冗余）',
};

/** 每日免费配额限制 */
const DAILY_FREE_QUOTA = {
  inputTokens: 50000,
  outputTokens: 150000,
  maxCost: 10,
} as const;

/** 成本估算配置表 */
const COST_ESTIMATES: Record<string, CostEstimate> = {
  perRewrite: { inputTokens: 300, outputTokens: 800, cost: 0.06 },
  perAnalysis: { inputTokens: 7000, outputTokens: 1000, cost: 0.08 },
  fullDedup: { inputTokens: 35000, outputTokens: 45000, cost: 0.35 },
};

/** 默认DeepSeek配置 */
const DEFAULT_DEEPSEEK_CONFIG: Omit<DeepSeekConfig, 'apiKey'> = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30000,
  maxRetries: 3,
};

/** 重试延迟配置（毫秒）- 指数退避 */
const RETRY_DELAYS = [1000, 2000, 4000];

/** 并发控制：最大并行请求数 */
const MAX_CONCURRENT_REQUESTS = 3;

/** Prompt缓存Map（memoization） */
const promptCache = new Map<string, string>();

// ==================== 功能模块A：Prompt模板管理系统 ====================

/**
 * 将保护术语注入到Prompt中
 * @param terms 术语列表
 * @returns 格式化的术语保护指令字符串
 */
export function formatProtectedTerms(terms: string[]): string {
  if (!terms || terms.length === 0) {
    return '无';
  }

  const termList = terms.map(term => `- ${term}`).join('\n');

  return `【保护术语】以下专有名词在改写时必须原样保留，不得替换或修改：\n${termList}\n请确保这些术语在改写后的文本中完整出现且含义不变。`;
}

/**
 * 生成改写Prompt
 * @param originalText 原文
 * @param options 改写选项
 * @returns 完整的Prompt字符串
 */
export function generateRewritePrompt(
  originalText: string,
  options: {
    strength: RewriteStrength;
    style: RewriteStyle;
    protectedTerms: string[];
  }
): string {
  const cacheKey = `rewrite_${generateContentHash(
    JSON.stringify({ text: originalText, options })
  )}`;

  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  const strengthDesc = STRENGTH_MAP[options.strength];
  const styleDesc = STYLE_MAP[options.style];
  const protectedTermsStr = formatProtectedTerms(options.protectedTerms);

  const prompt = `你是一位专业的学术写作助手。请根据以下规则对给定文本进行智能改写：

【改写目标】
- 保持原文的核心含义和学术观点不变
- 降低文本的重复率（与已有文献的相似度）
- 改写后的文本应该通顺自然、符合学术规范
- 避免使用过于口语化的表达

【改写参数】
- 改写强度：${strengthDesc}
- 写作风格：${styleDesc}
- 保护术语：${protectedTermsStr}

【原文】
${originalText}

【输出要求】
1. 输出改写后的完整文本
2. 标注修改的位置和类型（同义词替换/句式重组/段落重构）
3. 提供改写置信度评分（0-100分）`;

  promptCache.set(cacheKey, prompt);

  return prompt;
}

/**
 * 为单个段落生成多个改写版本的Prompt集合
 * 三个版本的差异：
 * - 版本A - 保守型：最小程度修改，保持原有句式结构
 * - 版本B - 平衡型：适度调整，平衡降重效果与语义保持
 * - 版本C - 激进型：大幅重构，最大化降低相似度
 * @param paragraph 单个段落文本
 * @param options 改写选项
 * @param versionCount 版本数量（默认3）
 * @returns Prompt数组，每个元素对应一个版本
 */
export function generateVersionPrompts(
  paragraph: string,
  options: RewriteOptions,
  versionCount: number = 3
): string[] {
  const prompts: string[] = [];
  const versionStrategies = [
    {
      name: '保守型',
      instruction:
        '采用保守策略进行改写：\n' +
        '- 最小程度修改原文\n' +
        '- 保持原有句式结构和段落组织\n' +
        '- 主要使用同义词替换\n' +
        '- 仅对明显重复的表达进行调整\n' +
        '- 适合需要保持原文风格的场景',
    },
    {
      name: '平衡型',
      instruction:
        '采用平衡策略进行改写：\n' +
        '- 适度调整原文表达\n' +
        '- 平衡降重效果与语义保持\n' +
        '- 允许句式重组和语序调整\n' +
        '- 可适当增加过渡语句\n' +
        '- 在保证质量的前提下降低重复率',
    },
    {
      name: '激进型',
      instruction:
        '采用激进策略进行改写：\n' +
        '- 大幅重构原文表达方式\n' +
        '- 完全重新表述核心观点\n' +
        '- 最大化降低与原文的相似度\n' +
        '- 可重新组织段落逻辑\n' +
        '- 适合需要显著降低重复率的场景',
    },
  ];

  for (let i = 0; i < Math.min(versionCount, versionStrategies.length); i++) {
    const strategy = versionStrategies[i];
    const basePrompt = generateRewritePrompt(paragraph, {
      strength: options.strength,
      style: options.style,
      protectedTerms: options.protectedTerms,
    });

    const versionPrompt =
      basePrompt.replace(
        '【改写目标】',
        `【改写策略 - ${strategy.name}版本】\n${strategy.instruction}\n\n【改写目标】`
      );

    prompts.push(versionPrompt);
  }

  return prompts;
}

/**
 * 清除Prompt缓存
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

// ==================== 功能模块B：DeepSeek API调用封装 ====================

/**
 * DeepSeek API客户端类
 * 封装API调用、错误处理、重试机制
 */
export class DeepSeekClient {
  private config: DeepSeekConfig;

  constructor(config: DeepSeekConfig) {
    this.config = {
      ...DEFAULT_DEEPSEEK_CONFIG,
      ...config,
    };
  }

  /**
   * 调用DeepSeek聊天完成接口
   * @param prompt 用户Prompt
   * @param systemMessage 系统消息（可选）
   * @returns AI生成的文本
   * @throws {AIServiceError} API调用失败时抛出
   */
  async chat(prompt: string, systemMessage?: string): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this._executeChatRequest(prompt, systemMessage);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AIServiceError && !error.retryable) {
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          await this._delay(RETRY_DELAYS[attempt]);
        }
      }
    }

    throw new AIServiceError(
      `API调用失败，已重试${this.config.maxRetries}次: ${lastError?.message}`,
      'UNKNOWN',
      true,
      lastError
    );
  }

  /**
   * 流式调用（用于SSE）
   * @param prompt 用户Prompt
   * @param onChunk 流式回调函数
   * @param systemMessage 系统消息（可选）
   */
  async chatStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    systemMessage?: string
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this._executeStreamRequest(prompt, onChunk, systemMessage);
        return;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AIServiceError && !error.retryable) {
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          await this._delay(RETRY_DELAYS[attempt]);
        }
      }
    }

    throw new AIServiceError(
      `流式API调用失败，已重试${this.config.maxRetries}次: ${lastError?.message}`,
      'UNKNOWN',
      true,
      lastError
    );
  }

  /**
   * 执行实际的HTTP请求
   */
  private async _executeChatRequest(
    prompt: string,
    systemMessage?: string
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }

    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      await this._handleResponseErrors(response);

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new AIServiceError(
          'API返回数据格式异常',
          'UNKNOWN',
          false
        );
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIServiceError(
          '请求超时',
          'TIMEOUT',
          true
        );
      }

      throw new AIServiceError(
        `网络请求失败: ${(error as Error).message}`,
        'UNKNOWN',
        true,
        error as Error
      );
    }
  }

  /**
   * 执行流式HTTP请求
   */
  private async _executeStreamRequest(
    prompt: string,
    onChunk: (chunk: string) => void,
    systemMessage?: string
  ): Promise<void> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }

    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 2);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      await this._handleResponseErrors(response);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIServiceError('无法获取响应流', 'UNKNOWN', false);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));

              if (
                data.choices &&
                data.choices[0]?.delta?.content
              ) {
                onChunk(data.choices[0].delta.content);
              }
            } catch {
              // 忽略解析错误，继续处理下一行
            }
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIServiceError(
          '流式请求超时',
          'TIMEOUT',
          true
        );
      }

      throw new AIServiceError(
        `流式请求失败: ${(error as Error).message}`,
        'UNKNOWN',
        true,
        error as Error
      );
    }
  }

  /**
   * 处理HTTP响应错误
   */
  private async _handleResponseErrors(response: Response): Promise<void> {
    if (response.ok) return;

    let errorMessage = 'API请求失败';

    try {
      const errorData = await response.json();
      errorMessage =
        errorData?.error?.message || errorMessage;
    } catch {
      // 忽略JSON解析错误
    }

    switch (response.status) {
      case 401:
        throw new AIServiceError(
          `认证失败: ${errorMessage}`,
          'AUTH_FAILED',
          false
        );
      case 429:
        throw new AIServiceError(
          `请求过于频繁: ${errorMessage}`,
          'RATE_LIMITED',
          true
        );
      default:
        throw new AIServiceError(
          `${errorMessage} (HTTP ${response.status})`,
          'UNKNOWN',
          response.status >= 500
        );
    }
  }

  /**
   * 延迟工具函数
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<DeepSeekConfig> {
    return { ...this.config };
  }
}

// ==================== 功能模块C：质量评估系统 ====================

/** 高风险学术表达模式列表 */
const HIGH_RISK_PATTERNS: RegExp[] = [
  /研究表明/i,
  /众所周知/i,
  /综上所述/i,
  /可以看出/i,
  /由此可见/i,
  /显然/i,
  /毋庸置疑/i,
  /毫无疑问/i,
  /大量研究表明/i,
  /现有文献表明/i,
  /前人研究指出/i,
  /学术界普遍认为/i,
  /一般来说/i,
  /总体而言/i,
  /从某种意义上说/i,
];

/** 通顺度检测规则 */
const FLUENCY_ISSUES: Array<{
  pattern: RegExp;
  penalty: number;
  description: string;
}> = [
  { pattern: /.{0,10}[，,]{2,}/g, penalty: 10, description: '连续逗号' },
  {
    pattern: /[。！？]\s*[^\n。！？]/g,
    penalty: 5,
    description: '标点后缺少空格',
  },
  { pattern: /\s{3,}/g, penalty: 8, description: '多余空格' },
  {
    pattern: /[a-zA-Z]{20,}/g,
    penalty: 5,
    description: '过长英文单词串',
  },
];

/**
 * 计算两个文本的语义相似度
 * MVP版本：使用Levenshtein距离归一化（后续可升级为嵌入模型）
 * @param text1 文本1
 * @param text2 文本2
 * @returns 相似度分数 (0-1)
 */
function calculateSemanticSimilarity(text1: string, text2: string): number {
  return calculateSimilarity(text1, text2);
}

/**
 * 预估文本的重复率
 * 基于规则引擎的简单估算（MVP版本）
 * 检测常见学术表达模式的重复风险
 * @param text 待评估文本
 * @returns 预估重复率 (0-1)
 */
function estimatePlagiarismRate(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  let riskScore = 0;

  HIGH_RISK_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) {
      riskScore += 0.05;
    }
  });

  const sentences = text.split(/[。！？]/g).filter(s => s.trim().length > 0);

  if (sentences.length > 0) {
    const lengths = sentences.map(s => s.trim().length);
    const lengthVariance = calculateVariance(lengths);
    const normalizedVariance = Math.min(lengthVariance / 1000, 1);

    riskScore += (1 - normalizedVariance) * 0.3;
  }

  return Math.min(1, Math.max(0, riskScore));
}

/**
 * 评估文本通顺度
 * 基于规则的流畅度检测
 * @param text 待评估文本
 * @returns 通顺度分数 (0-1)
 */
function evaluateFluency(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  let score = 100;

  FLUENCY_ISSUES.forEach(({ pattern, penalty }) => {
    const matches = text.match(pattern);
    if (matches) {
      score -= penalty * matches.length;
    }
  });

  const sentences = text
    .split(/[。！？]/)
    .filter(s => s.trim().length > 0);

  if (sentences.length > 0) {
    const avgLength =
      sentences.reduce((sum, s) => sum + s.trim().length, 0) /
      sentences.length;

    if (avgLength < 5) {
      score -= 15;
    } else if (avgLength > 200) {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score)) / 100;
}

/**
 * 生成改进建议
 * @param original 原文
 * @param rewritten 改写后文本
 * @param qualityScores 质量评分详情
 * @returns 建议字符串数组
 */
function generateSuggestions(
  original: string,
  rewritten: string,
  qualityScores: {
    semanticSimilarity: number;
    plagiarismEstimate: number;
    fluencyScore: number;
  }
): string[] {
  const suggestions: string[] = [];

  if (qualityScores.semanticSimilarity > 0.95) {
    suggestions.push('改写幅度过小，建议使用更强的改写强度以有效降低重复率');
  } else if (qualityScores.semanticSimilarity < 0.5) {
    suggestions.push('改写幅度过大，可能导致原文学术观点发生偏移，建议人工审核');
  }

  if (qualityScores.plagiarismEstimate > 0.5) {
    suggestions.push('预估重复率仍然较高，建议进一步优化或选择更激进的改写策略');
  }

  if (qualityScores.fluencyScore < 0.7) {
    suggestions.push('文本通顺度较低，可能存在语法问题或表达不自然，建议人工润色');
  }

  if (original.length > 0 && rewritten.length > 0) {
    const lengthRatio = rewritten.length / original.length;

    if (lengthRatio < 0.7) {
      suggestions.push('改写后文本大幅缩短，可能丢失重要信息，请检查内容完整性');
    } else if (lengthRatio > 1.5) {
      suggestions.push('改写后文本大幅扩展，可能存在冗余表达，建议适当精简');
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('改写质量良好，无明显问题');
  }

  return suggestions;
}

/**
 * 评估改写质量（综合评分0-100）
 * 综合考虑语义相似度、重复率和通顺度
 * @param original 原文
 * @param rewritten 改写后文本
 * @returns 质量评分对象
 */
export async function evaluateRewriteQuality(
  original: string,
  rewritten: string
): Promise<QualityScore> {
  const semanticSimilarity = calculateSemanticSimilarity(original, rewritten);
  const plagiarismEstimate = estimatePlagiarismRate(rewritten);
  const fluencyScore = evaluateFluency(rewritten);

  const overallScore =
    (semanticSimilarity * 0.3 +
      (1 - plagiarismEstimate) * 0.4 +
      fluencyScore * 0.3) *
    100;

  const confidence = Math.min(
    1,
    (original.length + rewritten.length) / 1000
  );

  const suggestions = generateSuggestions(rewritten, rewritten, {
    semanticSimilarity,
    plagiarismEstimate,
    fluencyScore,
  });

  return {
    overall: Math.round(overallScore * 100) / 100,
    semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
    plagiarismEstimate: Math.round(plagiarismEstimate * 1000) / 1000,
    fluencyScore: Math.round(fluencyScore * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
    suggestions,
  };
}

// ==================== 功能模块D：成本统计系统 ====================

/**
 * 使用量追踪器类
 * 负责记录和查询用户的Token使用情况
 */
export class UsageTracker {
  private usageRecords: Map<string, TokenUsage[]> = new Map();

  /**
   * 记录一次API调用
   * @param userId 用户ID
   * @param usage Token使用记录
   */
  async recordUsage(userId: string, usage: TokenUsage): Promise<void> {
    const userRecords = this.usageRecords.get(userId) || [];
    userRecords.push(usage);
    this.usageRecords.set(userId, userRecords);
  }

  /**
   * 获取用户今日使用量
   * @param userId 用户ID
   * @returns 今日使用统计
   */
  async getDailyUsage(userId: string): Promise<DailyUsage> {
    const records = this.usageRecords.get(userId) || [];
    const today = new Date().toISOString().split('T')[0];

    const todayRecords = records.filter(record => {
      const recordDate = new Date(record.timestamp)
        .toISOString()
        .split('T')[0];
      return recordDate === today;
    });

    return {
      inputTokens: todayRecords.reduce(
        (sum, r) => sum + r.inputTokens,
        0
      ),
      outputTokens: todayRecords.reduce(
        (sum, r) => sum + r.outputTokens,
        0
      ),
      cost: todayRecords.reduce((sum, r) => sum + r.cost, 0),
      apiCalls: todayRecords.length,
    };
  }

  /**
   * 检查是否超出配额
   * @param userId 用户ID
   * @returns 配额检查结果
   */
  async checkQuota(userId: string): Promise<QuotaCheckResult> {
    const dailyUsage = await this.getDailyUsage(userId);

    const remainingInput = Math.max(
      0,
      DAILY_FREE_QUOTA.inputTokens - dailyUsage.inputTokens
    );
    const remainingOutput = Math.max(
      0,
      DAILY_FREE_QUOTA.outputTokens - dailyUsage.outputTokens
    );
    const remainingCost = Math.max(
      0,
      DAILY_FREE_QUOTA.maxCost - dailyUsage.cost
    );

    const withinQuota =
      remainingInput > 0 && remainingOutput > 0 && remainingCost > 0;

    return {
      withinQuota,
      remaining: {
        inputTokens: remainingInput,
        outputTokens: remainingOutput,
        cost: Math.round(remainingCost * 100) / 100,
      },
    };
  }

  /**
   * 清除所有使用记录（用于测试）
   */
  clearAll(): void {
    this.usageRecords.clear();
  }

  /**
   * 清除指定用户的使用记录
   * @param userId 用户ID
   */
  clearUser(userId: string): void {
    this.usageRecords.delete(userId);
  }
}

// ==================== 主服务类：AI改写服务 ====================

/**
 * AI改写主服务类
 * 整合所有功能模块，提供完整的改写流程
 */
export class AIRewriteService {
  private client: DeepSeekClient;
  private usageTracker: UsageTracker;

  constructor(client: DeepSeekClient) {
    this.client = client;
    this.usageTracker = new UsageTracker();
  }

  /**
   * 获取使用量追踪器实例
   */
  getUsageTracker(): UsageTracker {
    return this.usageTracker;
  }

  /**
   * 改写单个段落（生成单个版本）
   * @param paragraph 段落文本
   * @param options 改写选项
   * @returns 改写结果
   */
  async rewriteParagraph(
    paragraph: string,
    options: RewriteOptions
  ): Promise<RewriteVersion> {
    const prompt = generateRewritePrompt(paragraph, {
      strength: options.strength,
      style: options.style,
      protectedTerms: options.protectedTerms,
    });

    const inputTokens = estimateTokens(prompt);

    const startTime = Date.now();

    const rewrittenContent = await this.client.chat(prompt);

    const outputTokens = estimateTokens(rewrittenContent);

    const qualityScore = await evaluateRewriteQuality(
      paragraph,
      rewrittenContent
    );

    const changes = this._extractChanges(paragraph, rewrittenContent);

    const versionId = generateContentHash(
      `${paragraph}_${options.strength}_${options.style}_${Date.now()}`
    );

    console.info(`[AIService] Paragraph rewritten`, {
      inputTokens,
      outputTokens,
      duration: Date.now() - startTime,
      qualityScore: qualityScore.overall,
    });

    return {
      versionId,
      content: rewrittenContent,
      changes,
      confidence: qualityScore.overall,
    };
  }

  /**
   * 改写单个段落（生成多个版本）
   * @param paragraph 段落文本
   * @param options 改写选项
   * @returns 多个版本的改写结果
   */
  async rewriteParagraphWithVersions(
    paragraph: string,
    options: RewriteOptions
  ): Promise<RewriteVersion[]> {
    const versionCount = Math.min(options.versions, 3);
    const prompts = generateVersionPrompts(paragraph, options, versionCount);

    const versions: RewriteVersion[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const inputTokens = estimateTokens(prompt);

      const startTime = Date.now();

      const rewrittenContent = await this.client.chat(prompt);

      const outputTokens = estimateTokens(rewrittenContent);

      const qualityScore = await evaluateRewriteQuality(
        paragraph,
        rewrittenContent
      );

      const changes = this._extractChanges(paragraph, rewrittenContent);

      const versionId = generateContentHash(
        `${paragraph}_v${i + 1}_${options.strength}_${Date.now()}`
      );

      console.info(`[AIService] Version ${i + 1} generated`, {
        inputTokens,
        outputTokens,
        duration: Date.now() - startTime,
        qualityScore: qualityScore.overall,
      });

      versions.push({
        versionId,
        content: rewrittenContent,
        changes,
        confidence: qualityScore.overall,
      });
    }

    return versions;
  }

  /**
   * 批量改写多个段落（带并发控制）
   * @param paragraphs 段落数组
   * @param options 改写选项
   * @param userId 用户ID（用于配额检查和使用量记录）
   * @param onProgress 进度回调（可选）
   * @returns 所有段落的改写结果
   */
  async rewriteParagraphs(
    paragraphs: string[],
    options: RewriteOptions,
    userId?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<RewriteResult[]> {
    if (userId) {
      const quotaCheck = await this.usageTracker.checkQuota(userId);

      if (!quotaCheck.withinQuota) {
        throw new AIServiceError(
          '今日免费额度已用完，请明天再试或升级会员',
          'RATE_LIMITED' as AIServiceErrorCode,
          false
        );
      }
    }

    const results: RewriteResult[] = [];
    const total = paragraphs.length;

    for (let i = 0; i < total; i += MAX_CONCURRENT_REQUESTS) {
      const batch = paragraphs.slice(i, i + MAX_CONCURRENT_REQUESTS);

      const batchResults = await Promise.all(
        batch.map(async (paragraph, batchIndex) => {
          const globalIndex = i + batchIndex;

          const versions = await this.rewriteParagraphWithVersions(
            paragraph,
            options
          );

          if (userId) {
            await this._recordBatchUsage(userId, paragraph, options);
          }

          if (onProgress) {
            onProgress(globalIndex + 1, total);
          }

          return {
            paragraphIndex: globalIndex,
            versions,
          } as RewriteResult;
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 流式改写单个段落
   * @param paragraph 段落文本
   * @param options 改写选项
   * @param onChunk 流式回调
   * @returns 完整的改写版本
   */
  async rewriteParagraphStream(
    paragraph: string,
    options: RewriteOptions,
    onChunk: (chunk: string) => void
  ): Promise<RewriteVersion> {
    const prompt = generateRewritePrompt(paragraph, {
      strength: options.strength,
      style: options.style,
      protectedTerms: options.protectedTerms,
    });

    let fullContent = '';

    await this.client.chatStream(prompt, chunk => {
      fullContent += chunk;
      onChunk(chunk);
    });

    const qualityScore = await evaluateRewriteQuality(
      paragraph,
      fullContent
    );

    const changes = this._extractChanges(paragraph, fullContent);

    const versionId = generateContentHash(
      `${paragraph}_${options.strength}_${options.style}_${Date.now()}_stream`
    );

    return {
      versionId,
      content: fullContent,
      changes,
      confidence: qualityScore.overall,
    };
  }

  /**
   * 从改写结果中提取变更记录
   * 简单实现：基于文本差异对比
   */
  private _extractChanges(
    original: string,
    rewritten: string
  ): Change[] {
    const changes: Change[] = [];

    if (original === rewritten) {
      return changes;
    }

    const originalSentences = original.split(/(?<=[。！？])/);
    const rewrittenSentences = rewritten.split(/(?<=[。！？])/);

    const minLength = Math.min(
      originalSentences.length,
      rewrittenSentences.length
    );

    for (let i = 0; i < minLength; i++) {
      const origSentence = originalSentences[i].trim();
      const rewrSentence = rewrittenSentences[i].trim();

      if (origSentence !== rewrSentence) {
        const similarity = calculateSimilarity(origSentence, rewrSentence);

        let changeType: Change['type'];

        if (similarity > 0.8) {
          changeType = 'synonym_replace';
        } else if (similarity > 0.4) {
          changeType = 'sentence_restructure';
        } else {
          changeType = 'paragraph_reorganize';
        }

        changes.push({
          type: changeType,
          position: {
            start: original.indexOf(origSentence),
            end: original.indexOf(origSentence) + origSentence.length,
          },
          original: origSentence,
          rewritten: rewrSentence,
        });
      }
    }

    if (originalSentences.length !== rewrittenSentences.length) {
      const extraContent =
        rewrittenSentences.slice(minLength).join('').trim();

      if (extraContent) {
        changes.push({
          type: 'paragraph_reorganize',
          position: {
            start: original.length,
            end: original.length + extraContent.length,
          },
          original: '',
          rewritten: extraContent,
        });
      }
    }

    return changes;
  }

  /**
   * 记录批量使用的Token消耗
   */
  private async _recordBatchUsage(
    userId: string,
    paragraph: string,
    options: RewriteOptions
  ): Promise<void> {
    const inputEstimate = COST_ESTIMATES.perRewrite.inputTokens * options.versions;
    const outputEstimate =
      COST_ESTIMATES.perRewrite.outputTokens * options.versions;
    const costEstimate = COST_ESTIMATES.perRewrite.cost * options.versions;

    await this.usageTracker.recordUsage(userId, {
      userId,
      inputTokens: inputEstimate,
      outputTokens: outputEstimate,
      cost: costEstimate,
      timestamp: new Date(),
      operation: 'rewrite',
    });
  }

  /**
   * 估算操作成本
   * @param operation 操作类型
   * @param count 数量（段落数或倍数）
   * @returns 成本估算
   */
  estimateCost(operation: 'rewrite' | 'analysis' | 'fullDedup', count: number = 1): CostEstimate {
    const baseCost = COST_ESTIMATES[operation];

    if (!baseCost) {
      throw new Error(`Unknown operation type: ${operation}`);
    }

    return {
      inputTokens: baseCost.inputTokens * count,
      outputTokens: baseCost.outputTokens * count,
      cost: Math.round(baseCost.cost * count * 100) / 100,
    };
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建AIRewriteService实例的工厂函数
 * @param apiKey DeepSeek API密钥
 * @param config 可选的自定义配置
 * @returns AIRewriteService实例
 */
export function createAIRewriteService(
  apiKey: string,
  config?: Partial<DeepSeekConfig>
): AIRewriteService {
  const deepseekConfig: DeepSeekConfig = {
    apiKey,
    ...DEFAULT_DEEPSEEK_CONFIG,
    ...config,
  };

  const client = new DeepSeekClient(deepseekConfig);

  return new AIRewriteService(client);
}
