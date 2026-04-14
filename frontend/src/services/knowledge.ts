import api from './api';

// 分类相关接口
export interface KnowledgeCategory {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  children?: KnowledgeCategory[];
}

export interface KnowledgeCategoryCreate {
  name: string;
  description?: string;
  parent_id?: number | null;
  is_active?: boolean;
}

export interface KnowledgeCategoryUpdate {
  name?: string;
  description?: string;
  parent_id?: number | null;
  is_active?: boolean;
}

// 标签相关接口
export interface KnowledgeTag {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface KnowledgeTagCreate {
  name: string;
  is_active?: boolean;
}

export interface KnowledgeTagUpdate {
  name?: string;
  is_active?: boolean;
}

// 知识库相关接口
export interface KnowledgeBase {
  id: number;
  title: string;
  content: string;
  summary: string;
  type: string;
  status: string;
  category_id: number | null;
  supplier_id: number | null;
  survey_id: number | null;
  author_id: number;
  view_count: number;
  is_featured: boolean;
  is_active: boolean;
  meta_data: any | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  category?: KnowledgeCategory;
  tags?: KnowledgeTag[];
}

export interface KnowledgeBaseCreate {
  title: string;
  content: string;
  summary: string;
  type: string;
  status: string;
  category_id?: number | null;
  supplier_id?: number | null;
  survey_id?: number | null;
  tag_ids?: number[];
  is_featured?: boolean;
  is_active?: boolean;
  meta_data?: any;
}

export interface KnowledgeBaseUpdate {
  title?: string;
  content?: string;
  summary?: string;
  type?: string;
  status?: string;
  category_id?: number | null;
  supplier_id?: number | null;
  survey_id?: number | null;
  tag_ids?: number[];
  is_featured?: boolean;
  is_active?: boolean;
  meta_data?: any;
}

// 附件相关接口
export interface KnowledgeAttachment {
  id: number;
  knowledge_id: number;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_id: number;
  is_active: boolean;
  created_at: string;
  uploaded_by?: any;
}

export interface KnowledgeAttachmentCreate {
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
}

// 知识库服务
export const knowledgeService = {
  // 分类管理
  getCategories: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<KnowledgeCategory[]> => {
    const response = await api.get('/knowledge/categories', { params });
    return response.data;
  },

  createCategory: async (data: KnowledgeCategoryCreate): Promise<KnowledgeCategory> => {
    const response = await api.post('/knowledge/categories', data);
    return response.data;
  },

  getCategory: async (id: number): Promise<KnowledgeCategory> => {
    const response = await api.get(`/knowledge/categories/${id}`);
    return response.data;
  },

  updateCategory: async (id: number, data: KnowledgeCategoryUpdate): Promise<KnowledgeCategory> => {
    const response = await api.put(`/knowledge/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/knowledge/categories/${id}`);
  },

  // 标签管理
  getTags: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<KnowledgeTag[]> => {
    const response = await api.get('/knowledge/tags', { params });
    return response.data;
  },

  createTag: async (data: KnowledgeTagCreate): Promise<KnowledgeTag> => {
    const response = await api.post('/knowledge/tags', data);
    return response.data;
  },

  getTag: async (id: number): Promise<KnowledgeTag> => {
    const response = await api.get(`/knowledge/tags/${id}`);
    return response.data;
  },

  updateTag: async (id: number, data: KnowledgeTagUpdate): Promise<KnowledgeTag> => {
    const response = await api.put(`/knowledge/tags/${id}`, data);
    return response.data;
  },

  deleteTag: async (id: number): Promise<void> => {
    await api.delete(`/knowledge/tags/${id}`);
  },

  // 知识库管理
  getKnowledgeBases: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    type?: string;
    category_id?: number;
    supplier_id?: number;
    survey_id?: number;
    is_featured?: boolean;
    is_active?: boolean;
    search?: string;
  }): Promise<KnowledgeBase[]> => {
    const response = await api.get('/knowledge', { params });
    return response.data;
  },

  createKnowledgeBase: async (data: KnowledgeBaseCreate): Promise<KnowledgeBase> => {
    const response = await api.post('/knowledge', data);
    return response.data;
  },

  getKnowledgeBase: async (id: number): Promise<KnowledgeBase> => {
    const response = await api.get(`/knowledge/${id}`);
    return response.data;
  },

  updateKnowledgeBase: async (id: number, data: KnowledgeBaseUpdate): Promise<KnowledgeBase> => {
    const response = await api.put(`/knowledge/${id}`, data);
    return response.data;
  },

  deleteKnowledgeBase: async (id: number): Promise<void> => {
    await api.delete(`/knowledge/${id}`);
  },

  publishKnowledgeBase: async (id: number): Promise<KnowledgeBase> => {
    const response = await api.post(`/knowledge/${id}/publish`);
    return response.data;
  },

  // 附件管理
  getAttachments: async (knowledgeId: number): Promise<KnowledgeAttachment[]> => {
    const response = await api.get(`/knowledge/${knowledgeId}/attachments`);
    return response.data;
  },

  addAttachment: async (knowledgeId: number, data: KnowledgeAttachmentCreate): Promise<KnowledgeAttachment> => {
    const response = await api.post(`/knowledge/${knowledgeId}/attachments`, data);
    return response.data;
  },

  deleteAttachment: async (knowledgeId: number, attachmentId: number): Promise<void> => {
    await api.delete(`/knowledge/${knowledgeId}/attachments/${attachmentId}`);
  },

  uploadAttachment: async (knowledgeId: number, file: File): Promise<KnowledgeAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/knowledge/${knowledgeId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};