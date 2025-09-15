import React from 'react'
import { useToast } from '../hooks/useToast'

export const ToastViewport: React.FC = () => {
  const { toasts, remove } = useToast()
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`max-w-sm rounded-md shadow-lg p-3 text-sm border ${
          t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          t.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          {t.title ? <div className="font-semibold mb-1">{t.title}</div> : null}
          <div>{t.message}</div>
          <button className="mt-2 text-xs text-gray-500 hover:text-gray-700" onClick={() => remove(t.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}
