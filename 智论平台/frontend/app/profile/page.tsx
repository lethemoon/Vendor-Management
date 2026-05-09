'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI, authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await userAPI.updateProfile({ name });
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '更新失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      router.push('/login');
    } catch (err) {
      logout();
      router.push('/login');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            个人中心
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  基本信息
                </h2>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      用户姓名
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      邮箱地址
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      邮箱不可修改
                    </p>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="text-green-600 text-sm">
                      更新成功！
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '更新中...' : '保存修改'}
                  </button>
                </form>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  账号信息
                </h2>
                
                <dl className="divide-y divide-gray-200">
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-4">
                    <dt className="text-sm font-medium text-gray-500">用户ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.id}</dd>
                  </div>
                  
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-4">
                    <dt className="text-sm font-medium text-gray-500">角色</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.role}</dd>
                  </div>
                  
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-4">
                    <dt className="text-sm font-medium text-gray-500">注册时间</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                快捷操作
              </h2>
              
              <div className="space-y-3">
                <a
                  href="/dashboard"
                  className="block w-full text-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                >
                  前往工作台
                </a>
                
                <button
                  onClick={handleLogout}
                  className="block w-full text-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
