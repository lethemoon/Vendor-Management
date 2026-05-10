import axios from 'axios';
import { useAuthStore } from '@/lib/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export const authAPI = {
  register: async (data: {
    email?: string;
    phone?: string;
    password: string;
    name: string;
  }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  
  login: async (data: {
    email?: string;
    phone?: string;
    password: string;
  }) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  forgotPassword: async (data: { email: string }) => {
    const response = await apiClient.post('/auth/forgot-password', data);
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },
  
  updateProfile: async (data: {
    name?: string;
    avatar?: string;
  }) => {
    const response = await apiClient.put('/user/profile', data);
    return response.data;
  },
};

export interface Paper {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: 'draft' | 'analyzed' | 'rewriting' | 'completed';
  plagiarismRate?: number;
  aigcRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParagraphAnalysis {
  index: number;
  text: string;
  plagiarismRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Analysis {
  totalWords: number;
  plagiarismRate: number;
  aigcRate: number;
  paragraphs: ParagraphAnalysis[];
}

export interface RewriteOptions {
  strength: 'light' | 'medium' | 'heavy';
  style: 'academic' | 'formal' | 'concise';
  protectedTerms: string[];
  versions: number;
  selectedParagraphs: number[];
}

export interface RewriteVersion {
  versionId: string;
  type: 'conservative' | 'balanced' | 'aggressive';
  label: 'conservative' | 'balanced' | 'aggressive';
  labelText: string;
  text: string;
  confidence: number;
  estimatedScore?: number;
  modificationTypes?: string[];
  changesSummary?: string;
  diff?: DiffSegment[];
}

export interface RewriteResult {
  paragraphIndex: number;
  originalText: string;
  versions: RewriteVersion[];
  status: 'pending' | 'processing' | 'completed';
}

export const paperAPI = {
  upload: async (data: { title: string; content: string }) => {
    const response = await apiClient.post('/papers/upload', data);
    return response.data;
  },

  analyze: async (id: string) => {
    const response = await apiClient.post(`/papers/${id}/analyze`);
    return response.data;
  },

  rewrite: async (id: string, data: RewriteOptions) => {
    const response = await apiClient.post(`/papers/${id}/rewrite`, data, {
      responseType: 'stream',
    });
    return response;
  },

  getReport: async (id: string) => {
    const response = await apiClient.get(`/papers/${id}/report`);
    return response.data;
  },

  getList: async () => {
    const response = await apiClient.get('/papers');
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/papers/${id}`);
    return response.data;
  },

  saveDraft: async (id: string, data: { title: string; content: string }) => {
    const response = await apiClient.put(`/papers/${id}`, data);
    return response.data;
  },
};

// ========== AIGC Detection & Optimization API Types ==========

export interface DetectRequest {
  content: string;
  title?: string;
  source?: 'paste' | 'file_import' | 'paper_linked';
  paperId?: string;
}

export interface DetectResponse {
  success: boolean;
  data: {
    detectionId: string;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
    summary: string;
    paragraphs: ParagraphResult[];
    issueStatistics: Record<string, number>;
    processingTime: number;
    creditsConsumed: number;
    title?: string;
    createdAt: string;
  };
}

export interface ParagraphResult {
  index: number;
  preview: string;
  fullText: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
  issues: string[];
  wordCount: number;
  startOffset?: number;
  endOffset?: number;
  ruleBreakdown?: {
    ttr: number;
    sentenceVariance: number;
    vocabulary: number;
    transitions: number;
    passiveVoice: number;
  };
}

export interface AIGCRewriteVersion {
  versionId: string;
  label: 'conservative' | 'balanced' | 'aggressive';
  labelText: string;
  text: string;
  estimatedScore: number;
  confidence: number;
  changesSummary: string;
  diff?: DiffSegment[];
}

export interface DiffSegment {
  type: 'equal' | 'delete' | 'insert' | 'replace';
  value: string;
}

export interface RewriteRequest {
  targetParagraphIndices: number[];
  regenerateForVersionId?: string;
}

export interface AdoptVersionRequest {
  versionId: string;
  targetParagraphIndices: number[];
}

export interface RecheckRequest {
  useLatestText?: boolean;
}

export interface OptimizationRecordOutput {
  id: string;
  roundNumber: number;
  operationType: 'InitialDetect' | 'Rewrite' | 'Recheck';
  beforeAigcRate: number;
  afterAigcRate: number;
  rateChange: number;
  targetParagraphIndices: number[];
  processingTimeMs: number;
  costCredits: number;
  createdAt: string;
}

export interface HistoryRecord {
  id: string;
  title?: string;
  initialRate: number;
  finalRate: number;
  optimizationRounds: number;
  status: 'Pending' | 'Analyzing' | 'Optimizing' | 'Completed' | 'Abandoned';
  wordCount: number;
  creditsConsumed: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  sortBy?: string;
  search?: string;
}

export interface HistoryDetailResponse {
  id: string;
  detectionData: DetectResponse['data'];
  optimizationRecords: OptimizationRecordOutput[];
  currentText: string;
  totalCreditsConsumed: number;
}

// ========== Library & Citation Management API Types ==========

export type DocumentType = 'JOURNAL_ARTICLE' | 'THESIS' | 'BOOK' | 'CONFERENCE_PAPER' | 'WEBPAGE' | 'PATENT';
export type DegreeType = 'BACHELOR' | 'MASTER' | 'DOCTOR';
export type CitationFormat = 'GBT7714' | 'APA7' | 'MLA9';

export interface DocumentListItem {
  id: string;
  type: DocumentType;
  title: string;
  authors: string;
  year: number | null;
  journal?: string | null;
  university?: string | null;
  publisher?: string | null;
  doi: string | null;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail {
  id: string;
  type: DocumentType;
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  keywords: string[];
  notes: string | null;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
  journalData?: { journal: string | null; volume: string | null; issue: string | null; pages: string | null } | null;
  thesisData?: { university: string | null; degreeType: DegreeType | null } | null;
  bookData?: { publisher: string | null; edition: string | null; isbn: string | null; location: string | null } | null;
  conferenceData?: { conferenceName: string | null; conferenceLocation: string | null; editors: string | null; pages: string | null } | null;
  webpageData?: { websiteName: string | null; url: string | null; accessDate: string | null; publishDate: string | null } | null;
  patentData?: { patentNumber: string | null; inventors: string | null; filingDate: string | null; issuingAuthority: string | null } | null;
}

export interface DOILookupResult {
  found: boolean;
  metadata: {
    type: DocumentType;
    title: string;
    authors: string[];
    journal?: string;
    year?: number;
    volume?: string;
    issue?: string;
    pages?: string;
    doi: string;
    university?: string;
    degreeType?: DegreeType;
    publisher?: string;
    isbn?: string;
    location?: string;
    conferenceName?: string;
    conferenceLocation?: string;
    websiteName?: string;
    url?: string;
    patentNumber?: string;
    inventors?: string;
    filingDate?: string;
    issuingAuthority?: string;
  } | null;
  matchType: 'exact' | 'trimmed' | 'prefix' | null;
  lookupTimeMs: number;
}

export interface CitationResult {
  documentId: string;
  format: CitationFormat;
  citationText: string;
  title: string;
  authors: string;
}

export interface LibraryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'authors' | 'year';
  sortOrder?: 'asc' | 'desc';
  type?: DocumentType | 'ALL';
}

// ========== AIGC Detection & Optimization API ==========

export const aigcApi = {
  detect: async (data: DetectRequest): Promise<DetectResponse> => {
    const response = await apiClient.post('/aigc/detect', data);
    return response.data;
  },

  getDetection: async (id: string): Promise<DetectResponse> => {
    const response = await apiClient.get(`/aigc/detect/${id}`);
    return response.data;
  },

  rewrite: async (
    id: string,
    data: RewriteRequest,
    onEvent?: (event: string, eventData: any) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<any> => {
    try {
      const token = useAuthStore.getState().token;
      const url = `${API_URL}/aigc/detect/${id}/rewrite`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const lineData = line.slice(6).trim();
              if (!lineData || lineData === '[DONE]') continue;

              const eventData = JSON.parse(lineData);

              if (eventData.event && onEvent) {
                onEvent(eventData.event, eventData.data || eventData);
              }

              if (eventData.type === 'complete') {
                onComplete?.();
              } else if (eventData.type === 'error') {
                onError?.(new Error(eventData.message || 'SSE error'));
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE line:', parseError);
            }
          }
        }

        onComplete?.();

        return {
          body: response.body,
          status: response.status,
        };
      }

      return response;
    } catch (error: any) {
      onError?.(error);
      throw error;
    }
  },

  adoptVersion: async (
    id: string,
    data: AdoptVersionRequest
  ): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.post(
      `/aigc/detect/${id}/adopt`,
      data
    );
    return response.data;
  },

  recheck: async (
    id: string,
    data?: RecheckRequest
  ): Promise<{
    success: boolean;
    data: {
      newDetectionId?: string;
      previousScore: number;
      currentScore: number;
      scoreChange: number;
      updatedParagraphs?: ParagraphResult[];
      optimizationRecord?: OptimizationRecordOutput;
      creditsConsumed: number;
    };
  }> => {
    const response = await apiClient.post(
      `/aigc/detect/${id}/recheck`,
      data || {}
    );
    return response.data;
  },

  getHistory: async (
    params?: HistoryQueryParams
  ): Promise<{
    success: boolean;
    data: {
      records: HistoryRecord[];
      total: number;
      hasMore: boolean;
    };
  }> => {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/aigc/history${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },

  getHistoryDetail: async (
    id: string
  ): Promise<{
    success: boolean;
    data: HistoryDetailResponse;
  }> => {
    const response = await apiClient.get(`/aigc/history/${id}`);
    return response.data;
  },

  deleteHistory: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/aigc/history/${id}`);
    return response.data;
  },
};

// ========== Library & Citation Management API ==========

export const libraryApi = {
  getList: async (params?: LibraryListParams): Promise<{
    success: boolean;
    data: {
      documents: DocumentListItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      statistics: {
        totalCount: number;
        thisMonthCount: number;
        typeDistribution: Record<DocumentType, number>;
        totalCitations: number;
      };
    };
  }> => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.type && params.type !== 'ALL') queryParams.append('type', params.type);

