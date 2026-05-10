import { create } from 'zustand';
import { libraryApi, type DocumentListItem, type DocumentDetail, type DocumentType, type CitationFormat, type CitationResult, type DOILookupResult } from '@/lib/api';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'authors' | 'year';
  sortOrder: 'asc' | 'desc';
  type: DocumentType | 'ALL';
}

interface FormDataState {
  type: DocumentType;
  title: string;
  authors: string;
  year: string;
  doi: string;
  url: string;
  abstract: string;
  keywords: string[];
  notes: string;
  journalData: {
    journal: string;
    volume: string;
    issue: string;
    pages: string;
  };
  thesisData: {
    university: string;
    degreeType: 'BACHELOR' | 'MASTER' | 'DOCTOR' | '';
  };
  bookData: {
    publisher: string;
    edition: string;
    isbn: string;
    location: string;
  };
  conferenceData: {
    conferenceName: string;
    conferenceLocation: string;
    editors: string;
    pages: string;
  };
  webpageData: {
    websiteName: string;
    url: string;
    accessDate: string;
    publishDate: string;
  };
  patentData: {
    patentNumber: string;
    inventors: string;
    filingDate: string;
    issuingAuthority: string;
  };
}

const initialFormData: FormDataState = {
  type: 'JOURNAL_ARTICLE',
  title: '',
  authors: '',
  year: '',
  doi: '',
  url: '',
  abstract: '',
  keywords: [],
  notes: '',
  journalData: {
    journal: '',
    volume: '',
    issue: '',
    pages: '',
  },
  thesisData: {
    university: '',
    degreeType: '',
  },
  bookData: {
    publisher: '',
    edition: '',
    isbn: '',
    location: '',
  },
  conferenceData: {
    conferenceName: '',
    conferenceLocation: '',
    editors: '',
    pages: '',
  },
  webpageData: {
    websiteName: '',
    url: '',
    accessDate: '',
    publishDate: '',
  },
  patentData: {
    patentNumber: '',
    inventors: '',
    filingDate: '',
    issuingAuthority: '',
  },
};

interface LibraryState {
  documents: DocumentListItem[];
  pagination: PaginationState;
  filters: FilterState;
  selectedIds: Set<string>;
  loading: boolean;
  error: string | null;
  activeDocument: DocumentDetail | null;
  citations: CitationResult[];
  formData: FormDataState;
  previewCitations: Record<CitationFormat, string>;
  doiLookupResult: DOILookupResult | null;
  doiLookupLoading: boolean;

  fetchDocuments: () => Promise<void>;
  setSearch: (search: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setActiveDocument: (document: DocumentDetail | null) => void;
  setFormData: (data: Partial<FormDataState>) => void;
  resetFormData: () => void;
  createDocument: () => Promise<DocumentDetail | null>;
  updateDocument: (id: string) => Promise<DocumentDetail | null>;
  deleteDocument: (id: string) => Promise<boolean>;
  batchDelete: () => Promise<boolean>;
  lookupDOI: (doi: string) => Promise<DOILookupResult | null>;
  generatePreview: (format?: CitationFormat) => Promise<void>;
  generateCitations: (ids: string[], format?: CitationFormat) => Promise<CitationResult[]>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  documents: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    type: 'ALL',
  },
  selectedIds: new Set(),
  loading: false,
  error: null,
  activeDocument: null,
  citations: [],
  formData: { ...initialFormData },
  previewCitations: {
    GBT7714: '',
    APA7: '',
    MLA9: '',
  },
  doiLookupResult: null,
  doiLookupLoading: false,

  fetchDocuments: async () => {
    const { filters, pagination } = get();
    
    try {
      set({ loading: true, error: null });
      
      const response = await libraryApi.getList({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        type: filters.type,
      });

      set({
        documents: response.data.documents,
        pagination: {
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        },
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || '获取文献列表失败',
        loading: false,
      });
    }
  },

  setSearch: (search: string) => {
    set((state) => ({
      filters: { ...state.filters, search },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  setFilters: (filters: Partial<FilterState>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
  },

  setPageSize: (pageSize: number) => {
    set((state) => ({
      pagination: { ...state.pagination, pageSize, page: 1 },
    }));
  },

  toggleSelect: (id: string) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedIds: newSelectedIds };
    });
  },

  selectAll: () => {
    const { documents } = get();
    set({ selectedIds: new Set(documents.map((doc) => doc.id)) });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  setActiveDocument: (document: DocumentDetail | null) => {
    set({ activeDocument: document });
  },

  setFormData: (data: Partial<FormDataState>) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
  },

  resetFormData: () => {
    set({ formData: { ...initialFormData }, doiLookupResult: null });
  },

