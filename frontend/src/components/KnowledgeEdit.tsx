import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { knowledgeService, KnowledgeBaseUpdate, KnowledgeCategory, KnowledgeTag } from '../services/knowledge';

const KnowledgeEdit = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<KnowledgeBaseUpdate>({
    title: '',
    content: '',
    summary: '',
    type: 'article',
    status: 'draft',
    category_id: null,
    tag_ids: [],
    is_featured: false,
    is_active: true,
  });
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [tags, setTags] = useState<KnowledgeTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchKnowledgeBase = async () => {
    if (!id) return;
    try {
      const data = await knowledgeService.getKnowledgeBase(Number(id));
      setFormData({
        title: data.title,
        content: data.content,
        summary: data.summary,
        type: data.type,
        status: data.status,
        category_id: data.category?.id || null,
        tag_ids: data.tags?.map(tag => tag.id) || [],
        is_featured: data.is_featured || false,
        is_active: data.is_active || true,
      });
    } catch (error) {
      console.error('获取知识库详情失败:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await knowledgeService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await knowledgeService.getTags();
      setTags(data);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
    fetchCategories();
    fetchTags();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as any;
    const { name, value, type } = target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? target.checked : value,
    }));
  };

  const handleTagChange = (tagId: number) => {
    setFormData(prev => {
      const currentTags = prev.tag_ids || [];
      if (currentTags.includes(tagId)) {
        return {
          ...prev,
          tag_ids: currentTags.filter(id => id !== tagId),
        };
      } else {
        return {
          ...prev,
          tag_ids: [...currentTags, tagId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setLoading(true);

    try {
      await knowledgeService.updateKnowledgeBase(Number(id), formData);
      navigate('/knowledge');
    } catch (err: any) {
      setError(err.response?.data?.detail || '更新知识库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">编辑知识库</h2>
        <button
          onClick={() => navigate('/knowledge')}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none"
        >
          返回列表
        </button>
      </div>

      <form className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            标题 *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
            摘要 *
          </label>
          <textarea
            id="summary"
            name="summary"
            required
            value={formData.summary}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            内容 *
          </label>
          <textarea
            id="content"
            name="content"
            required
            value={formData.content}
            onChange={handleChange}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              类型 *
            </label>
            <select
              id="type"
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="article">文章</option>
              <option value="document">文档</option>
              <option value="faq">常见问题</option>
              <option value="guideline">指南</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              状态 *
            </label>
            <select
              id="status"
              name="status"
              required
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
            分类
          </label>
          <select
            id="category_id"
            name="category_id"
            value={formData.category_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">请选择分类</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <label key={tag.id} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={(formData.tag_ids || []).includes(tag.id)}
                  onChange={() => handleTagChange(tag.id)}
                  className="form-checkbox h-4 w-4 text-indigo-600"
                />
                <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="is_featured"
            name="is_featured"
            type="checkbox"
            checked={formData.is_featured}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-700">
            推荐
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
            激活
          </label>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/knowledge')}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? '更新中...' : '更新知识库'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default KnowledgeEdit;