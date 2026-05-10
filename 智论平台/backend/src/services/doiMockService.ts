/**
 * DOI 模拟数据服务
 * 提供模拟的DOI查询功能，用于MVP阶段测试和演示
 * 包含50条覆盖多种文献类型的模拟数据
 * 支持三级匹配算法：精确匹配 → 去空格匹配 → 前缀模糊匹配
 */

import type { DocumentType, DegreeType } from '../types/library';

/**
 * DOI模拟记录接口
 */
interface DOIMockRecord {
  doi: string;
  metadata: {
    type: DocumentType;
    title: string;
    authors?: string[];
    journal?: string;
    year?: number;
    volume?: string;
    issue?: string;
    pages?: string;
    university?: string;
    degreeType?: DegreeType;
    publisher?: string;
    isbn?: string;
    location?: string;
    conferenceName?: string;
    conferenceLocation?: string;
    websiteName?: string;
    url?: string;
    publishDate?: string;
    patentNumber?: string;
    inventors?: string[];
    filingDate?: string;
    issuingAuthority?: string;
    edition?: string;
  };
}

/**
 * 查询结果接口
 */
export interface LookupResult {
  found: boolean;
  metadata: DOIMockRecord['metadata'] | null;
  matchType: 'exact' | 'trimmed' | 'prefix' | null;
  lookupTimeMs: number;
}

/**
 * DOI模拟数据服务类
 * 内置50条模拟数据，支持异步查询和三级匹配
 */
class DOIMockService {
  private database: Map<string, DOIMockRecord>;

  constructor() {
    this.database = this.loadMockData();
  }

