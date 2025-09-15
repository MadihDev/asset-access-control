import React from 'react'

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <table className={"min-w-full divide-y divide-gray-200 " + (className || '')}>{children}</table>
)

export const Thead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <thead className={"bg-gray-50 " + (className || '')}>{children}</thead>
)

export const Tbody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <tbody className={"bg-white divide-y divide-gray-200 " + (className || '')}>{children}</tbody>
)

export const Tr: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <tr className={className}>{children}</tr>
)

export const Th: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <th onClick={onClick} className={"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider " + (className || '')}>{children}</th>
)

export const Td: React.FC<{ children: React.ReactNode; className?: string; colSpan?: number }> = ({ children, className, colSpan }) => (
  <td colSpan={colSpan} className={"px-4 py-3 whitespace-nowrap text-sm text-gray-700 " + (className || '')}>{children}</td>
)
