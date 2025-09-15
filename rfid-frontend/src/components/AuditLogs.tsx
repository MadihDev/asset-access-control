import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Table, Thead, Tbody, Tr, Th, Td } from './ui/DataTable'
import { Pagination } from './ui/Pagination'
import { FilterBar } from './ui/FilterBar'

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

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
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
        <FilterBar
          onSubmit={(e) => { e.preventDefault(); setPage(1); refetch() }}
          onReset={() => { setAction(''); setUserId(''); setEntityType(''); setStartDate(''); setEndDate(''); setPage(1) }}
          isRefreshing={isFetching}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Action</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={action} onChange={e => setAction(e.target.value as AuditAction | '')}>
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
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Filter by user id" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={entityType} onChange={e => setEntityType(e.target.value)} placeholder="e.g. User, RFIDKey" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </FilterBar>

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
                    <Th className="cursor-pointer" onClick={() => toggleSort('timestamp')}>Timestamp</Th>
                    <Th className="cursor-pointer" onClick={() => toggleSort('action')}>Action</Th>
                    <Th className="cursor-pointer" onClick={() => toggleSort('entityType')}>Entity</Th>
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