  createDocument: async () => {
    const { formData } = get();
    
    try {
      set({ loading: true, error: null });

      const payload: any = {
        type: formData.type,
        title: formData.title,
        authors: formData.authors,
        year: formData.year ? parseInt(formData.year) : null,
        doi: formData.doi || null,
        url: formData.url || null,
        abstract: formData.abstract || null,
        keywords: formData.keywords,
        notes: formData.notes || null,
      };

      switch (formData.type) {
        case 'JOURNAL_ARTICLE':
          payload.journalData = {
            journal: formData.journalData.journal || null,
            volume: formData.journalData.volume || null,
            issue: formData.journalData.issue || null,
            pages: formData.journalData.pages || null,
          };
          break;
        case 'THESIS':
          payload.thesisData = {
            university: formData.thesisData.university || null,
            degreeType: formData.thesisData.degreeType || null,
          };
          break;
        case 'BOOK':
          payload.bookData = {
            publisher: formData.bookData.publisher || null,
            edition: formData.bookData.edition || null,
            isbn: formData.bookData.isbn || null,
            location: formData.bookData.location || null,
          };
          break;
        case 'CONFERENCE_PAPER':
          payload.conferenceData = {
            conferenceName: formData.conferenceData.conferenceName || null,
            conferenceLocation: formData.conferenceData.conferenceLocation || null,
            editors: formData.conferenceData.editors || null,
            pages: formData.conferenceData.pages || null,
          };
          break;
        case 'WEBPAGE':
          payload.webpageData = {
            websiteName: formData.webpageData.websiteName || null,
            url: formData.webpageData.url || null,
            accessDate: formData.webpageData.accessDate || null,
            publishDate: formData.webpageData.publishDate || null,
          };
          break;
        case 'PATENT':
          payload.patentData = {
            patentNumber: formData.patentData.patentNumber || null,
            inventors: formData.patentData.inventors || null,
            filingDate: formData.patentData.filingDate || null,
            issuingAuthority: formData.patentData.issuingAuthority || null,
          };
          break;
      }

      const response = await libraryApi.create(payload);
      
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || '创建文献失败',
        loading: false,
      });
      return null;
    }
  },

  updateDocument: async (id: string) => {
    const { formData } = get();
    
    try {
      set({ loading: true, error: null });

      const payload: any = {
        type: formData.type,
        title: formData.title,
        authors: formData.authors,
        year: formData.year ? parseInt(formData.year) : null,
        doi: formData.doi || null,
        url: formData.url || null,
        abstract: formData.abstract || null,
        keywords: formData.keywords,
        notes: formData.notes || null,
      };

      switch (formData.type) {
        case 'JOURNAL_ARTICLE':
          payload.journalData = {
            journal: formData.journalData.journal || null,
            volume: formData.journalData.volume || null,
            issue: formData.journalData.issue || null,
            pages: formData.journalData.pages || null,
          };
          break;
        case 'THESIS':
          payload.thesisData = {
            university: formData.thesisData.university || null,
            degreeType: formData.thesisData.degreeType || null,
          };
          break;
        case 'BOOK':
          payload.bookData = {
            publisher: formData.bookData.publisher || null,
            edition: formData.bookData.edition || null,
            isbn: formData.bookData.isbn || null,
            location: formData.bookData.location || null,
          };
          break;
        case 'CONFERENCE_PAPER':
          payload.conferenceData = {
            conferenceName: formData.conferenceData.conferenceName || null,
            conferenceLocation: formData.conferenceData.conferenceLocation || null,
            editors: formData.conferenceData.editors || null,
            pages: formData.conferenceData.pages || null,
          };
          break;
        case 'WEBPAGE':
          payload.webpageData = {
            websiteName: formData.webpageData.websiteName || null,
            url: formData.webpageData.url || null,
            accessDate: formData.webpageData.accessDate || null,
            publishDate: formData.webpageData.publishDate || null,
          };
          break;
        case 'PATENT':
          payload.patentData = {
            patentNumber: formData.patentData.patentNumber || null,
            inventors: formData.patentData.inventors || null,
            filingDate: formData.patentData.filingDate || null,
            issuingAuthority: formData.patentData.issuingAuthority || null,
          };
          break;
      }

      const response = await libraryApi.update(id, payload);
      
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || '更新文献失败',
        loading: false,
      });
      return null;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      await libraryApi.delete(id);
      
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        loading: false,
      }));
      
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || '删除文献失败',
        loading: false,
      });
      return false;
    }
  },

  batchDelete: async () => {
    const { selectedIds } = get();
    
    if (selectedIds.size === 0) return false;

    try {
      set({ loading: true, error: null });
      
      const ids = Array.from(selectedIds);
      await libraryApi.batchDelete(ids);
      
      set((state) => ({
        documents: state.documents.filter((doc) => !selectedIds.has(doc.id)),
        selectedIds: new Set(),
        loading: false,
      }));
      
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || '批量删除失败',
        loading: false,
      });
      return false;
    }
  },

  lookupDOI: async (doi: string) => {
    try {
      set({ doiLookupLoading: true, error: null });
      
      const response = await libraryApi.lookupDOI(doi);
      
      set({
        doiLookupResult: response.data,
        doiLookupLoading: false,
      });
      
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || 'DOI检索失败',
        doiLookupLoading: false,
      });
      return null;
    }
  },

  generatePreview: async (format: CitationFormat = 'GBT7714') => {
    const { formData } = get();
    
    if (!formData.title || !formData.authors) return;

    try {
      const mockId = 'preview';
      const response = await libraryApi.generateCitations([mockId], format);
      
      if (response.data && response.data.length > 0) {
        set((state) => ({
          previewCitations: {
            ...state.previewCitations,
            [format]: response.data[0].citationText,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  },

  generateCitations: async (ids: string[], format: CitationFormat = 'GBT7714') => {
    try {
      const response = await libraryApi.generateCitations(ids, format);
      
      set({ citations: response.data });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || error.message || '生成引用失败',
      });
      return [];
    }
  },
}));
