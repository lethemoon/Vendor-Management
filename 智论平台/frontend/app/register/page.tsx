'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [registerType, setRegisterType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      setIsLoading(false);
      return;
    }

    try {
      const data = registerType === 'email'
        ? { email, password, name }
        : { phone, password, name };

      const response = await authAPI.register(data);
      
      if (response.success) {
        login(response.data.user, response.data.token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            注册智论平台
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI论文写作助手
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="flex mb-4">
              <button
                type="button"
                onClick={() => setRegisterType('email')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md ${
                  registerType === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                邮箱注册
              </button>
              <button
                type="button"
                onClick={() => setRegisterType('phone')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md ${
                  registerType === 'phone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                手机号注册
              </button>
            </div>

            <div>
              <label htmlFor="name" className="sr-only">
                用户姓名
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="用户姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {registerType === 'email' ? (
              <div>
                <label htmlFor="email" className="sr-only">
                  邮箱地址
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="sr-only">
                  手机号
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密码（至少8位，包含字母和数字）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              注册即表示您同意我们的{' '}
              <a href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
                服务条款
              </a>{' '}
              和{' '}
              <a href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
                隐私政策
              </a>
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              已有账号？{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                立即登录
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
