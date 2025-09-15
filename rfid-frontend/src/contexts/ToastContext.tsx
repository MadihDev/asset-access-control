import React, { useCallback, useMemo, useState } from 'react'
import { ToastContext, type Toast } from './ToastStore'

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, duration: 3500, type: 'info', ...t }
    setToasts((prev) => [...prev, toast])
    const timeout = toast.duration ?? 3500
    if (timeout > 0) {
      setTimeout(() => remove(id), timeout)
    }
  }, [remove])

  const success = useCallback((message: string, title?: string) => show({ message, title, type: 'success' }), [show])
  const error = useCallback((message: string, title?: string) => show({ message, title, type: 'error' }), [show])

  const value = useMemo(() => ({ toasts, show, success, error, remove }), [toasts, show, success, error, remove])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

