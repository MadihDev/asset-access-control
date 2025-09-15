import React from 'react'

type Props = {
  onSubmit: (e: React.FormEvent) => void
  onReset: () => void
  isRefreshing?: boolean
  children: React.ReactNode
  right?: React.ReactNode
}

export const FilterBar: React.FC<Props> = ({ onSubmit, onReset, isRefreshing, children, right }) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        {children}
      </div>
      <div className="md:ml-auto flex items-center gap-2">
        <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-md">Apply</button>
        <button type="button" className="px-3 py-2 bg-white border rounded-md" onClick={onReset}>Reset</button>
        {isRefreshing ? <div className="hidden md:block text-sm text-gray-500">Refreshing…</div> : null}
        {right}
      </div>
    </form>
  )
}
