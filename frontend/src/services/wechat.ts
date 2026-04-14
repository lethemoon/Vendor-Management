import api from './api';

export interface WeChatLoginRequest {
  code: string;
}

export interface ConfirmationStep {
  id: number;
  confirmation_id: number;
  step_order: number;
  title: string;
  assignee_id: number;
  status: 'pending' | 'confirmed' | 'rejected';
  comment?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface TeamConfirmation {
  id: number;
  type: 'project_start' | 'phase_transition' | 'supplier_shortlist' | 'award_decision' | 'acceptance';
  title: string;
  description?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  related_id?: number;
  related_type?: string;
  initiator_id: number;
  created_at: string;
  updated_at?: string;
  steps: ConfirmationStep[];
}

export interface ConfirmationStepCreate {
  step_order: number;
  title: string;
  assignee_id: number;
}

export interface TeamConfirmationCreate {
  type: 'project_start' | 'phase_transition' | 'supplier_shortlist' | 'award_decision' | 'acceptance';
  title: string;
  description?: string;
  related_id?: number;
  related_type?: string;
  steps: ConfirmationStepCreate[];
}

export interface ConfirmationStepUpdate {
  status: 'pending' | 'confirmed' | 'rejected';
  comment?: string;
}

export interface WeChatMessageRequest {
  to_user: string;
  content: string;
}

export interface WeChatNewsArticle {
  title: string;
  description?: string;
  url?: string;
  picurl?: string;
}

export interface WeChatNewsMessageRequest {
  to_user: string;
  articles: WeChatNewsArticle[];
}

export interface AIChatRequest {
  question: string;
  context?: string;
}

export interface AIReportRequest {
  project_name: string;
  supplier_name: string;
  phase: string;
  data: Record<string, any>;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: Record<string, any>;
}

export const wechatService = {
  login: async (code: string) => {
    const response = await api.post('/wechat/login', { code });
    return response.data;
  },

  createConfirmation: async (data: TeamConfirmationCreate) => {
    const response = await api.post<TeamConfirmation>('/wechat/confirmations', data);
    return response.data;
  },

  listConfirmations: async (status?: string, type?: string) => {
    const params: Record<string, any> = {};
    if (status) params.status = status;
    if (type) params.type = type;
    const response = await api.get<TeamConfirmation[]>('/wechat/confirmations', { params });
    return response.data;
  },

  getConfirmation: async (id: number) => {
    const response = await api.get<TeamConfirmation>(`/wechat/confirmations/${id}`);
    return response.data;
  },

  updateConfirmationStep: async (
    confirmationId: number,
    stepId: number,
    data: ConfirmationStepUpdate
  ) => {
    const response = await api.put<TeamConfirmation>(
      `/wechat/confirmations/${confirmationId}/steps/${stepId}`,
      data
    );
    return response.data;
  },

  sendTextMessage: async (data: WeChatMessageRequest) => {
    const response = await api.post('/wechat/messages/text', data);
    return response.data;
  },

  sendNewsMessage: async (data: WeChatNewsMessageRequest) => {
    const response = await api.post('/wechat/messages/news', data);
    return response.data;
  },

  aiChat: async (data: AIChatRequest) => {
    const response = await api.post<AIResponse>('/wechat/ai/chat', data);
    return response.data;
  },

  generateReport: async (data: AIReportRequest) => {
    const response = await api.post<AIResponse>('/wechat/ai/report', data);
    return response.data;
  },
};
