/**
 * 文本处理工具函数集
 * 提供文本分块、清洗、Hash生成等基础功能
 */

import { createHash } from 'crypto';

// ==================== 文本分块函数 ====================

/**
 * 将长文本按段落/句子分割成块
 * 按中文句号/感叹号/问号分割，合并成不超过chunkSize的块
 * @param text 原始文本
 * @param chunkSize 每块最大字符数（默认1000）
 * @returns 文本块数组
 */
export function splitIntoChunks(text: string, chunkSize: number = 1000): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.trim();
  
  const sentences = cleanedText.match(/[^。！？.!?]+[。！？.!?]/g) || [];
  
  if (sentences.length === 0) {
    return cleanedText.length > 0 ? [cleanedText] : [];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if ((currentChunk + trimmedSentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 将文本按段落分割（双换行符）
 * @param text 原始文本
 * @returns 段落数组
 */
export function splitByParagraph(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  return text
    .split(/\n\s*\n/)
    .map(para => para.trim())
    .filter(para => para.length > 0);
}

// ==================== 文本清洗函数 ====================

/**
 * 清洗文本（去除多余空白、规范化标点）
 * @param text 原始文本
 * @returns 清洗后的文本
 */
export function cleanText(text: string): string {
  if (!text) {
    return '';
  }

  let cleaned = text;
  
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  cleaned = cleaned.replace(/^\s+|\s+$/gm, '');

  return cleaned;
}

/**
 * 提取纯文本（去除Markdown/HTML标签）
 * @param text 包含标记的文本
 * @returns 纯文本内容
 */
export function extractPlainText(text: string): string {
  if (!text) {
    return '';
  }

  let plain = text;

  plain = plain.replace(/<[^>]+>/g, '');
  
  plain = plain.replace(/\*\*(.+?)\*\*/g, '$1');
  plain = plain.replace(/\*(.+?)\*/g, '$1');
  plain = plain.replace(/`(.+?)`/g, '$1');
  plain = plain.replace(/`{3}[\s\S]*?`{3}/g, '');
  plain = plain.replace(/#{1,6}\s+/g, '');
  plain = plain.replace(/\[(.+?)\]\(.+?\)/g, '$1');
  plain = plain.replace(/!\[.*?\]\(.+?\)/g, '');
  plain = plain.replace(/^[-*+]\s+/gm, '');
  plain = plain.replace(/^\d+\.\s+/gm, '');
  plain = plain.replace(/^>\s+/gm, '');

  return plain.trim();
}

// ==================== Hash生成函数 ====================

/**
 * 生成文本内容的哈希值（用于缓存key）
 * 使用SHA-256算法
 * @param text 文本内容
 * @returns SHA-256哈希值（十六进制字符串）
 */
export function generateContentHash(text: string): string {
  if (!text) {
    return createHash('sha256').update('').digest('hex');
  }

  return createHash('sha256')
    .update(text.normalize('NFC'))
    .digest('hex');
}

// ==================== 文本统计函数 ====================

/**
 * 统计文本字数（中文字符算1个，英文单词算1个）
 * 支持中日韩文字符和英文单词的混合计数
 * @param text 文本内容
 * @returns 字数统计结果，包含总字符数、总字数和中文字符数
 */
export function countWords(text: string): { chars: number; words: number; chineseChars: number } {
  if (!text || text.trim().length === 0) {
    return { chars: 0, words: 0, chineseChars: 0 };
  }

  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  return {
    chars: totalChars,
    words: chineseChars + englishWords,
    chineseChars,
  };
}

/**
 * 粗略估算Token数量
 * 中文字符*2 + 英文单词*1.3
 * @param text 文本内容
 * @returns 预估Token数
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  return Math.ceil(chineseChars * 2 + englishWords * 1.3);
}

// ==================== 字符串相似度计算 ====================

/**
 * 计算Levenshtein编辑距离
 * @param a 字符串a
 * @param b 字符串b
 * @returns 编辑距离
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[m][n];
}

/**
 * 计算两个文本的相似度（基于编辑距离归一化）
 * @param text1 文本1
 * @param text2 文本2
 * @returns 相似度 (0-1, 1表示完全相同)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 && !text2) return 1;
  if (!text1 || !text2) return 0;

  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

// ==================== 方差计算工具 ====================

/**
 * 计算数组的方差
 * @param values 数值数组
 * @returns 方差值
 */
export function calculateVariance(values: number[]): number {
  if (!values || values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

  return variance;
}

/**
 * 计算数组的标准差
 * @param values 数值数组
 * @returns 标准差值
 */
export function calculateStandardDeviation(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * 计算文本字数（简化版，返回总字数）
 * @param text 文本内容
 * @returns 总字数
 */
export function calculateWordCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

/**
 * 评估文本流畅度（0-100分）
 * 基于句长分布、标点使用、段落结构等维度
 * @param text 文本内容
 * @returns 流畅度评分
 */
export function evaluateFluency(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  let score = 70;

  const sentences = text.split(/(?<=[。！？.!?\n])/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  const lengths = sentences.map(s => s.trim().length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

  if (variance > 5 && variance < 80) score += 10;
  else if (variance <= 5) score -= 15;

  const punctuationRatio = (text.match(/[，。！？、；：""''（）【】]/g) || []).length / text.length;
  if (punctuationRatio > 0.02 && punctuationRatio < 0.12) score += 8;
  else if (punctuationRatio >= 0.12) score -= 10;

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length >= 2 && avgLength > 10) score += 7;
  if (avgLength < 5) score -= 12;

  return Math.max(0, Math.min(100, score));
}
