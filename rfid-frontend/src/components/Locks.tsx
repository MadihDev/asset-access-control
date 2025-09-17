import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useToast } from '../hooks/useToast'
import { useCity } from '../contexts/CityContext'

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'USER'

interface User {
  id: string
  role: Role | string
}

type LockRow = {
  id: string
  name: string
  lockType?: string
  isActive: boolean
  isOnline?: boolean
  lastSeen?: string
  address?: { street?: string; number?: string; zipCode?: string; city?: { id: string; name: string } }
}

export default function Locks({ user }: { user: User }) {
  const qc = useQueryClient()
  const { error: toastError, success: toastSuccess } = useToast()
  const { selectedCityId } = useCity()
  const [showInactive, setShowInactive] = useState(false)

  const params = useMemo(() => {
    const p: Record<string, string> = { activeOnly: String(!showInactive) }
    if (selectedCityId) p.cityId = selectedCityId
    return p
  }, [showInactive, selectedCityId])

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ success: boolean; data: LockRow[]}>({
    queryKey: ['locks', params],
    queryFn: async () => (await api.get('/api/lock', { params })).data,
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  })

  const canUpdate = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
  const canPing = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPERVISOR'

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => (await api.put(`/api/lock/${id}`, { isActive })).data,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['locks'] })
      toastSuccess(vars.isActive ? 'Lock activated' : 'Lock deactivated')
    },
    onError: (e: unknown) => toastError(formatError(e)),
  })

  const pingLock = useMutation({
    mutationFn: async ({ id }: { id: string }) => (await api.post(`/api/lock/${id}/ping`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locks'] })
      toastSuccess('Ping sent')
    },
    onError: (e: unknown) => toastError(formatError(e)),
  })

  const rows = data?.data || []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Locks</h1>
            <p className="mt-2 text-gray-600">Manage locks, status, and availability{selectedCityId ? ` (City scoped)` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              <span className="ml-2">Show inactive</span>
            </label>
            <button className="px-3 py-2 rounded-md border" onClick={() => refetch()} disabled={isFetching}>Refresh</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {isLoading ? (
          <div className="py-12 text-center text-gray-600">Loading locks…</div>
        ) : isError ? (
          <div className="py-12 text-center text-red-600">Failed to load locks</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-gray-600">No locks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-gray-500">City</th>
                  <th className="px-4 py-2 text-left text-gray-500">Online</th>
                  <th className="px-4 py-2 text-left text-gray-500">Active</th>
                  <th className="px-4 py-2 text-left text-gray-500">Last Seen</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 text-gray-900">{l.name}</td>
                    <td className="px-4 py-2">{l.lockType || '—'}</td>
                    <td className="px-4 py-2">{l.address?.city?.name || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${l.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{l.isOnline ? 'Online' : 'Offline'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{l.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-2">{l.lastSeen ? new Date(l.lastSeen).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2 text-right space-x-3">
                      {canPing && (
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => pingLock.mutate({ id: l.id })}>Ping</button>
                      )}
                      {canUpdate && (
                        <button
                          className="text-gray-700 hover:text-gray-900"
                          onClick={() => toggleActive.mutate({ id: l.id, isActive: !l.isActive })}
                        >
                          {l.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function formatError(error: unknown): string {
  if (!error) return 'Operation failed'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const maybeMsg = (error as { message?: unknown }).message
    return typeof maybeMsg === 'string' ? maybeMsg : 'Operation failed'
  }
  return 'Operation failed'
}
