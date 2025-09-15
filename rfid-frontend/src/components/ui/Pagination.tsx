import React from 'react'

type Props = {
  page: number
  hasPrev?: boolean
  hasNext?: boolean
  onPrev: () => void
  onNext: () => void
  totalPages?: number
  className?: string
  summaryLeft?: React.ReactNode
}

export const Pagination: React.FC<Props> = ({ page, hasPrev, hasNext, onPrev, onNext, totalPages, className, summaryLeft }) => {
  return (
    <div className={(className || '') + ' px-4 py-3 flex items-center justify-between border-t border-gray-200'}>
      <div className="text-sm text-gray-600">
        {summaryLeft ?? (
          <span>Page {page} {totalPages ? `of ${totalPages}` : ''}</span>
        )}
      </div>
      <div className="space-x-2">
        <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={!hasPrev} onClick={onPrev}>Previous</button>
        <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={!hasNext} onClick={onNext}>Next</button>
      </div>
    </div>
  )
}
