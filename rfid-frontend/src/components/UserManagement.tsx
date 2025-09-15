import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { AxiosError } from 'axios'
import { useToast } from '../hooks/useToast'
import { FilterBar } from './ui/FilterBar'
import { Table, Thead, Tbody, Tr, Th as TTh, Td } from './ui/DataTable'
import { Pagination } from './ui/Pagination'

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'USER'
interface UserRow { id: string; email: string; firstName: string; lastName: string; role: Role; isActive?: boolean; lastLoginAt?: string; createdAt?: string }

interface ApiUsersResponse {
  success: boolean
  data: UserRow[]
  pagination?: { page: number; limit: number; total: number; totalPages?: number; hasNext?: boolean; hasPrev?: boolean }
}

type SortBy = 'createdAt' | 'firstName' | 'email' | 'role'
type SortOrder = 'asc' | 'desc'

const fetchUsers = async (params: Record<string, string | number>): Promise<ApiUsersResponse> => {
  const { data } = await api.get('/api/user', { params })
  return data as ApiUsersResponse
}

const UserManagement: React.FC<{ user: { role: string } }> = ({ user }) => {
  const { success: toastSuccess, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit, sortBy, sortOrder }
    if (search) p.search = search
    if (role) p.role = role
    if (status === 'active') p.isActive = 'true'
    if (status === 'inactive') p.isActive = 'false'
    return p
  }, [page, limit, sortBy, sortOrder, search, role, status])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ApiUsersResponse, AxiosError<{ error?: string }>>({
    queryKey: ['users', params],
    queryFn: () => fetchUsers(params),
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  })

  const rows = data?.data ?? []
  const pagination = data?.pagination
  const toggleSort = useToggleSort(sortBy, sortOrder, setSortBy, setSortOrder, setPage)

  // View/Edit Modal state
  const [viewId, setViewId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const canEdit = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">
          Manage users, roles, and permissions{user ? ` as ${user.role.replace('_', ' ').toLowerCase()}` : ''}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <FilterBar
          onSubmit={(e) => { e.preventDefault(); setPage(1); refetch() }}
          onReset={() => { setSearch(''); setRole(''); setStatus('all'); setPage(1) }}
          isRefreshing={isFetching}
          right={(
            <button
              type="button"
              className="px-3 py-2 bg-green-600 text-white rounded-md"
              onClick={async () => {
                try {
                  const url = new URL(`${import.meta.env.VITE_API_URL}/api/user/export`)
                  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
                  const res = await fetch(url.toString(), {
                    credentials: 'include',
                    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
                  })
                  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
                  const blob = await res.blob()
                  const blobUrl = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = blobUrl
                  a.download = 'users.csv'
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(blobUrl)
                  toastSuccess('Users CSV downloaded')
                } catch (e) {
                  console.error(e)
                  toastError('Failed to export users CSV')
                }
              }}
            >
              Export CSV
            </button>
          )}
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value as Role | '')}
            >
              <option value="">All roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="USER">User</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </FilterBar>

        {isLoading ? (
          <div className="py-16 text-center text-gray-600">Loading users…</div>
        ) : isError ? (
          <div className="py-16 text-center text-red-600">{formatError(error)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <TTh className="cursor-pointer select-none" onClick={() => toggleSort('firstName')}>
                    <span className="inline-flex items-center gap-1">Name {sortBy==='firstName' ? orderIcon(sortOrder) : null}</span>
                  </TTh>
                  <TTh className="cursor-pointer select-none" onClick={() => toggleSort('email')}>
                    <span className="inline-flex items-center gap-1">Email {sortBy==='email' ? orderIcon(sortOrder) : null}</span>
                  </TTh>
                  <TTh className="cursor-pointer select-none" onClick={() => toggleSort('role')}>
                    <span className="inline-flex items-center gap-1">Role {sortBy==='role' ? orderIcon(sortOrder) : null}</span>
                  </TTh>
                  <TTh className="cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                    <span className="inline-flex items-center gap-1">Created {sortBy==='createdAt' ? orderIcon(sortOrder) : null}</span>
                  </TTh>
                  <TTh>Status</TTh>
                  <TTh>Actions</TTh>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((u: UserRow) => (
                  <Tr key={u.id}>
                    <Td className="text-gray-900">{u.firstName} {u.lastName}</Td>
                    <Td className="text-gray-900">{u.email}</Td>
                    <Td className="text-gray-900">{u.role.replace('_', ' ')}</Td>
                    <Td className="text-gray-900">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</Td>
                    <Td>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <button className="text-blue-600 hover:text-blue-800 mr-3" onClick={() => setViewId(u.id)}>View</button>
                      {canEdit && (
                        <button className="text-gray-600 hover:text-gray-800" onClick={() => setEditId(u.id)}>Edit</button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}

        <Pagination
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages}
          hasPrev={!(page <= 1 || data?.pagination?.hasPrev === false)}
          hasNext={!(data?.pagination?.hasNext === false || (data?.pagination?.hasNext === undefined && rows.length < limit))}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {/* View Modal */}
      {viewId && (
        <UserViewModal id={viewId} currentRole={user.role} onClose={() => setViewId(null)} />
      )}

      {/* Edit Modal */}
      {canEdit && editId && (
        <UserEditModal id={editId} onClose={() => setEditId(null)} onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] })
          queryClient.invalidateQueries({ queryKey: ['user', editId] })
        }} />
      )}
    </div>
  )
}