    const queryString = queryParams.toString();
    const url = `/library/documents${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<{
    success: boolean;
    data: DocumentDetail;
  }> => {
    const response = await apiClient.get(`/library/documents/${id}`);
    return response.data;
  },

  create: async (data: Partial<DocumentDetail>): Promise<{
    success: boolean;
    data: DocumentDetail;
  }> => {
    const response = await apiClient.post('/library/documents', data);
    return response.data;
  },

  update: async (id: string, data: Partial<DocumentDetail>): Promise<{
    success: boolean;
    data: DocumentDetail;
  }> => {
    const response = await apiClient.put(`/library/documents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/library/documents/${id}`);
    return response.data;
  },

  batchDelete: async (ids: string[]): Promise<{ success: boolean; deletedCount: number; message: string }> => {
    const response = await apiClient.post('/library/documents/batch-delete', { ids });
    return response.data;
  },

  lookupDOI: async (doi: string): Promise<{
    success: boolean;
    data: DOILookupResult;
  }> => {
    const response = await apiClient.post('/library/doi/lookup', { doi });
    return response.data;
  },

  generateCitations: async (
    ids: string[],
    format: CitationFormat = 'GBT7714'
  ): Promise<{
    success: boolean;
    data: CitationResult[];
  }> => {
    const response = await apiClient.post('/library/citations/generate', { documentIds: ids, format });
    return response.data;
  },

  exportCitations: async (
    ids: string[],
    format: CitationFormat,
    options?: { includeHeader?: boolean; lineNumbers?: boolean }
  ): Promise<{ success: boolean; data: { content: string; filename: string; mimeType: string } }> => {
    const response = await apiClient.post('/library/export', { documentIds: ids, format, ...options });
    return response.data;
  },

  getPaperCitations: async (paperId: string): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      documentId: string;
      citationNumber: number;
      citationText: string;
      format: CitationFormat;
      position: number | null;
      document: DocumentListItem;
    }>;
  }> => {
    const response = await apiClient.get(`/papers/${paperId}/citations`);
    return response.data;
  },

  insertCitation: async (
    paperId: string,
    ids: string[],
    format?: CitationFormat,
    position?: number
  ): Promise<{
    success: boolean;
    data: {
      citations: Array<{ id: string; citationNumber: number; citationText: string }>;
      referenceList: string[];
    };
  }> => {
    const response = await apiClient.post(`/papers/${paperId}/citations`, {
      documentIds: ids,
      format: format || 'GBT7714',
      position,
    });
    return response.data;
  },

  removeCitation: async (paperId: string, citationId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/papers/${paperId}/citations/${citationId}`);
    return response.data;
  },
};
