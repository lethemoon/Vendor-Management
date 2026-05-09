import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '智论AI - AI论文写作助手',
  description: '基于人工智能的学术论文写作、降重与AIGC检测平台',
  keywords: ['论文写作', 'AI降重', 'AIGC检测', '学术助手'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
