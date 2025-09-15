import { useMemo, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { FilterBar } from './ui/FilterBar'
import { Table, Thead, Tbody, Tr, Th as TTh, Td } from './ui/DataTable'
import { Pagination } from './ui/Pagination'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role?: string
  username?: string
}

interface City { id: string; name: string }
interface Address { street?: string; number?: string; city?: City }
interface Lock { id: string; name: string; address?: Address }
interface RFIDKey { id: string; cardId: string; name?: string }

interface AccessLog {
  id: string
  timestamp: string | Date
  accessType: string
  result: string
  user?: User | null
  rfidKey?: RFIDKey | null
  lock: Lock
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface AccessLogsResponse {
  success: boolean
  data: AccessLog[]
  pagination: Pagination
  message?: string
}

interface AccessLogsProps {
  user: User
}

const results = [
  'GRANTED',
  'DENIED_INVALID_CARD',
  'DENIED_EXPIRED_CARD',
  'DENIED_NO_PERMISSION',
  'DENIED_INACTIVE_USER',
  'DENIED_INACTIVE_LOCK',
  'DENIED_TIME_RESTRICTION',
  'ERROR_DEVICE_OFFLINE',
  'ERROR_SYSTEM_FAILURE',
]

// Must match backend enum AccessType (schema): RFID_CARD, MANUAL, EMERGENCY, MAINTENANCE
const accessTypes = ['RFID_CARD', 'MANUAL', 'EMERGENCY', 'MAINTENANCE']

function AccessLogs({ user }: AccessLogsProps) {
  const { error: toastError } = useToast()
  // Filters and table state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sortBy, setSortBy] = useState<'timestamp' | 'result' | 'accessType'>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [userId, setUserId] = useState('')
  const [lockId, setLockId] = useState('')
  const [result, setResult] = useState('')
  const [accessType, setAccessType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const params = useMemo(() => {
    const p: Record<string, string | number> = {
      page,
      limit,
      sortBy,
      sortOrder,
    }
    if (userId) p.userId = userId
    if (lockId) p.lockId = lockId
    if (result) p.result = result
    if (accessType) p.accessType = accessType
    if (startDate) p.startDate = startDate
    if (endDate) p.endDate = endDate
    return p
  }, [page, limit, sortBy, sortOrder, userId, lockId, result, accessType, startDate, endDate])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AccessLogsResponse, unknown>({
    queryKey: ['access-logs', params],
    queryFn: async () => {
      const res = await api.get<AccessLogsResponse>('/api/lock/access-logs', { params })
      // Normalize timestamp to ISO string
      const normalized = {
        ...res.data,
        data: res.data.data.map((l: AccessLog) => ({
          ...l,
          timestamp: typeof l.timestamp === 'string' ? l.timestamp : new Date(l.timestamp as Date).toISOString(),
        })),
      }
      return normalized
    },
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  })

  const onSubmitFilters = (e: React.FormEvent) => { e.preventDefault(); setPage(1); refetch() }

  const onExportCsv = async () => {
    try {
      setIsExporting(true)
      // Use current filters; export endpoint accepts same query params
      const res = await api.get<Blob>('/api/lock/access-logs/export', {
        params,
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = 'access-logs.csv'
      a.setAttribute('download', filename)
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toastError(`Export failed: ${formatError(err)}`)
    } finally {
      setIsExporting(false)
    }
  }

  const toggleSort = (field: 'timestamp' | 'result' | 'accessType') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900">Access Logs</h1>
        <p className="mt-2 text-gray-600">View and analyze access attempts and history</p>
        <p className="mt-1 text-xs text-gray-500">Signed in as {user.firstName} {user.lastName} ({user.email})</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FilterBar
          onSubmit={onSubmitFilters}
          onReset={() => { setUserId(''); setLockId(''); setResult(''); setAccessType(''); setStartDate(''); setEndDate(''); setPage(1) }}
          isRefreshing={isFetching}
          right={(
            <div className="flex items-center gap-2">
              <button type="button" onClick={onExportCsv} disabled={isExporting} className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {isExporting ? 'Exporting…' : 'Export CSV'}
              </button>
              <label className="text-sm text-gray-700">Per page</label>
              <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Lock ID</label>
            <input value={lockId} onChange={e => setLockId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Result</label>
            <select value={result} onChange={e => setResult(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="">Any</option>
              {results.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select value={accessType} onChange={e => setAccessType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="">Any</option>
              {accessTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
        </FilterBar>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                <TTh className="cursor-pointer select-none" onClick={() => toggleSort('timestamp')}>
                  <span className="inline-flex items-center gap-1">Timestamp {sortBy==='timestamp' ? (orderIcon(sortOrder)) : null}</span>
                </TTh>
                <TTh>User</TTh>
                <TTh>Email</TTh>
                <TTh>Lock</TTh>
                <TTh>Address</TTh>
                <TTh>City</TTh>
                <TTh className="cursor-pointer select-none" onClick={() => toggleSort('accessType')}>
                  <span className="inline-flex items-center gap-1">Type {sortBy==='accessType' ? (orderIcon(sortOrder)) : null}</span>
                </TTh>
                <TTh className="cursor-pointer select-none" onClick={() => toggleSort('result')}>
                  <span className="inline-flex items-center gap-1">Result {sortBy==='result' ? (orderIcon(sortOrder)) : null}</span>
                </TTh>
                <TTh>RFID Card</TTh>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading || isFetching ? (
                <Tr>
                  <Td colSpan={9} className="text-center text-gray-500">Loading...</Td>
                </Tr>
              ) : isError ? (
                <Tr>
                  <Td colSpan={9} className="text-center text-red-600">{formatError(error)}</Td>
                </Tr>
              ) : (data && data.data.length > 0 ? (
                data.data.map((log) => {
                  const ts = typeof log.timestamp === 'string' ? log.timestamp : new Date(log.timestamp).toISOString()
                  const tsLocal = new Date(ts).toLocaleString()
                  const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown'
                  const email = log.user?.email || '—'
                  const addr = log.lock?.address
                  const addrStr = addr ? `${addr.street || ''} ${addr.number || ''}`.trim() : '—'
                  const city = addr?.city?.name || '—'
                  return (
                    <Tr key={log.id} className="hover:bg-gray-50">
                      <Td className="text-gray-900">{tsLocal}</Td>
                      <Td>{userName}</Td>
                      <Td>{email}</Td>
                      <Td>{log.lock?.name || '—'}</Td>
                      <Td>{addrStr || '—'}</Td>
                      <Td>{city}</Td>
                      <Td>{log.accessType}</Td>
                      <Td className={log.result === 'GRANTED' ? 'font-medium text-green-700' : 'font-medium text-red-700'}>{log.result}</Td>
                      <Td>{log.rfidKey?.cardId || '—'}</Td>
                    </Tr>
                  )
                })
              ) : (
                <Tr>
                  <Td colSpan={9} className="text-center text-gray-500">No logs found for the selected filters.</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
        <Pagination
          page={data?.pagination?.page || page}
          totalPages={data?.pagination?.totalPages || 1}
          hasPrev={!!data?.pagination?.hasPrev}
          hasNext={!!data?.pagination?.hasNext}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => p + 1)}
        />
      </div>
    </div>
  )
}

export default AccessLogs

function orderIcon(order?: 'asc' | 'desc') {
  if (!order) return null
  return order === 'asc' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.293a1 1 0 01-1.414 1.414L10 10.414 6.707 13.707a1 1 0 11-1.414-1.414l4-4a1 1 0 011.414 0l4 4z" clipRule="evenodd" /></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.707a1 1 0 001.414-1.414L10 2.586l3.293 3.707a1 1 0 101.414-1.414l-4-4a1 1 0 00-1.414 0l-4 4a1 1 0 000 1.414z" clipRule="evenodd" /></svg>
  )
}

function formatError(error: unknown): string {
  if (!error) return 'Failed to load logs'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const maybeMsg = (error as { message?: unknown }).message
    return typeof maybeMsg === 'string' ? maybeMsg : 'Failed to load logs'
  }
  return 'Failed to load logs'
}