  /**
   * 公开查询方法 - 异步查询DOI信息
   * 模拟网络延迟（800-1500ms），提供真实的API调用体验
   *
   * @param doi - 要查询的DOI字符串
   * @returns 查询结果对象，包含是否找到、元数据、匹配类型和耗时
   */
  async lookup(doi: string): Promise<LookupResult> {
    const startTime = Date.now();

    const delay = this.simulateNetworkDelay();
    await new Promise(resolve => setTimeout(resolve, delay));

    const result = this.searchDatabase(doi);

    return {
      ...result,
      lookupTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 三级匹配算法核心实现
   */
  private searchDatabase(doi: string): Omit<LookupResult, 'lookupTimeMs'> {
    const trimmed = doi.trim();

    if (!trimmed) {
      return { found: false, metadata: null, matchType: null };
    }

    if (this.database.has(trimmed)) {
      return {
        found: true,
        metadata: this.database.get(trimmed)!.metadata,
        matchType: doi !== trimmed ? 'trimmed' : 'exact',
      };
    }

    for (const [key, record] of this.database) {
      if (key.replace(/\s+/g, '') === trimmed.replace(/\s+/g, '')) {
        return {
          found: true,
          metadata: record.metadata,
          matchType: 'trimmed',
        };
      }
    }

    const prefixMatch = this.prefixSearch(trimmed);
    if (prefixMatch) {
      return {
        found: true,
        metadata: prefixMatch.metadata,
        matchType: 'prefix',
      };
    }

    return { found: false, metadata: null, matchType: null };
  }

  /**
   * 前缀模糊匹配
   */
  private prefixSearch(doi: string): DOIMockRecord | null {
    const parts = doi.split('/');
    if (parts.length < 2) return null;

    const prefix = parts.slice(0, 2).join('/');

    let bestMatch: DOIMatchCandidate | null = null;

    for (const [key, record] of this.database) {
      if (key.startsWith(prefix)) {
        const score = this.calculateMatchScore(doi, key);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { record, score };
        }
      }
    }

    return bestMatch?.record || null;
  }

  /**
   * 计算DOI匹配分数
   */
  private calculateMatchScore(input: string, candidate: string): number {
    const inputClean = input.toLowerCase().replace(/\s+/g, '');
    const candidateClean = candidate.toLowerCase().replace(/\s+/g, '');

    if (inputClean === candidateClean) return 100;

    let commonPrefixLength = 0;
    const minLength = Math.min(inputClean.length, candidateClean.length);

    for (let i = 0; i < minLength; i++) {
      if (inputClean[i] === candidateClean[i]) {
        commonPrefixLength++;
      } else {
        break;
      }
    }

    return (commonPrefixLength / candidateClean.length) * 90 + 10;
  }

  /**
   * 模拟网络延迟（800-1500ms）
   */
  private simulateNetworkDelay(): number {
    return Math.floor(Math.random() * (1500 - 800 + 1)) + 800;
  }

  /**
   * 加载50条模拟数据
   */
  private loadMockData(): Map<string, DOIMockRecord> {
    const data: [string, DOIMockRecord][] = [
      // ========== 期刊文章 (30条) ==========

      ['10.1038/nature12373', {
        doi: '10.1038/nature12373',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
          authors: ['Devlin, J.', 'Chang, M.-W.', 'Lee, K.', 'Toutanova, K.'],
          journal: 'Nature',
          year: 2019,
          volume: '572',
          issue: '7769',
          pages: '136-140',
        },
      }],
      ['10.1145/3319535.3353716', {
        doi: '10.1145/3319535.3353716',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Attention Is All You Need',
          authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'Uszkoreit, J.', 'Jones, L.', 'Gomez, A.N.', 'Kaiser, Ł.', 'Polosukhin, I.'],
          journal: 'Advances in Neural Information Processing Systems',
          year: 2017,
          volume: '30',
          pages: '5998-6008',
        },
      }],
      ['10.1109/TPAMI.2021.3077802', {
        doi: '10.1109/TPAMI.2021.3077802',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Graph Neural Networks: A Review of Methods and Applications',
          authors: ['Wu, Z.', 'Pan, S.', 'Chen, F.', 'Long, G.', 'Zhang, C.', 'Philip, S.Y.'],
          journal: 'IEEE Transactions on Pattern Analysis and Machine Intelligence',
          year: 2021,
          volume: '43',
          issue: '11',
          pages: '3747-3768',
        },
      }],
      ['10.1609/aaai.v35i12.17194', {
        doi: '10.1609/aaai.v35i12.17194',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
          authors: ['Tan, M.', 'Le, Q.V.'],
          journal: 'Proceedings of the AAAI Conference on Artificial Intelligence',
          year: 2021,
          volume: '35',
          issue: '12',
          pages: '10803-10813',
        },
      }],
      ['10.5555/3455716.3455825', {
        doi: '10.5555/3455716.3455825',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Language Models are Few-Shot Learners',
          authors: ['Brown, T.B.', 'Mann, B.', 'Ryder, N.', 'Subbiah, M.', 'Kaplan, J.D.', 'Dhariwal, P.', 'Neelakantan, A.', 'Shyam, P.', 'Sastry, G.', 'Askell, A.', 'Agarwal, S.', 'Herbert-Voss, A.', 'Hesse, G.', 'Day, C.', 'Clark, C.', 'Grosser, M.', 'Lewin, C.', 'Nickisch, A.', 'Luo, Q.', 'Cabaña, C.'],
          journal: 'Advances in Neural Information Processing Systems',
          year: 2020,
          volume: '33',
          pages: '1877-1901',
        },
      }],
      ['10.48550/arXiv.2303.08774', {
        doi: '10.48550/arXiv.2303.08774',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'LLaMA: Open and Efficient Foundation Language Models',
          authors: ['Touvron, H.', 'Martin, L.', 'Stone, K.', 'Albert, P.', 'Almahairi, A.', 'Babaei, Y.', 'Bashlykov, N.', 'Batra, S.', 'Bhargava, P.', 'Goyal, D.', 'Hou, W.', 'Menon, K.', 'Ropert, R.', 'Desnoyers, P.', 'Scialom, T.', 'Szymanski, P.', 'Wang, S.', 'Lellinger, T.', 'Pla, A.', 'Zettlemoyer, L.'],
          journal: 'arXiv preprint arXiv:2302.13971',
          year: 2023,
        },
      }],
      ['10.1145/3447548.3467370', {
        doi: '10.1145/3447548.3467370',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
          authors: ['Dosovitskiy, A.', 'Beyer, L.', 'Kolesnikov, A.', 'Weissenborn, D.', 'Zhai, X.', 'Unterthiner, T.', 'Dehghani, M.', 'Minderer, M.', 'Heigold, G.', 'Gelly, S.', 'Uszkoreit, J.', 'Houlsby, N.'],
          journal: 'International Conference on Learning Representations',
          year: 2021,
        },
      }],
      ['10.1126/science.aav1483', {
        doi: '10.1126/science.aav1483',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Mastering the game of Go without human knowledge',
          authors: ['Silver, D.', 'Schrittwieser, J.', 'Simonyan, K.', 'Antonoglou, I.', 'Huang, A.', 'Guez, A.', 'Hubert, T.', 'Baker, L.', 'Lai, M.', 'Bolton, A.', 'Chen, Y.', 'Lillicrap, T., Hui, F.', 'Sifre, L.', 'van den Driessche, G.', 'Graepel, T.', 'Hassabis, D.'],
          journal: 'Nature',
          year: 2017,
          volume: '550',
          issue: '7674',
          pages: '354-359',
        },
      }],
      ['10.18653/v1/D19-1410', {
        doi: '10.18653/v1/D19-1410',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'XLNet: Generalized Autoregressive Pretraining for Language Understanding',
          authors: ['Yang, Z.', 'Dai, Z.', 'Yang, Y.', 'Carbonell, J.', 'Salakhutdinov, R.R.', 'Le, Q.V.'],
          journal: 'Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing',
          year: 2019,
          pages: '4253-4263',
        },
      }],
      ['10.1109/JPROC.2020.2995361', {
        doi: '10.1109/JPROC.2020.2995361',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'A Survey on Deep Learning for Named Entity Recognition',
          authors: ['Li, Y.', 'Zhang, R.', 'Yan, R.'],
          journal: 'IEEE Proceedings',
          year: 2020,
          volume: '108',
          issue: '10',
          pages: '1755-1797',
        },
      }],
      ['10.1162/tacl_a_00425', {
        doi: '10.1162/tacl_a_00425',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Neural Machine Translation: A Review of Methods, Resources, and Tools',
          authors: ['Stahlberg, F.', 'Byrne, B.', 'Popović, D.', 'Cromlie, A.'],
          journal: 'Transactions of the Association for Computational Linguistics',
          year: 2021,
          volume: '9',
          pages: '561-583',
        },
      }],
      ['10.1145/3394486.3403153', {
        doi: '10.1145/3394486.3403153',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Deep Reinforcement Learning: A Brief Survey',
          authors: ['Arulkumaran, K.', 'Deisenroth, M.P.', 'Brundage, M.', 'Bharath, A.A.'],
          journal: 'IEEE Signal Processing Magazine',
          year: 2017,
          volume: '34',
          issue: '6',
          pages: '26-38',
        },
      }],
      ['10.1561/2200000016', {
        doi: '10.1561/2200000016',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Convolutional Neural Networks for Sentence Classification',
          authors: ['Kim, Y.'],
          journal: 'Foundations and Trends® in Information Retrieval',
          year: 2014,
          volume: '8',
          issue: '2-3',
          pages: '147-172',
        },
      }],
      ['10.1145/3219879.3219893', {
        doi: '10.1145/3219879.3219893',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
          authors: ['Srivastava, N.', 'Hinton, G.E.', 'Krizhevsky, A.', 'Sutskever, I.', 'Salakhutdinov, R.R.'],
          journal: 'Journal of Machine Learning Research',
          year: 2014,
          volume: '15',
          issue: '1',
          pages: '1929-1958',
        },
      }],
      ['10.1016/j.patcog.2019.107005', {
        doi: '10.1016/j.patcog.2019.107005',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'A Comprehensive Survey on Graph Neural Networks',
          authors: ['Zhou, J.', 'Cui, G.', 'Hu, S.', 'Zhang, Z.', 'Yang, C.', 'Liu, Z.', 'Wang, L.', 'Li, C.', 'Sun, M.'],
          journal: 'Pattern Recognition',
          year: 2020,
          volume: '106',
          pages: '107360',
        },
      }],

      // 物理学领域 (5条)
      ['10.1126/science.169.3946.635', {
        doi: '10.1126/science.169.3946.635',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'The Structure of Ordinary Water [Disc 1800]',
          authors: ['Henniker, J.C.', 'Kamb, B.'],
          journal: 'Science',
          year: 1970,
          volume: '169',
          issue: '3946',
          pages: '635-637',
        },
      }],
      ['10.1103/PhysRevLett.117.113601', {
        doi: '10.1103/PhysRevLett.117.113601',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Observation of Gravitational Waves from a Binary Black Hole Merger',
          authors: ['Abbott, B.P.', 'Abbott, R.', 'Abbott, T.D.', 'Abernathy, M.R.', 'Acernese, F.', 'Ackley, K.', 'Adams, C.', 'Adams, T.', 'Addison, P.', 'Adhikari, R.X.'],
          journal: 'Physical Review Letters',
          year: 2016,
          volume: '116',
          issue: '6',
          pages: '061102',
        },
      }],
      ['10.1038/nature16467', {
        doi: '10.1038/nature16467',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Quantum supremacy using a programmable superconducting processor',
          authors: ['Arute, F.', 'Arya, K.', 'Babbush, R.', 'Bacon, D.', 'Bardin, J.C.', 'Boixo, S.', 'Brandho, D.A.', 'Buell, D.A.', 'Burkett, B.', 'Chen, Y.'],
          journal: 'Nature',
          year: 2019,
          volume: '574',
          issue: '7779',
          pages: '505-510',
        },
      }],
      ['10.1126/science.1255253', {
        doi: '10.1126/science.1255253',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Detection of B-mode polarization at degree angular scales by BICEP2',
          authors: ['BICEP2 Collaboration', 'Ade, P.A.R.', 'Aikin, R.W.', 'Barkats, D.', 'Benton, S.J.', 'Bishop, M.T.', 'Biwir, R.J.', 'Bock, J.J.', 'Brevik, J.A.', 'Buder, I.'],
          journal: 'Physical Review Letters',
          year: 2014,
          volume: '112',
          issue: '24',
          pages: '241101',
        },
      }],
      ['10.1038/s41586-020-2649-2', {
        doi: '10.1038/s41586-020-2649-2',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Room temperature superconductivity in a carbonaceous sulfur hydride',
          authors: ['Snider, E.', 'Dasenbrock-Gammon, N.', 'McBride, R.', 'Debessai, M.', 'Vindana, J.', 'Vencatasamy, K.', 'Lawler, K.V.', 'Hemley, R.J.'],
          journal: 'Nature',
          year: 2020,
          volume: '586',
          issue: '7830',
          pages: '373-377',
        },
      }],

      // 生物学领域 (5条)
      ['10.1126/science.1265323', {
        doi: '10.1126/science.1265323',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Targeted DNA demethylation of the human genome using CRISPR-Cas9-based technology',
          authors: ['Vojta, A.', 'Birch, P.', 'Mikami, M.', 'Liu, Y.', 'Oka, R.', 'Weissman, S.M.', 'Stadtfeld, M.'],
          journal: 'Science',
          year: 2016,
          volume: '352',
          issue: '6289',
          pages: 'aac8769',
        },
      }],
      ['10.1038/nature22364', {
        doi: '10.1038/nature22364',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Outbreak of a novel betacoronavirus associated with severe acute respiratory syndrome',
          authors: ['Zhu, N.', 'Zhang, D.', 'Wang, W.', 'Li, X.', 'Yang, B.', 'Song, J.', 'Zhao, X.', 'Huang, B.', 'Shi, W.', 'Lu, R.'],
          journal: 'Nature',
          year: 2020,
          volume: '579',
          issue: '7798',
          pages: '270-273',
        },
      }],
      ['10.1126/science.aat7427', {
        doi: '10.1126/science.aat7427',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Single-cell transcriptomics of 20 mouse organs creates a reference dataset for understanding cellular heterogeneity',
          authors: ['Tabula Muris Consortium', 'Tabula Muris', 'Almanzar, N.', 'Tung, J.W.', 'Twyman, S.C.', 'Udani, R.M.', 'Vaughn, C.W.', 'Wang, Y.', 'Wang, T.J.', 'Wang, S.'],
          journal: 'Cell',
          year: 2018,
          volume: '174',
          issue: '3',
          pages: '685-697',
        },
      }],
      ['10.1016/j.cell.2021.01.042', {
        doi: '10.1016/j.cell.2021.01.042',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Structure of the SARS-CoV-2 spike receptor-binding domain bound to the ACE2 receptor',
          authors: ['Lan, J.', 'Ge, J.', 'Yu, J.', 'Shan, S.', 'Zhou, H.', 'Fan, S.', 'Zhang, K.', 'Wang, Q.', 'Zhang, X.', 'Shi, X.'],
          journal: 'Cell',
          year: 2020,
          volume: '181',
          issue: '4',
          pages: '894-904',
        },
      }],
      ['10.1038/s41586-020-2169-0', {
        doi: '10.1038/s41586-020-2169-0',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Single-cell multi-omics analysis of human regulatory T cells reveals tissue-specific mechanisms of immune suppression',
          authors: ['Zheng, G.X.Y.', 'Terry, J.M.', 'Belgrader, P.', 'Ryvkin, P.', 'Bent, Z.W.', 'Wilson, R.', 'Ziraldo, S.B.', 'Wheeler, T.D.', 'McDermott, G.P.', 'Zhu, J.'],
          journal: 'Nature',
          year: 2017,
          volume: '550',
          issue: '7677',
          pages: '405-409',
        },
      }],

      // 化学/材料科学领域 (5条)
      ['10.1021/acsnano.7b06941', {
        doi: '10.1021/acsnano.7b06941',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Two-Dimensional Materials for High-Energy Batteries and Supercapacitors',
          authors: ['Tan, C.', 'Cao, X.', 'Wu, X.J.', 'He, Q.', 'Yang, J.', 'Zhang, X.', 'Chen, J.', 'Zhao, W.', 'Han, S.K.', 'Nag, A.'],
          journal: 'ACS Nano',
          year: 2017,
          volume: '11',
          issue: '8',
          pages: '7843-7854',
        },
      }],
      ['10.1038/nmat4941', {
        doi: '10.1038/nmat4941',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Perovskite solar cells: an emerging photovoltaic technology',
          authors: ['Park, N.G.', 'Grätzel, M.', 'Miyasaka, T.', 'Zhu, K.', 'Emery, K.'],
          journal: 'Nature Materials',
          year: 2016,
          volume: '15',
          issue: '1',
          pages: '24-36',
        },
      }],
      ['10.1021/jacs.7b09966', {
        doi: '10.1021/jacs.7b09966',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Metal-Organic Frameworks for Electronic and Photonic Applications',
          authors: ['Kreno, L.E.', 'Leong, K.', 'Farha, O.K.', 'Allendorf, M.', 'Van Duyne, R.P.', 'Hupp, J.T.'],
          journal: 'Journal of the American Chemical Society',
          year: 2012,
          volume: '134',
          issue: '36',
          pages: '14978-14981',
        },
      }],
      ['10.1126/science.aaf9741', {
        doi: '10.1126/science.aaf9741',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Design of hierarchical porous carbons from sustainable biomass for supercapacitor applications',
          authors: ['Wang, D.W.', 'Li, F.', 'Liu, M.', 'Lu, G.Q.', 'Cheng, H.M.'],
          journal: 'Angewandte Chemie International Edition',
          year: 2008,
          volume: '47',
          issue: '2',
          pages: '373-376',
        },
      }],
      ['10.1039/C8TA12985H', {
        doi: '10.1039/C8TA12985H',
        metadata: {
          type: 'JOURNAL_ARTICLE',
          title: 'Recent progress in two-dimensional materials beyond graphene for energy storage applications',
          authors: ['Liu, Y.', 'Xiao, H.', 'Zhang, Y.'],
          journal: 'Journal of Materials Chemistry A',
          year: 2019,
          volume: '7',
          issue: '13',
          pages: '7047-7054',
        },
      }],

      // ========== 学位论文 (5条) ==========
      ['10.13140/RG.2.2.12345.67890', {
        doi: '10.13140/RG.2.2.12345.67890',
        metadata: {
          type: 'THESIS',
          title: '基于深度学习的自然语言处理关键技术研究',
          authors: ['张三'],
          university: '清华大学',
          degreeType: 'DOCTOR',
          year: 2023,
        },
      }],
      ['10.13140/RG.2.2.23456.78901', {
        doi: '10.13140/RG.2.2.23456.78901',
        metadata: {
          type: 'THESIS',
          title: '图神经网络在推荐系统中的应用研究',
          authors: ['李四'],
          university: '北京大学',
          degreeType: 'MASTER',
          year: 2023,
        },
      }],
      ['10.13140/RG.2.2.34567.89012', {
        doi: '10.13140/RG.2.2.34567.89012',
        metadata: {
          type: 'THESIS',
          title: '大规模预训练语言模型的压缩与加速技术研究',
          authors: ['王五'],
          university: '中国科学院计算技术研究所',
          degreeType: 'DOCTOR',
          year: 2022,
        },
      }],
      ['10.13140/RG.2.2.45678.90123', {
        doi: '10.13140/RG.2.2.45678.90123',
        metadata: {
          type: 'THESIS',
          title: '基于Transformer的多模态学习研究',
          authors: ['赵六'],
          university: '复旦大学',
          degreeType: 'MASTER',
          year: 2023,
        },
      }],
      ['10.13140/RG.2.2.56789.01234', {
        doi: '10.13140/RG.2.2.56789.01234',
        metadata: {
          type: 'THESIS',
          title: '联邦学习中的隐私保护机制研究',
          authors: ['孙七'],
          university: '上海交通大学',
          degreeType: 'MASTER',
          year: 2022,
        },
      }],

      // ========== 书籍 (5条) ==========
      ['10.1007/978-3-030-12345-6', {
        doi: '10.1007/978-3-030-12345-6',
        metadata: {
          type: 'BOOK',
          title: 'Deep Learning',
          authors: ['Goodfellow, I.', 'Bengio, Y.', 'Courville, A.'],
          publisher: 'MIT Press',
          year: 2016,
          isbn: '978-0-262-03561-3',
          location: 'Cambridge, MA',
        },
      }],
      ['10.1007/978-1-4842-3456-7', {
        doi: '10.1007/978-1-4842-3456-7',
        metadata: {
          type: 'BOOK',
          title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow',
          authors: ['Géron, A.'],
          publisher: "O'Reilly Media",
          year: 2019,
          edition: '2nd ed.',
          isbn: '978-1-492-03261-2',
          location: 'Sebastopol, CA',
        },
      }],
      ['10.1007/978-981-15-6789-0', {
        doi: '10.1007/978-981-15-6789-0',
        metadata: {
          type: 'BOOK',
          title: '机器学习实战',
          authors: ['周志华'],
          publisher: '清华大学出版社',
          year: 2016,
          isbn: '978-7-302-42328-7',
          location: '北京',
        },
      }],
      ['10.1007/978-3-030-7890-1', {
        doi: '10.1007/978-3-030-7890-1',
        metadata: {
          type: 'BOOK',
          title: 'Natural Language Processing with Transformers',
          authors: ['Tunstall, L.', 'von Werra, L.', 'Wolf, T.'],
          publisher: "O'Reilly Media",
          year: 2022,
          isbn: '978-1-098-13567-8',
          location: 'Boston',
        },
      }],
      ['10.1007/978-3-658-34567-8', {
        doi: '10.1007/978-3-658-34567-8',
        metadata: {
          type: 'BOOK',
          title: 'Speech and Language Processing',
          authors: ['Jurafsky, D.', 'Martin, J.H.'],
          publisher: 'Prentice Hall',
          year: 2023,
          edition: '3rd ed.',
          isbn: '978-0-13-791594-9',
          location: 'Upper Saddle River, NJ',
        },
      }],

      // ========== 会议论文 (5条) ==========
      ['10.18653/v1/2020.emnlp-main.1', {
        doi: '10.18653/v1/2020.emnlp-main.1',
        metadata: {
          type: 'CONFERENCE_PAPER',
          title: 'Language Models Are Unsupervised Multitask Learners',
          authors: ['Radford, A.', 'Wu, J.', 'Child, R.', 'Luan, D.', 'Amodei, D.', 'Sutskever, I.'],
          conferenceName: 'Conference on Empirical Methods in Natural Language Processing (EMNLP)',
          year: 2019,
          pages: '246-255',
        },
      }],
      ['10.1109/CVPR.2017.1234', {
        doi: '10.1109/CVPR.2017.1234',
        metadata: {
          type: 'CONFERENCE_PAPER',
          title: 'Masked R-CNN',
          authors: ['He, K.', 'Gkioxari, G.', 'Dollár, P.', 'Girshick, R.'],
          conferenceName: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)',
          year: 2017,
          conferenceLocation: 'Honolulu, HI',
          pages: '2961-2969',
        },
      }],
      ['10.5555/3305381.3305512', {
        doi: '10.5555/3305381.3305512',
        metadata: {
          type: 'CONFERENCE_PAPER',
          title: 'Very Deep Convolutional Networks for Large-Scale Image Recognition',
          authors: ['Simonyan, K.', 'Zisserman, A.'],
          conferenceName: 'International Conference on Learning Representations (ICLR)',
          year: 2015,
          pages: '1-14',
        },
      }],
      ['10.18653/v1/P18-1001', {
        doi: '10.18653/v1/P18-1001',
        metadata: {
          type: 'CONFERENCE_PAPER',
          title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
          authors: ['Devlin, J.', 'Chang, M.-W.', 'Lee, K.', 'Toutanova, K.'],
          conferenceName: 'Annual Meeting of the Association for Computational Linguistics (ACL)',
          year: 2019,
          conferenceLocation: 'Florence, Italy',
          pages: '4171-4186',
        },
      }],
      ['10.1145/3331186.3331211', {
        doi: '10.1145/3331186.3331211',
        metadata: {
          type: 'CONFERENCE_PAPER',
          title: 'Deep Residual Learning for Image Recognition',
          authors: ['He, K.', 'Ren, X.', 'Sun, J.', 'Zhang, X.'],
          conferenceName: 'ACM SIGKDD International Conference on Knowledge Discovery & Data Mining (KDD)',
          year: 2016,
          conferenceLocation: 'San Francisco, CA',
          pages: '770-778',
        },
      }],

      // ========== 网页 (3条) ==========
      ['10.openai.com/blog/chatgpt', {
        doi: '10.openai.com/blog/chatgpt',
        metadata: {
          type: 'WEBPAGE',
          title: 'ChatGPT: Optimizing Language Models for Dialogue',
          authors: ['OpenAI Team'],
          websiteName: 'OpenAI Blog',
          url: 'https://openai.com/blog/chatgpt',
          publishDate: new Date('2022-11-30').toISOString().split('T')[0],
        },
      }],
      ['10.huggingface.co/docs', {
        doi: '10.huggingface.co/docs',
        metadata: {
          type: 'WEBPAGE',
          title: 'Transformers Documentation: State-of-the-art Natural Language Processing',
          authors: ['Hugging Face Team'],
          websiteName: 'Hugging Face Documentation',
          url: 'https://huggingface.co/docs/transformers/index',
          publishDate: new Date('2023-05-15').toISOString().split('T')[0],
        },
      }],
      ['10.tensorflow.org/tutorials', {
        doi: '10.tensorflow.org/tutorials',
        metadata: {
          type: 'WEBPAGE',
          title: 'TensorFlow Tutorials: Learn and Use ML',
          authors: ['Google AI Team'],
          websiteName: 'TensorFlow Official Website',
          url: 'https://www.tensorflow.org/tutorials',
          publishDate: new Date('2023-02-20').toISOString().split('T')[0],
        },
      }],

      // ========== 专利 (2条) ==========
      ['10.cnpatent/CN115674567A', {
        doi: '10.cnpatent/CN115674567A',
        metadata: {
          type: 'PATENT',
          title: '一种基于深度学习的文本分类方法和系统',
          inventors: ['张三', '李四', '王五'],
          patentNumber: 'CN115674567A',
          issuingAuthority: '中国国家知识产权局',
          filingDate: new Date('2022-08-15').toISOString().split('T')[0],
        },
      }],
      ['10.uspatent/US20230123456A1', {
        doi: '10.uspatent/US20230123456A1',
        metadata: {
          type: 'PATENT',
          title: 'Method and System for Large-Scale Language Model Training with Privacy Preservation',
          inventors: ['Smith, John R.', 'Johnson, Amy B.', 'Williams, Chris D.'],
          patentNumber: 'US20230123456A1',
          issuingAuthority: 'United States Patent and Trademark Office',
          filingDate: new Date('2022-07-20').toISOString().split('T')[0],
        },
      }],
    ];

    return new Map(data);
  }
}

interface DOIMatchCandidate {
  record: DOIMockRecord;
  score: number;
}

/** 导出单例实例 */
export const doiMockService = new DOIMockService();
