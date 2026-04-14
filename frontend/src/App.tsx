import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import KnowledgeList from './components/KnowledgeList'
import KnowledgeCreate from './components/KnowledgeCreate'
import KnowledgeEdit from './components/KnowledgeEdit'

function App() {
  const isAuthenticated = !!localStorage.getItem('token')

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
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
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/knowledge" /> : <Navigate to="/login" />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/knowledge" /> : <Login />} />
          <Route path="/knowledge" element={isAuthenticated ? <KnowledgeList /> : <Navigate to="/login" />} />
          <Route path="/knowledge/create" element={isAuthenticated ? <KnowledgeCreate /> : <Navigate to="/login" />} />
          <Route path="/knowledge/edit/:id" element={isAuthenticated ? <KnowledgeEdit /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