// removed duplicate formatError (existing helper is defined later in the file)

export default UserManagement

function orderIcon(order?: 'asc' | 'desc') {
  if (!order) return null
  return order === 'asc' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.293a1 1 0 01-1.414 1.414L10 10.414 6.707 13.707a1 1 0 11-1.414-1.414l4-4a1 1 0 011.414 0l4 4z" clipRule="evenodd" /></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.707a1 1 0 001.414-1.414L10 2.586l3.293 3.707a1 1 0 101.414-1.414l-4-4a1 1 0 00-1.414 0l-4 4a1 1 0 000 1.414z" clipRule="evenodd" /></svg>
  )
}

// local sorting handler
function useToggleSort(sortBy: SortBy, sortOrder: SortOrder, setSortBy: (b: SortBy) => void, setSortOrder: (o: SortOrder) => void, setPage: (p: number | ((prev: number) => number)) => void) {
  return (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }
}

// ---------- User View Modal ----------
function UserViewModal({ id, onClose, currentRole }: { id: string; onClose: () => void; currentRole: Role | string }) {
  type UserDetail = UserRow & { username?: string; isActive?: boolean; role: Role; createdAt?: string; updatedAt?: string; lastLoginAt?: string }
  type ApiUserResponse = { success: boolean; data: UserDetail }
  const { data, isLoading, isError, error } = useQuery<ApiUserResponse>({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await api.get(`/api/user/${id}`)
      return res.data as ApiUserResponse
    }
  })

  const u = data?.data
  return (
    <Modal onClose={onClose} title="User Details">
      {isLoading ? (
        <div className="py-8 text-center text-gray-600">Loading…</div>
      ) : isError ? (
        <div className="py-8 text-center text-red-600">{formatError(error)}</div>
      ) : u ? (
        <div className="space-y-6 text-sm">
          <div className="space-y-3">
            <Row label="Name" value={`${u.firstName} ${u.lastName}`} />
            <Row label="Email" value={u.email} />
            <Row label="Username" value={u.username || '—'} />
            <Row label="Role" value={u.role.replace('_',' ')} />
            <Row label="Status" value={u.isActive !== false ? 'Active' : 'Inactive'} />
            <Row label="Created" value={u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'} />
            <Row label="Updated" value={u.updatedAt ? new Date(u.updatedAt).toLocaleString() : '—'} />
            <Row label="Last Login" value={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'} />
          </div>

          <PermissionsAndKeysTabs userId={id} currentRole={currentRole} />
        </div>
      ) : null}
    </Modal>
  )
}

// ---------- User Edit Modal ----------
function UserEditModal({ id, onClose, onUpdated }: { id: string; onClose: () => void; onUpdated: () => void }) {
  const { success: toastSuccess, error: toastError } = useToast()
  type UserDetail = UserRow & { username?: string; isActive?: boolean; role: Role }
  type ApiUserResponse = { success: boolean; data: UserDetail }
  const { data, isLoading } = useQuery<ApiUserResponse>({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await api.get(`/api/user/${id}`)
      return res.data as ApiUserResponse
    }
  })
  const u = data?.data

  const [firstName, setFirstName] = useState(u?.firstName || '')
  const [lastName, setLastName] = useState(u?.lastName || '')
  const [email, setEmail] = useState(u?.email || '')
  const [username, setUsername] = useState(u?.username || '')
  const [role, setRole] = useState<Role>(u?.role || 'USER')
  const [isActive, setIsActive] = useState<boolean>(u?.isActive !== false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sync state when user loads
  useEffect(() => {
    if (u) {
      setFirstName(u.firstName)
      setLastName(u.lastName)
      setEmail(u.email)
      setUsername(u.username || '')
      setRole(u.role)
      setIsActive(u.isActive !== false)
    }
  }, [u])

  type UpdateUserPayload = { firstName: string; lastName: string; email: string; username?: string; role: Role; isActive: boolean }
  const mutation = useMutation({
    mutationFn: async () => {
      setSubmitting(true)
      setErrorMsg(null)
      const payload: UpdateUserPayload = { firstName, lastName, email, role, isActive }
      if (username) payload.username = username
      const res = await api.put(`/api/user/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      onUpdated()
      setSubmitting(false)
      onClose()
      toastSuccess('User updated successfully')
    },
    onError: (err: unknown) => {
      setSubmitting(false)
      const msg = formatError(err)
      setErrorMsg(msg)
      toastError(msg)
    }
  })

  return (
    <Modal onClose={onClose} title="Edit User">
      {isLoading ? (
        <div className="py-8 text-center text-gray-600">Loading…</div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          {errorMsg ? <div className="text-red-600 text-sm">{errorMsg}</div> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="First Name" value={firstName} onChange={setFirstName} required />
            <Input label="Last Name" value={lastName} onChange={setLastName} required />
          </div>
          <Input label="Email" type="email" value={email} onChange={setEmail} required />
          <Input label="Username" value={username} onChange={setUsername} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select className="mt-1 block w-full rounded-md border-gray-300" value={role} onChange={e => setRole(e.target.value as Role)}>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="USER">User</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center mt-6">
                <input type="checkbox" className="rounded border-gray-300" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="px-3 py-2 rounded-md border" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ---------- Reusable UI bits ----------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-gray-500">{label}</div>
      <div className="col-span-2 text-gray-900">{value}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={e => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  )
}

// Local error formatter
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

// ---------- Permissions & RFID Keys Tabs ----------
function PermissionsAndKeysTabs({ userId, currentRole }: { userId: string; currentRole: Role | string }) {
  const [tab, setTab] = useState<'permissions' | 'rfid'>('permissions')
  const roleStr = String(currentRole)
  const canManagePermissions = ['SUPER_ADMIN','ADMIN','SUPERVISOR'].includes(roleStr)
  const canManageRFID = ['SUPER_ADMIN','ADMIN'].includes(roleStr)
  return (
    <div className="mt-6">
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${tab==='permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            onClick={() => setTab('permissions')}
          >
            Permissions
          </button>
          <button
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${tab==='rfid' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            onClick={() => setTab('rfid')}
          >
            RFID Keys
          </button>
        </nav>
      </div>

      {tab === 'permissions' ? (
        <PermissionsPanel userId={userId} canManage={canManagePermissions} />
      ) : (
        <RFIDKeysPanel userId={userId} canManage={canManageRFID} />
      )}
    </div>
  )
}

type PermissionRow = {
  id: string
  canAccess: boolean
  validFrom: string
  validTo?: string
  lock: { id: string; name: string; lockType?: string; address?: { street: string; number: string; zipCode: string; city: { name: string } } }
}

function PermissionsPanel({ userId, canManage }: { userId: string; canManage: boolean }) {
  const qc = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  const { data, isLoading, isError } = useQuery<{ success: boolean; data: PermissionRow[] }>({
    queryKey: ['permissions', userId],
    queryFn: async () => (await api.get('/api/permission', { params: { userId } })).data,
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/permission/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', userId] })
      toastSuccess('Permission revoked')
    },
    onError: (e: unknown) => toastError(formatError(e)),
  })

  const [showAssign, setShowAssign] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-semibold text-gray-900">Lock Access</h4>
        {canManage && (
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md" onClick={() => setShowAssign(true)}>Grant Access</button>
        )}
      </div>
      {isLoading ? (
        <div className="text-gray-600">Loading permissions…</div>
      ) : isError ? (
        <div className="text-red-600">Failed to load permissions</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500">Lock</th>
                <th className="px-4 py-2 text-left text-gray-500">Valid From</th>
                <th className="px-4 py-2 text-left text-gray-500">Valid To</th>
                <th className="px-4 py-2 text-left text-gray-500">Access</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data?.data || []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-gray-900">{p.lock?.name || '—'}</td>
                  <td className="px-4 py-2">{p.validFrom ? new Date(p.validFrom).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">{p.validTo ? new Date(p.validTo).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.canAccess ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.canAccess ? 'Allowed' : 'Blocked'}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <button className="text-red-600 hover:text-red-800" onClick={() => revokeMutation.mutate(p.id)}>Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <AssignPermissionModal userId={userId} onClose={() => setShowAssign(false)} onGranted={() => { qc.invalidateQueries({ queryKey: ['permissions', userId] }); toastSuccess('Permission granted') }} />)
      }
    </div>
  )
}

function AssignPermissionModal({ userId, onClose, onGranted }: { userId: string; onClose: () => void; onGranted: () => void }) {
  const { error: toastError } = useToast()
  const { data: locksData, isLoading } = useQuery<{ success: boolean; data: Array<{ id: string; name: string }> }>({
    queryKey: ['locks'],
    queryFn: async () => (await api.get('/api/lock')).data,
  })
  const [lockId, setLockId] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [canAccess, setCanAccess] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  type CreatePermissionPayload = { userId: string; lockId: string; canAccess?: boolean; validFrom?: string; validTo?: string }
  const onSubmit = async () => {
    try {
      setSubmitting(true)
      setErr(null)
      const payload: CreatePermissionPayload = { userId, lockId, canAccess }
      if (validFrom) payload.validFrom = new Date(validFrom).toISOString()
      if (validTo) payload.validTo = new Date(validTo).toISOString()
      await api.post('/api/permission', payload)
      onGranted()
      onClose()
    } catch (e) {
      const msg = formatError(e)
      setErr(msg)
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Grant Access to Lock">
      {isLoading ? (
        <div className="py-6 text-gray-600">Loading locks…</div>
      ) : (
        <div className="space-y-4">
          {err ? <div className="text-red-600 text-sm">{err}</div> : null}
          <div>
            <label className="block text-sm font-medium text-gray-700">Lock</label>
            <select className="mt-1 block w-full rounded-md border-gray-300" value={lockId} onChange={e => setLockId(e.target.value)}>
              <option value="">Select a lock…</option>
              {(locksData?.data || []).map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Valid From</label>
              <input type="datetime-local" className="mt-1 block w-full rounded-md border-gray-300" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valid To</label>
              <input type="datetime-local" className="mt-1 block w-full rounded-md border-gray-300" value={validTo} onChange={e => setValidTo(e.target.value)} />
            </div>
          </div>
          <label className="inline-flex items-center">
            <input type="checkbox" className="rounded border-gray-300" checked={canAccess} onChange={e => setCanAccess(e.target.checked)} />
            <span className="ml-2 text-sm text-gray-700">Allow access</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button className="px-3 py-2 rounded-md border" onClick={onClose}>Cancel</button>
            <button disabled={!lockId || submitting} className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" onClick={onSubmit}>
              {submitting ? 'Granting…' : 'Grant Access'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

type RFIDKeyRow = { id: string; cardId: string; name?: string; isActive: boolean; issuedAt: string; expiresAt?: string }

function RFIDKeysPanel({ userId, canManage }: { userId: string; canManage: boolean }) {
  const qc = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  const { data, isLoading, isError } = useQuery<{ success: boolean; data: RFIDKeyRow[] }>({
    queryKey: ['rfidKeys', userId],
    queryFn: async () => (await api.get('/api/rfid', { params: { userId } })).data,
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => (await api.put(`/api/rfid/${id}`, { isActive })).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['rfidKeys', userId] })
      toastSuccess(vars.isActive ? 'RFID key activated' : 'RFID key deactivated')
    },
    onError: (e: unknown) => toastError(formatError(e)),
  })

  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-semibold text-gray-900">RFID Keys</h4>
        {canManage && (
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md" onClick={() => setShowAdd(true)}>Add Key</button>
        )}
      </div>
      {isLoading ? (
        <div className="text-gray-600">Loading RFID keys…</div>
      ) : isError ? (
        <div className="text-red-600">Failed to load RFID keys</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500">Card ID</th>
                <th className="px-4 py-2 text-left text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-gray-500">Issued</th>
                <th className="px-4 py-2 text-left text-gray-500">Expires</th>
                <th className="px-4 py-2 text-left text-gray-500">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data?.data || []).map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-2 text-gray-900">{k.cardId}</td>
                  <td className="px-4 py-2">{k.name || '—'}</td>
                  <td className="px-4 py-2">{k.issuedAt ? new Date(k.issuedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">{k.expiresAt ? new Date(k.expiresAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${k.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{k.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <button className="text-blue-600 hover:text-blue-800" onClick={() => toggleActive.mutate({ id: k.id, isActive: !k.isActive })}>
                        {k.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddRFIDKeyModal userId={userId} onClose={() => setShowAdd(false)} onAdded={() => { qc.invalidateQueries({ queryKey: ['rfidKeys', userId] }); toastSuccess('RFID key added') }} />
      )}
    </div>
  )
}

function AddRFIDKeyModal({ userId, onClose, onAdded }: { userId: string; onClose: () => void; onAdded: () => void }) {
  const { error: toastError } = useToast()
  const [cardId, setCardId] = useState('')
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  type CreateRFIDKeyPayload = { userId: string; cardId: string; name?: string; expiresAt?: string }
  const onSubmit = async () => {
    try {
      setSubmitting(true)
      setErr(null)
      const payload: CreateRFIDKeyPayload = { userId, cardId }
      if (name) payload.name = name
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString()
      await api.post('/api/rfid', payload)
      onAdded()
      onClose()
    } catch (e) {
      const msg = formatError(e)
      setErr(msg)
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add RFID Key">
      <div className="space-y-4">
        {err ? <div className="text-red-600 text-sm">{err}</div> : null}
        <Input label="Card ID" value={cardId} onChange={setCardId} />
        <Input label="Name" value={name} onChange={setName} />
        <div>
          <label className="block text-sm font-medium text-gray-700">Expires At</label>
          <input type="datetime-local" className="mt-1 block w-full rounded-md border-gray-300" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button className="px-3 py-2 rounded-md border" onClick={onClose}>Cancel</button>
          <button disabled={!cardId || submitting} className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" onClick={onSubmit}>
            {submitting ? 'Adding…' : 'Add Key'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

