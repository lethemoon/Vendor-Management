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
