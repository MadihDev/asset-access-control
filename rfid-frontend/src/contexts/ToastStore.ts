import { createContext } from 'react'

export type Toast = {
  id: string
  title?: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export type ToastCtx = {
  toasts: Toast[]
  show: (t: Omit<Toast, 'id'>) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  remove: (id: string) => void
}

export const ToastContext = createContext<ToastCtx | undefined>(undefined)
