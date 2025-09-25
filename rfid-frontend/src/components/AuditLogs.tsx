import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Table, Thead, Tbody, Tr, Th, Td } from './ui/DataTable'
import { Pagination } from './ui/Pagination'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_GRANT' | 'PERMISSION_REVOKE' | 'ACCESS_ATTEMPT'

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'entityType'>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [userId, setUserId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const params = useMemo(() => ({ page, limit, sortBy, sortOrder, action, userId, entityType, startDate, endDate }), [page, limit, sortBy, sortOrder, action, userId, entityType, startDate, endDate])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const res = await api.get('/api/audit', { params })
      return res.data
    }
  })

  interface AuditRow { id: string; timestamp?: string | Date; action: AuditAction; entityType: string; entityId: string; userId?: string; ipAddress?: string; userAgent?: string }
  const rows: AuditRow[] = data?.data || []
  const pagination = data?.pagination

  const toggleSort = (field: 'timestamp' | 'action' | 'entityType') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Audit Logs</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Action</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={action} onChange={e => { setAction(e.target.value as AuditAction | ''); setPage(1) }}>
              <option value="">All</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="PERMISSION_GRANT">PERMISSION_GRANT</option>
              <option value="PERMISSION_REVOKE">PERMISSION_REVOKE</option>
              <option value="ACCESS_ATTEMPT">ACCESS_ATTEMPT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={userId} onChange={e => { setUserId(e.target.value); setPage(1) }} placeholder="Filter by user id" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1) }} placeholder="e.g. User, RFIDKey" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} />
          </div>
        </div>
        <div className="md:ml-auto flex items-center gap-2">
          <button type="button" className="px-3 py-2 bg-white border rounded-md" onClick={() => { setAction(''); setUserId(''); setEntityType(''); setStartDate(''); setEndDate(''); setPage(1) }}>Reset</button>
        </div>
      </div>

        {(() => {
          if (isLoading) {
            return <div className="py-16 text-center text-gray-600">Loading audit logs…</div>
          }
          if (isError) {
            let message = 'Failed to load audit logs. Is the API running and reachable?'
            const errUnknown: unknown = error
            if (errUnknown && typeof errUnknown === 'object' && 'message' in errUnknown) {
              const m = (errUnknown as { message?: string }).message
              if (typeof m === 'string') message = m
            }
            return <div className="py-4 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{message}</div>
          }
          if (rows.length === 0) {
            return <div className="py-16 text-center text-gray-500">No audit logs found yet. Perform some actions (e.g., login, create/update a user) and refresh.</div>
          }
          return (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th className="cursor-pointer select-none" onClick={() => toggleSort('timestamp')}>
                      <div className="flex items-center gap-1">
                        Timestamp
                        {sortBy === 'timestamp' && (
                          <span className="text-xs">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </Th>
                    <Th className="cursor-pointer select-none" onClick={() => toggleSort('action')}>
                      <div className="flex items-center gap-1">
                        Action
                        {sortBy === 'action' && (
                          <span className="text-xs">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </Th>
                    <Th className="cursor-pointer select-none" onClick={() => toggleSort('entityType')}>
                      <div className="flex items-center gap-1">
                        Entity
                        {sortBy === 'entityType' && (
                          <span className="text-xs">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </Th>
                    <Th>User</Th>
                    <Th>Entity ID</Th>
                    <Th>IP</Th>
                    <Th>User Agent</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row: AuditRow) => (
                    <Tr key={row.id}>
                      <Td>{row.timestamp ? new Date(row.timestamp).toLocaleString() : ''}</Td>
                      <Td>{row.action}</Td>
                      <Td>{row.entityType}</Td>
                      <Td>{row.userId || ''}</Td>
                      <Td>{row.entityId}</Td>
                      <Td>{row.ipAddress || ''}</Td>
                      <Td className="max-w-[320px] truncate">{row.userAgent || ''}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )
        })()}

        <Pagination
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages}
          hasPrev={Boolean(pagination?.hasPrev)}
          hasNext={Boolean(pagination?.hasNext)}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  )
}
