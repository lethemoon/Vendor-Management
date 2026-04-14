import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { knowledgeService, KnowledgeBase } from '../services/knowledge';

const KnowledgeList = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchKnowledgeBases = async () => {
    setLoading(true);
    try {
      const data = await knowledgeService.getKnowledgeBases({ search: searchTerm });
      setKnowledgeBases(data);
    } catch (error) {
      console.error('获取知识库列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, [searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCreate = () => {
    // 导航到创建页面
    navigate('/knowledge/create');
  };

  const handleView = (id: number) => {
    // 导航到详情页面
    navigate(`/knowledge/${id}`);
  };

  const handleEdit = (id: number) => {
    // 导航到编辑页面
    navigate(`/knowledge/edit/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这个知识库吗？')) {
      try {
        await knowledgeService.deleteKnowledgeBase(id);
        fetchKnowledgeBases();
      } catch (error) {
        console.error('删除知识库失败:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">知识库管理</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          创建知识库
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索知识库..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeBases.map((knowledge) => (
            <div key={knowledge.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${knowledge.status === 'published' ? 'bg-green-100 text-green-800' : knowledge.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {knowledge.status}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {knowledge.type}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {knowledge.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {knowledge.summary}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    浏览次数: {knowledge.view_count}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(knowledge.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={() => handleEdit(knowledge.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(knowledge.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && knowledgeBases.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-600">暂无知识库数据</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeList;