import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login'
import KnowledgeList from './components/KnowledgeList'
import KnowledgeCreate from './components/KnowledgeCreate'
import KnowledgeEdit from './components/KnowledgeEdit'
import Dashboard from './components/Dashboard'

function App() {
  const isAuthenticated = !!localStorage.getItem('token')

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">供应商调研知识库管理系统</h1>
            {isAuthenticated && (
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  window.location.href = '/login'
                }}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none"
              >
                退出登录
              </button>
            )}
          </div>
          {isAuthenticated && (
            <nav className="flex space-x-4 mt-4">
              <Link
                to="/dashboard"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                数据看板
              </Link>
              <Link
                to="/knowledge"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                知识库
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/knowledge" element={isAuthenticated ? <KnowledgeList /> : <Navigate to="/login" />} />
          <Route path="/knowledge/create" element={isAuthenticated ? <KnowledgeCreate /> : <Navigate to="/login" />} />
          <Route path="/knowledge/edit/:id" element={isAuthenticated ? <KnowledgeEdit /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
