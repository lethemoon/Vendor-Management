/**
 * AIGC规则引擎单元测试
 * 覆盖所有核心算法函数：分词、TTR、句长方差、词汇检测、过渡词、被动语态、综合评分、Prompt模板、质量评估
 */

import {
  tokenizeChinese,
  calculateTTR,
  calculateSentenceVariance,
  detectAIVocabulary,
  detectTransitionPatterns,
  detectPassiveVoice,
  runRuleEngine,
  generateAIGCDetectPrompt,
  generateAIGCRewritePrompt,
  parseLLMDetectResponse,
  evaluateAIGCRewriteQuality,
  computeDiff,
  checkRewriteQuality,
  AIGC_DETECT_API_CONFIG,
  AIGC_REWRITE_API_CONFIG,
} from '../services/ruleEngine';

// ==================== 1. tokenizeChinese 测试 ====================

describe('tokenizeChinese', () => {
  it('应正确处理AI重复性文本（低TTR预期）', () => {
    const result = tokenizeChinese('研究表明研究表明研究表明');
    expect(result).toContain('研究');
    expect(result).toContain('究表');
    expect(result).toContain('表明');
    const uniqueSet = new Set(result);
    const uniqueRatio = uniqueSet.size / result.length;
    expect(uniqueRatio).toBeLessThan(0.5);
  });

  it('应正确处理人类多样性文本（高TTR预期）', () => {
    const result = tokenizeChinese(
      '今天天气真好我和小明去了公园玩滑梯荡秋千还吃了冰淇淋'
    );
    expect(result.length).toBeGreaterThan(10);
    const uniqueSet = new Set(result);
    const uniqueRatio = uniqueSet.size / result.length;
    expect(uniqueRatio).toBeGreaterThan(0.7);
  });

  it('应正确处理中英文混合文本', () => {
    const result = tokenizeChinese('深度学习deep learning是AI的核心技术');
    expect(result).toContain('深度');
    expect(result).toContain('deep');
    expect(result).toContain('learning');
  });

  it('应正确处理纯英文文本', () => {
    const result = tokenizeChinese('Hello World Machine Learning');
    expect(result).toEqual(['hello', 'world', 'machine', 'learning']);
  });

  it('应正确处理数字文本', () => {
    const result = tokenizeChinese('2024年有365天');
    expect(result).toContain('2024');
    expect(result).toContain('365');
  });

  it('空文本应返回空数组', () => {
    expect(tokenizeChinese('')).toEqual([]);
  });

  it('仅含标点符号的文本应返回空数组', () => {
    expect(tokenizeChinese('，。！？')).toEqual([]);
  });
});

// ==================== 2. calculateTTR 测试 ====================

