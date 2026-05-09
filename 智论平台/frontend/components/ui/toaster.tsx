"use client"

import { useState, useEffect, createContext, useContext } from 'react'

type ToastType = 'default' | 'success' | 'error' | 'warning'

interface Toast {
  id: string
  title?: string
  description?: string
  type?: ToastType
}

interface ToasterContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToasterContext = createContext<ToasterContextValue | null>(null)

export function useToast() {
  const context = useContext(ToasterContext)
  if (!context) throw new Error('useToast must be used within ToasterProvider')
  return context
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => removeToast(id), 4000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToasterContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 shadow-lg max-w-sm animate-in slide-in-from-right ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              'bg-white border-gray-200 text-gray-800'
            }`}
          >
            {toast.title && <div className="font-medium text-sm">{toast.title}</div>}
            {toast.description && <div className="text-xs opacity-80 mt-1">{toast.description}</div>}
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  )
}

export function Toaster() {
  return null
}