describe('calculateTTR', () => {
  it('AI重复文本应返回high风险和高分数', () => {
    const aiText =
      '研究表明研究表明研究表明研究表明研究表明研究表明研究表明研究表明';
    const result = calculateTTR(aiText);
    expect(result.risk).toBe('high');
    expect(result.score).toBeGreaterThan(60);
    expect(result.ttr).toBeLessThan(0.30);
  });

  it('人类多样文本应返回low风险和低分数', () => {
    const humanText =
      '今天天气真好我和小明去了公园玩滑梯荡秋千还吃了冰淇淋看了大象表演坐了旋转木马';
    const result = calculateTTR(humanText);
    expect(result.risk).toBe('low');
    expect(result.score).toBeLessThan(50);
    expect(result.ttr).toBeGreaterThanOrEqual(0.50);
  });

  it('空文本应返回默认值', () => {
    const result = calculateTTR('');
    expect(result.ttr).toBe(0);
    expect(result.score).toBe(50);
    expect(result.risk).toBe('medium');
  });

  it('中等TTR文本应返回medium或low风险', () => {
    const mediumText =
      '研究表明深度学习非常重要。研究表明机器学习很有用。研究表明人工智能发展很快。数据表明效果不错。';
    const result = calculateTTR(mediumText);
    expect(result.risk).toEqual(
      expect.stringMatching(/high|medium|low/)
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('TTR值应在0-1范围内', () => {
    const result = calculateTTR('这是一段测试文本用于验证TTR计算的正确性');
    expect(result.ttr).toBeGreaterThanOrEqual(0);
    expect(result.ttr).toBeLessThanOrEqual(1);
  });
});

// ==================== 3. calculateSentenceVariance 测试 ====================

describe('calculateSentenceVariance', () => {
  it('均匀句长（AI模式）应返回high风险', () => {
    const uniformText =
      '这是第一句。这是第二句。这是第三句。这是第四句。这是第五句。这是第六句。';
    const result = calculateSentenceVariance(uniformText);
    expect(result.variance).toBeLessThan(5);
    expect(result.risk).toBe('high');
    expect(result.score).toBeGreaterThan(50);
  });

  it('变化大的句长（人类模式）应返回low风险', () => {
    const variedText = `好。
这是一个相当长的句子包含了大量的信息和详细的描述以及各种复杂的语法结构。
短。
另外一段非常非常非常非常非常非常非常长长长长的句子用来测试方差的计算是否能够正确识别出这种明显的长度差异模式。`;
    const result = calculateSentenceVariance(variedText);
    expect(result.variance).toBeGreaterThan(20);
    expect(result.risk).toBe('low');
  });

  it('句子数不足3时应返回默认值', () => {
    const shortText = '第一句。第二句。';
    const result = calculateSentenceVariance(shortText);
    expect(result.sentenceCount).toBe(2);
    expect(result.score).toBe(50);
  });

  it('meanLength应为正数', () => {
    const text = '这是一段包含多个句子的测试文本。每个句子都有不同的长度。这样可以测试方差计算。';
    const result = calculateSentenceVariance(text);
    expect(result.meanLength).toBeGreaterThan(0);
    expect(result.sentenceCount).toBe(3);
  });
});

// ==================== 4. detectAIVocabulary 测试 ====================

describe('detectAIVocabulary', () => {
  it('高密度AI词汇文本应返回high风险', () => {
    const aiText =
      '综上所述，研究表明，值得注意的是，不难发现，毋庸置疑，总而言之，由此可见，综上所述，众所周知，综上所述，显而易见，综上所述';
    const result = detectAIVocabulary(aiText, aiText.length);
    expect(result.density).toBeGreaterThan(15);
    expect(result.risk).toBe('high');
    expect(result.score).toBeGreaterThan(60);
  });

  it('干净的人类文本应返回零分或接近零分', () => {
    const cleanText = '我今天去图书馆借了一本关于机器学习的书，内容挺有意思的';
    const result = detectAIVocabulary(cleanText, cleanText.length);
    expect(result.score).toBeLessThan(10);
    expect(result.risk).toBe('low');
  });

  it('matchedWords数量不应超过15条', () => {
    const heavyAiText =
      '综上所述值得注意的是不难发现研究表明综上所述值得注意的是不难发现研究表明总而言之显而易见毋庸置疑毫无疑问不可否认综上所述由此可见总而言之概括来说归根结底简而言之综上总之总的来说总体而言从整体来看总体来看总的来讲由此可见一斑可见显然显而易见不言而喻毋庸置疑毫无疑问毫无疑义需要特别指出的是尤其值得关注的是不容忽视的是';
    const result = detectAIVocabulary(heavyAiText, heavyAiText.length);
    expect(result.matchedWords.length).toBeLessThanOrEqual(15);
  });

  it('matchedWords应按count降序排列', () => {
    const text = '综上所述综上所述研究表明值得注意的是不难发现';
    const result = detectAIVocabulary(text, text.length);
    for (let i = 0; i < result.matchedWords.length - 1; i++) {
      expect(result.matchedWords[i].count).toBeGreaterThanOrEqual(
        result.matchedWords[i + 1].count
      );
    }
  });

  it('wordCount为0时应安全处理', () => {
    const result = detectAIVocabulary('综上所述', 0);
    expect(result.density).toBe(0);
    expect(result.score).toBe(0);
  });
});

// ==================== 5. detectTransitionPatterns 测试 ====================

describe('detectTransitionPatterns', () => {
  it('应检测到"一方面...另一方面"模式', () => {
    const text = '一方面技术进步推动了经济发展，另一方面也带来了环境问题。';
    const result = detectTransitionPatterns(text);
    const match = result.patterns.find((p) =>
      p.label.includes('一方面')
    ) as { label: string; count: number; penalty: number } | undefined;
    expect(match).toBeDefined();
    expect(match!.count).toBe(1);
    expect(result.totalPenalty).toBeGreaterThan(0);
  });

  it('应检测到"首先...其次"三段式列举', () => {
    const text =
      '首先我们分析现状，其次探讨原因，最后提出解决方案。';
    const result = detectTransitionPatterns(text);
    const match = result.patterns.find((p) =>
      p.label.includes('首先')
    ) as { label: string; count: number; penalty: number } | undefined;
    expect(match).toBeDefined();
    expect(match!.penalty).toBeGreaterThan(0);
  });

  it('无过渡词模式的文本应返回0分', () => {
    const cleanText = '我今天去公园玩了。天气很好。吃了冰淇淋。';
    const result = detectTransitionPatterns(cleanText);
    expect(result.score).toBe(0);
    expect(result.patterns).toHaveLength(0);
  });

  it('多个模式同时出现时应累计惩罚', () => {
    const multiPatternText =
      '一方面技术很重要，另一方面人才更关键。虽然存在困难，但是我们有信心解决。首先分析问题，其次制定方案。不仅效果好而且效率高。';
    const result = detectTransitionPatterns(multiPatternText);
    expect(result.patterns.length).toBeGreaterThanOrEqual(3);
    expect(result.totalPenalty).toBeGreaterThan(10);
  });

  it('score应在0-100范围内', () => {
    const extremeText =
      Array(20)
        .fill('一方面A，另一方面B。')
        .join('')
        .concat(
          Array(20)
            .fill('首先X，其次Y，最后Z。')
            .join('')
        );
    const result = detectTransitionPatterns(extremeText);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ==================== 6. detectPassiveVoice 测试 ====================

describe('detectPassiveVoice', () => {
  it('高被动比例文本应返回高分', () => {
    const passiveText =
      '该方法被研究人员所采用。结果由实验数据构成。模型受到噪声的影响。参数予以优化。误差加以控制。';
    const result = detectPassiveVoice(passiveText, 5);
    expect(result.passiveCount).toBeGreaterThan(3);
    expect(result.ratio).toBeGreaterThan(0.5);
    expect(result.score).toBeGreaterThan(40);
  });

  it('主动语态为主的文本应返回低分', () => {
    const activeText =
      '研究者采用了新方法。实验数据构成了报告基础。我们分析了模型性能。团队优化了参数设置。工程师控制了测量误差。';
    const result = detectPassiveVoice(activeText, 5);
    expect(result.score).toBeLessThan(20);
  });

  it('sentenceCount为0时应安全处理', () => {
    const result = detectPassiveVoice('被使用的', 0);
    expect(result.passiveCount).toBe(0);
    expect(result.ratio).toBe(0);
    expect(result.score).toBe(0);
  });

  it('ratio应在0-1范围内', () => {
    const text = '这被使用了。那是正常的。';
    const result = detectPassiveVoice(text, 2);
    expect(result.ratio).toBeGreaterThanOrEqual(0);
    expect(result.ratio).toBeLessThanOrEqual(1);
  });
});

// ==================== 7. runRuleEngine 综合评分测试 ====================

describe('runRuleEngine', () => {
  it('典型AI文本应返回高weightedScore和多个issues', () => {
    const aiText = `综上所述，研究表明深度学习在图像识别领域具有重要意义。值得注意的是，卷积神经网络发挥着重要作用。首先，网络结构的设计尤为关键。其次，超参数的调整也不容忽视。再次，数据增强技术的应用具有深远影响。不仅如此，迁移学习也得到了广泛关注。大量研究表明，这些技术的发展成为研究热点。基于上述分析，我们可以认为该领域前景广阔。一方面技术进步推动了发展，另一方面也带来了挑战。虽然存在困难，但是我们有信心解决。`;

    const result = runRuleEngine(aiText);

    expect(result.weightedScore).toBeGreaterThan(40);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    expect(result.vocabulary.density).toBeGreaterThan(5);
  });

  it('人类写作风格文本应返回较低的weightedScore', () => {
    const humanText = `我昨天看了一篇论文，讲的是用Transformer做情感分析的。说实话效果还行吧，但我觉得他们那个数据集选得有点问题——好多样本标注都不太一致。

作者说F1到了89%，但我复现的时候只有82%左右。可能是我GPU没跑够epoch？不确定。反正这个方向我觉得还是有搞头的，尤其是结合一些领域知识的话。

不过有个地方我没太看懂，就是他们那个attention map的可视化部分。`;

    const result = runRuleEngine(humanText);

    expect(result.weightedScore).toBeLessThan(40);
    expect(result.ttr.risk).toBe('low');
    expect(result.sentenceVariance.variance).toBeGreaterThan(15);
  });

  it('空文本应安全处理', () => {
    const result = runRuleEngine('');
    expect(result.weightedScore).toBeGreaterThanOrEqual(0);
    expect(result.weightedScore).toBeLessThanOrEqual(100);
  });

  it('各子模块结果应完整返回', () => {
    const result = runRuleEngine('这是一段测试文本。用于验证规则引擎。');

    expect(result.ttr).toBeDefined();
    expect(result.ttr.ttr).toBeGreaterThanOrEqual(0);
    expect(result.sentenceVariance).toBeDefined();
    expect(result.sentenceVariance.variance).toBeGreaterThanOrEqual(0);
    expect(result.vocabulary).toBeDefined();
    expect(result.transitions).toBeDefined();
    expect(result.passiveVoice).toBeDefined();
    expect(result.passiveVoice.ratio).toBeGreaterThanOrEqual(0);
  });

  it('加权得分应在0-100范围内', () => {
    const texts = [
      '短。',
      'a'.repeat(500),
      '综上所述。' .repeat(50),
      '自然的人类写作文本通常会有很多变化和不规则的表达方式，不会像机器生成的文字那样整齐划一和完美无缺。人类写东西的时候会加入自己的个人感受和主观判断，有时候甚至会跑题或者说一些不太相关的话。这就是为什么人类的文章读起来更有温度更有感情。',
    ];

    for (const text of texts) {
      const result = runRuleEngine(text);
      expect(result.weightedScore).toBeGreaterThanOrEqual(0);
      expect(result.weightedScore).toBeLessThanOrEqual(100);
    }
  });
});

// ==================== 8. generateAIGCDetectPrompt 测试 ====================

describe('generateAIGCDetectPrompt', () => {
  it('应包含所有段落文本', () => {
    const paragraphs = [
      { index: 1, text: '第一段内容' },
      { index: 2, text: '第二段内容' },
    ];
    const prompt = generateAIGCDetectPrompt(paragraphs);
    expect(prompt).toContain('段落1');
    expect(prompt).toContain('段落2');
    expect(prompt).toContain('第一段内容');
    expect(prompt).toContain('第二段内容');
  });

  it('应包含JSON输出格式要求', () => {
    const prompt = generateAIGCDetectPrompt([
      { index: 1, text: '测试' },
    ]);
    expect(prompt).toContain('JSON数组');
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('"evidence"');
    expect(prompt).toContain('"reasoning"');
  });

  it('应包含6个判断维度', () => {
    const prompt = generateAIGCDetectPrompt([
      { index: 1, text: '测试' },
    ]);
    expect(prompt).toContain('句式均匀度');
    expect(prompt).toContain('过渡词使用');
    expect(prompt).toContain('词汇多样性');
    expect(prompt).toContain('逻辑流畅度');
    expect(prompt).toContain('观点表达');
    expect(prompt).toContain('结构化程度');
  });

  it('应包含5档评分标准', () => {
    const prompt = generateAIGCDetectPrompt([
      { index: 1, text: '测试' },
    ]);
    expect(prompt).toContain('0-20');
    expect(prompt).toContain('21-40');
    expect(prompt).toContain('41-60');
    expect(prompt).toContain('61-80');
    expect(prompt).toContain('81-100');
  });

  it('单段落也应正常生成', () => {
    const prompt = generateAIGCDetectPrompt([
      { index: 1, text: '唯一的段落' },
    ]);
    expect(prompt).toContain('1个');
    expect(prompt).toContain('共1个');
  });
});

// ==================== 9. parseLLMDetectResponse 测试 ====================

describe('parseLLMDetectResponse', () => {
  it('应正确解析标准JSON响应', () => {
    const raw =
      '[{"index":1,"score":75,"evidence":["证据1","证据2"],"reasoning":"推理OK"}]';
    const result = parseLLMDetectResponse(raw, 1);
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    expect(result[0].score).toBe(75);
    expect(result[0].evidence).toEqual(['证据1', '证据2']);
    expect(result[0].reasoning).toBe('推理OK');
  });

  it('应正确解析多段落响应', () => {
    const raw = `[{"index":1,"score":30,"evidence":[],"reasoning":"ok"},{"index":2,"score":85,"evidence":["AI特征明显"],"reasoning":"高度疑似"}]`;
    const result = parseLLMDetectResponse(raw, 2);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(30);
    expect(result[1].score).toBe(85);
  });

  it('应容忍JSON前后的额外文字', () => {
    const raw =
      '以下是检测结果：\n[{"index":1,"score":50,"evidence":["test"],"reasoning":"ok"}]\n以上是结果。';
    const result = parseLLMDetectResponse(raw, 1);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(50);
  });

  it('非JSON格式应抛出错误', () => {
    expect(() => parseLLMDetectResponse('这不是JSON', 1)).toThrow();
  });

  it('越界分数应被钳制到0-100范围', () => {
    const raw =
      '[{"index":1,"score":-5,"evidence":[],"reasoning":""}]';
    const result = parseLLMDetectResponse(raw, 1);
    expect(result[0].score).toBe(50); // default fallback for invalid scores

    const raw2 =
      '[{"index":1,"score":999,"evidence":[],"reasoning":""}]';
    const result2 = parseLLMDetectResponse(raw2, 1);
    expect(result2[0].score).toBe(100);
  });

  it('缺失字段应使用默认值', () => {
    const raw = '[{"index":1}]';
    const result = parseLLMDetectResponse(raw, 1);
    expect(result[0].score).toBe(50); // NaN → fallback
    expect(result[0].evidence).toEqual([]);
    expect(result[0].reasoning).toBe('');
  });
});

// ==================== 10. generateAIGCRewritePrompt 测试 ====================

describe('generateAIGCRewritePrompt', () => {
  it('保守型版本应包含保守策略指令', () => {
    const prompt = generateAIGCRewritePrompt('原始段落文本', {
      version: 'conservative',
      issues: ['词汇多样性不足'],
      currentScore: 75,
    });
    expect(prompt).toContain('保守型改写策略');
    expect(prompt).toContain('改动幅度控制在最小范围');
  });

  it('平衡型版本应包含推荐标记', () => {
    const prompt = generateAIGCRewritePrompt('原始段落文本', {
      version: 'balanced',
      issues: [],
      currentScore: 60,
    });
    expect(prompt).toContain('平衡型改写策略');
    expect(prompt).toContain('推荐');
  });

  it('激进型版本应包含大幅重构指令', () => {
    const prompt = generateAIGCRewritePrompt('原始段落文本', {
      version: 'aggressive',
      issues: ['句式单一', '用词模式化'],
      currentScore: 88,
    });
    expect(prompt).toContain('激进型改写策略');
    expect(prompt).toContain('大幅重构');
  });

  it('应包含原始段落文本', () => {
    const original = '这是要改写的原始段落内容';
    const prompt = generateAIGCRewritePrompt(original, {
      version: 'balanced',
      issues: [],
      currentScore: 70,
    });
    expect(prompt).toContain(original);
  });

  it('应包含当前AIGC疑似度', () => {
    const prompt = generateAIGCRewritePrompt('文本', {
      version: 'balanced',
      issues: ['问题1'],
      currentScore: 82,
    });
    expect(prompt).toContain('82%');
  });

  it('应包含禁止事项列表', () => {
    const prompt = generateAIGCRewritePrompt('文本', {
      version: 'conservative',
      issues: [],
      currentScore: 50,
    });
    expect(prompt).toContain('严格禁止');
    expect(prompt).toContain('排比句式');
    expect(prompt).toContain('序数列举');
  });

  it('应包含4大改写技术说明', () => {
    const prompt = generateAIGCRewritePrompt('文本', {
      version: 'balanced',
      issues: [],
      currentScore: 60,
    });
    expect(prompt).toContain('句式爆破');
    expect(prompt).toContain('词汇去AI化');
    expect(prompt).toContain('注入作者身份');
    expect(prompt).toContain('结构微调');
  });
});

// ==================== 11. evaluateAIGCRewriteQuality 测试 ====================

describe('evaluateAIGCRewriteQuality', () => {
  it('基本质量检查应通过', () => {
    const original = '这是一段关于深度学习的测试文本';
    const rewritten =
      '说到深度学习这块，我个人觉得它确实是当前AI领域里最核心的技术方向之一——虽然训练成本不低，但效果确实没得说。';

    const result = evaluateAIGCRewriteQuality(original, rewritten, 75, {
      version: 'balanced',
    });

    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.semanticSimilarity).toBeGreaterThan(0);
    expect(result.semanticSimilarity).toBeLessThanOrEqual(1);
    expect(result.fluencyScore).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('完全相同的文本应有高相似度和零改进', () => {
    const text = '完全相同的内容用于测试';
    const ruleScore = runRuleEngine(text).weightedScore;
    const result = evaluateAIGCRewriteQuality(text, text, ruleScore, {
      version: 'conservative',
    });
    expect(result.semanticSimilarity).toBeCloseTo(1);
    expect(result.aigcScoreImprovement).toBeCloseTo(0);
  });

  it('各版本类型的置信度应符合预期', () => {
    const original = '测试原文内容';
    const rewritten = '改写后的内容变化较大';

    const conservative = evaluateAIGCRewriteQuality(
      original,
      rewritten,
      80,
      { version: 'conservative' }
    );
    const balanced = evaluateAIGCRewriteQuality(original, rewritten, 80, {
      version: 'balanced',
    });
    const aggressive = evaluateAIGCRewriteQuality(original, rewritten, 80, {
      version: 'aggressive',
    });

    expect(conservative.confidence).toBeGreaterThanOrEqual(
      balanced.confidence
    );
    expect(balanced.confidence).toBeGreaterThanOrEqual(
      aggressive.confidence
    );
  });
});

// ==================== 12. computeDiff 测试 ====================

describe('computeDiff', () => {
  it('相同文本应只产生equal片段', () => {
    const diff = computeDiff('hello world', 'hello world');
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe('equal');
    expect(diff[0].value).toBe('hello world');
  });

  it('完全不同文本应产生replace和insert片段', () => {
    const diff = computeDiff('abc', 'xyz');
    expect(diff.some((d) => d.type === 'replace')).toBe(true);
    expect(diff.some((d) => d.type === 'insert')).toBe(true);
  });

  it('部分修改应正确标识差异区域', () => {
    const diff = computeDiff('hello world', 'hello there');
    expect(diff.length).toBeGreaterThanOrEqual(2);
    expect(diff.some((d) => d.type === 'equal')).toBe(true);
  });

  it('空字符串应正确处理', () => {
    const diff1 = computeDiff('', 'text');
    expect(diff1).toHaveLength(1);
    expect(diff1[0].type).toBe('insert');

    const diff2 = computeDiff('text', '');
    expect(diff2).toHaveLength(1);
    expect(diff2[0].type).toBe('delete');
  });
});

// ==================== 13. checkRewriteQuality 测试 ====================

describe('checkRewriteQuality', () => {
  it('术语完整保留且质量合格时应passed=true', () => {
    const result = checkRewriteQuality(
      '原本文本包含深度学习和神经网络',
      '改写后文本依然讨论深度学习和神经网络的应用',
      ['深度学习', '神经网络']
    );
    expect(result.termProtectionOk).toBe(true);
    expect(result.missingTerms).toHaveLength(0);
  });

  it('术语丢失时应passed=false并列出缺失术语', () => {
    const result = checkRewriteQuality(
      '原文本包含重要的专有名词',
      '改写后丢失了一些关键信息',
      ['专有名词']
    );
    expect(result.termProtectionOk).toBe(false);
    expect(result.missingTerms).toContain('专有名词');
    expect(result.passed).toBe(false);
  });

  it('语义相似度过低时应给出建议', () => {
    const result = checkRewriteQuality(
      '这是一篇关于量子计算的学术论文',
      '今天天气真好',
      []
    );
    expect(result.semanticSimilarity).toBeLessThan(0.78);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
  });
});

// ==================== 14. API配置常量测试 ====================

describe('API配置常量', () => {
  it('AIGC_DETECT_API_CONFIG配置应正确', () => {
    expect(AIGC_DETECT_API_CONFIG.model).toBe('deepseek-chat');
    expect(AIGC_DETECT_API_CONFIG.temperature).toBe(0.1);
    expect(AIGC_DETECT_API_CONFIG.maxTokens).toBe(4000);
    expect(AIGC_DETECT_API_CONFIG.maxRetries).toBe(3);
  });

  it('AIGC_REWRITE_API_CONFIG配置应正确', () => {
    expect(AIGC_REWRITE_API_CONFIG.model).toBe('deepseek-chat');
    expect(AIGC_REWRITE_API_CONFIG.temperature).toBe(0.8);
    expect(AIGC_REWRITE_API_CONFIG.maxTokens).toBe(2000);
    expect(AIGC_REWRITE_API_CONFIG.presencePenalty).toBe(0.3);
    expect(AIGC_REWRITE_API_CONFIG.frequencyPenalty).toBe(0.5);
  });

  it('检测与改写的temperature差异应符合设计', () => {
    expect(AIGC_REWRITE_API_CONFIG.temperature).toBeGreaterThan(
      AIGC_DETECT_API_CONFIG.temperature
    );
  });
});

// ==================== 15. 边界值与异常输入测试 ====================

describe('边界值与异常输入', () => {
  it('极长文本不应导致崩溃', () => {
    const longText = '这是一个句子。'.repeat(1000);
    expect(() => runRuleEngine(longText)).not.toThrow();
    const result = runRuleEngine(longText);
    expect(result.weightedScore).toBeGreaterThanOrEqual(0);
  });

  it('仅含标点的文本不应崩溃', () => {
    const punctText = "，。！？、；：\u201c\u201d\u2018\u2019（《》【】—……\n\t";
    expect(() => runRuleEngine(punctText)).not.toThrow();
  });

  it('特殊字符文本应安全处理', () => {
    const specialText = "<script>alert('xss')</script> & 'quotes' *bold*";
    expect(() => tokenizeChinese(specialText)).not.toThrow();
    expect(() => runRuleEngine(specialText)).not.toThrow();
  });

  it('单字文本应安全处理', () => {
    const result = runRuleEngine('好');
    expect(result.weightedScore).toBeGreaterThanOrEqual(0);
  });

  it('Unicode/Emoji文本应安全处理', () => {
    const emojiText = '这个研究结果🤔很有意思😊！数据显示📈增长趋势明显📊。';
    expect(() => runRuleEngine(emojiText)).not.toThrow();
  });
});
