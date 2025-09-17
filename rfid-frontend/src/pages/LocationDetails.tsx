import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { getLocationUsers, getLocationLocks, getLocationKeys, bulkPermissions, bulkAssignKeys, type LocationUser, type LocationLock, type LocationKey } from '../services/locationApi'
import { getSocket } from '../services/socket'
import { validateGrants, validateRevokes, validateKeys, shapeGrants, shapeRevokes, shapeKeyItems } from '../utils/bulkParsing'
import { useToast } from '../hooks/useToast'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`px-3 py-2 border-b-2 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`} onClick={onClick}>
      {children}
    </button>
  )
}

export default function LocationDetails() {
  const { addressId } = useParams<{ addressId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const cityId = searchParams.get('cityId') || undefined
  const toast = useToast()

  const initialTabParam = searchParams.get('tab')
  const [tab, setTab] = useState<'users' | 'locks' | 'keys'>((initialTabParam === 'locks' || initialTabParam === 'keys') ? initialTabParam : 'users')
  const [page, setPage] = useState<number>(Number(searchParams.get('page') || 1))
  const [limit] = useState<number>(25)

  useEffect(() => {
    const sp = new URLSearchParams(searchParams)
    sp.set('tab', tab)
    sp.set('page', String(page))
    setSearchParams(sp)
  }, [tab, page, searchParams, setSearchParams])

  const [status, setStatus] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<LocationUser[]>([])
  const [locks, setLocks] = useState<LocationLock[]>([])
  const [keys, setKeys] = useState<LocationKey[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [showPermsModal, setShowPermsModal] = useState(false)
  // Picker data for builders
  const [pickerUsers, setPickerUsers] = useState<LocationUser[]>([])
  const [pickerLocks, setPickerLocks] = useState<LocationLock[]>([])
  const [pickerLoading, setPickerLoading] = useState<{ users: boolean; locks: boolean }>({ users: false, locks: false })
  const [showKeysModal, setShowKeysModal] = useState(false)
  // Builder fields
  const [permUserId, setPermUserId] = useState('')
  const [permLockId, setPermLockId] = useState('')
  const [permValidFrom, setPermValidFrom] = useState('') // datetime-local
  const [permValidTo, setPermValidTo] = useState('') // datetime-local
  const [userSearch, setUserSearch] = useState('')
  const [lockSearch, setLockSearch] = useState('')
  const [keyCardId, setKeyCardId] = useState('')
  const [keyUserId, setKeyUserId] = useState('')
  const [keyName, setKeyName] = useState('')
  const [keyExpiresAt, setKeyExpiresAt] = useState('') // datetime-local
  const [keyIsActive, setKeyIsActive] = useState<boolean | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const statusOptions = useMemo(() => {
    if (tab === 'users') return ['', 'active', 'inactive']
    if (tab === 'locks') return ['', 'online', 'offline', 'active', 'inactive']
    if (tab === 'keys') return ['', 'active', 'expired']
    return ['']
  }, [tab])

  async function ensurePickerUsers(limit = 100) {
    if (!addressId) return
    try {
      setPickerLoading((p) => ({ ...p, users: true }))
      const res = await getLocationUsers(addressId, { page: 1, limit, cityId })
      setPickerUsers(res.data)
    } catch {
      setPickerUsers([])
    } finally {
      setPickerLoading((p) => ({ ...p, users: false }))
    }
  }

  async function ensurePickerLocks(limit = 100) {
    if (!addressId) return
    try {
      setPickerLoading((p) => ({ ...p, locks: true }))
      const res = await getLocationLocks(addressId, { page: 1, limit })
      setPickerLocks(res.data)
    } catch {
      setPickerLocks([])
    } finally {
      setPickerLoading((p) => ({ ...p, locks: false }))
    }
  }

  async function openPermsModal() {
    setShowPermsModal(true)
    // Preload lists for builders
    await Promise.all([ensurePickerUsers(), ensurePickerLocks()])
  }

  async function openKeysModal() {
    setShowKeysModal(true)
    await ensurePickerUsers()
  }

  const fetchData = useCallback(async () => {
    if (!addressId) return
    setLoading(true)
    try {
      if (tab === 'users') {
        const res = await getLocationUsers(addressId, { page, limit, status: (status || undefined) as 'active' | 'inactive' | undefined, cityId })
        setUsers(res.data)
        setTotalPages(res.pagination.totalPages)
      } else if (tab === 'locks') {
        const res = await getLocationLocks(addressId, { page, limit, status: (status || undefined) as 'active' | 'inactive' | 'online' | 'offline' | undefined })
        setLocks(res.data)
        setTotalPages(res.pagination.totalPages)
      } else {
        const res = await getLocationKeys(addressId, { page, limit, status: (status || undefined) as 'active' | 'expired' | undefined })
        setKeys(res.data)
        setTotalPages(res.pagination.totalPages)
      }
    } catch (err: unknown) {
      let msg = 'Failed to load location data'
      if (typeof err === 'object' && err && 'response' in err) {
        const resp = (err as { response?: { data?: { error?: string } } }).response
        msg = resp?.data?.error || msg
      } else if (err instanceof Error) {
        msg = err.message
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [addressId, cityId, limit, page, status, tab, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time updates: subscribe to key/permission/lock events and refresh
  useEffect(() => {
    const token = localStorage.getItem('token') || undefined
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined
    if (!apiUrl) return
    const s = getSocket(apiUrl, token, cityId)

    let refreshTimeout: number | undefined
    const scheduleRefresh = () => {
      if (refreshTimeout) window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        fetchData()
      }, 500)
    }

    const events = [
      // Key lifecycle and assignment
      'key.created',
      'key.updated',
      'key.reassigned',
      'key.revoked',
      'key.expired',
      // Permissions
      'permission.granted',
      'permission.revoked',
      // Locks
      'lock.online',
      'lock.offline',
      'lock.updated',
    ] as const

    events.forEach((evt) => s.on(evt, scheduleRefresh))

    return () => {
      events.forEach((evt) => s.off(evt, scheduleRefresh))
    }
  }, [cityId, fetchData])

  function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-lg font-medium">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    )
  }

  const [grantsText, setGrantsText] = useState('')
  const [revokesText, setRevokesText] = useState('')
  const [keysText, setKeysText] = useState('')

  // Parsing/validation helpers moved to ../utils/bulkParsing

  // Validation helpers
  const grantsErrors = useMemo(() => validateGrants(grantsText), [grantsText])

  const revokesErrors = useMemo(() => validateRevokes(revokesText), [revokesText])

  const keysErrors = useMemo(() => validateKeys(keysText), [keysText])

  const hasPermsErrors = grantsErrors.length > 0 || revokesErrors.length > 0
  const hasKeysErrors = keysErrors.length > 0

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadGrantsTemplate() {
    const header = 'userId,lockId,validFromISO,validToISO\n'
    const example = 'user_123,lock_abc,2025-01-01T00:00:00Z,2025-12-31T23:59:59Z\n'
    download('permissions_grants_template.csv', header + example)
  }

  function downloadRevokesTemplate() {
    const header = 'userId,lockId\n'
    const example = 'user_123,lock_abc\n'
    download('permissions_revokes_template.csv', header + example)
  }

  function downloadKeysTemplate() {
    const header = 'cardId,userId,name,expiresAtISO,isActive\n'
    const example = 'CARD-001,user_123,Main Card,2025-12-31T23:59:59Z,true\n'
    download('key_assign_template.csv', header + example)
  }

  async function handleSubmitPermissions() {
    if (!addressId) return
    setSubmitting(true)
    try {
      if (hasPermsErrors) {
        toast.error('Please fix validation errors before submitting.')
        return
      }
      const grants = shapeGrants(grantsText)
      const revokes = shapeRevokes(revokesText)
      if (grants.length === 0 && revokes.length === 0) {
        toast.error('Provide at least one grant or revoke line.')
        return
      }
      const res = await bulkPermissions(addressId, { grants: grants.length ? grants : undefined, revokes: revokes.length ? revokes : undefined })
      toast.success(`Permissions updated (granted: ${res.data.granted}, updated: ${res.data.updated}, revoked: ${res.data.revoked}).`, 'Success')
      setShowPermsModal(false)
      setGrantsText('')
      setRevokesText('')
      fetchData()
    } catch (e: unknown) {
      type ErrLike = { response?: { data?: { error?: string } } }
      const msg = (e as ErrLike)?.response?.data?.error || (e as Error)?.message || 'Failed to update permissions'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitKeys() {
    if (!addressId) return
    setSubmitting(true)
    try {
      if (hasKeysErrors) {
        toast.error('Please fix validation errors before submitting.')
        return
      }
      const items = shapeKeyItems(keysText)
      if (items.length === 0) {
        toast.error('Provide at least one key assignment line.')
        return
      }
      const res = await bulkAssignKeys(addressId, { items })
      toast.success(`Keys updated (created: ${res.data.created}, reassigned: ${res.data.reassigned}, updated: ${res.data.updated}).`, 'Success')
      setShowKeysModal(false)
      setKeysText('')
      fetchData()
    } catch (e: unknown) {
      type ErrLike = { response?: { data?: { error?: string } } }
      const msg = (e as ErrLike)?.response?.data?.error || (e as Error)?.message || 'Failed to assign keys'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Location Details</h1>

      <div className="flex gap-4 border-b mb-4">
        <TabButton active={tab === 'users'} onClick={() => { setTab('users'); setPage(1) }}>Users</TabButton>
        <TabButton active={tab === 'locks'} onClick={() => { setTab('locks'); setPage(1) }}>Locks</TabButton>
        <TabButton active={tab === 'keys'} onClick={() => { setTab('keys'); setPage(1) }}>Keys</TabButton>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600">Status:</label>
        <select className="border rounded px-2 py-1" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          {statusOptions.map((opt) => <option key={opt} value={opt}>{opt || 'All'}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={openPermsModal}>Bulk permissions</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={openKeysModal}>Bulk key assign</button>
          <span className="text-sm text-gray-600">Page {page} / {Math.max(totalPages, 1)}</span>
        </div>
      </div>

      {loading && <div className="text-gray-500">Loading...</div>}

      {!loading && tab === 'users' && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Active @ Location</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b">
                  <td className="p-2">{u.firstName} {u.lastName}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.activeAtLocation ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={4}>No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'locks' && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Name</th>
                <th className="p-2">Type</th>
                <th className="p-2">Active</th>
                <th className="p-2">Online</th>
                <th className="p-2">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {locks.map(l => (
                <tr key={l.id} className="border-b">
                  <td className="p-2">{l.name}</td>
                  <td className="p-2">{l.lockType}</td>
                  <td className="p-2">{l.isActive ? 'Yes' : 'No'}</td>
                  <td className="p-2">{l.isOnline ? 'Yes' : 'No'}</td>
                  <td className="p-2">{l.lastSeen ? new Date(l.lastSeen).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {locks.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={5}>No locks found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'keys' && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Card ID</th>
                <th className="p-2">Name</th>
                <th className="p-2">Active</th>
                <th className="p-2">Expires</th>
                <th className="p-2">User</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b">
                  <td className="p-2">{k.cardId}</td>
                  <td className="p-2">{k.name || '-'}</td>
                  <td className="p-2">{k.isActive ? 'Yes' : 'No'}</td>
                  <td className="p-2">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : '-'}</td>
                  <td className="p-2">{k.user.firstName} {k.user.lastName}</td>
                </tr>
              ))}
              {keys.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={5}>No keys found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <button className="px-3 py-1 border rounded" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <button className="px-3 py-1 border rounded" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {showPermsModal && (
        <Modal title="Bulk grant/revoke permissions" onClose={() => !submitting && setShowPermsModal(false)}>
          <div className="space-y-4">
            {cityId && (
              <div className="text-sm text-gray-600">Applying to location <code className="bg-gray-100 px-1 rounded">{addressId}</code> in city <code className="bg-gray-100 px-1 rounded">{cityId}</code>.</div>
            )}
            {/* Builder */}
            <div className="border rounded p-3 bg-gray-50">
              <div className="text-sm font-medium mb-2">Add grant/revoke via pickers</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Filter users</label>
                  <input className="w-full border rounded px-2 py-1" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users by name or email" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Filter locks</label>
                  <input className="w-full border rounded px-2 py-1" value={lockSearch} onChange={(e) => setLockSearch(e.target.value)} placeholder="Search locks by name" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">User</label>
                  <select className="w-full border rounded px-2 py-1" value={permUserId} onChange={(e) => setPermUserId(e.target.value)} disabled={pickerLoading.users}>
                    <option value="">Select user…</option>
                    {pickerUsers
                      .filter(u => {
                        const s = userSearch.toLowerCase()
                        if (!s) return true
                        return `${u.firstName} ${u.lastName}`.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
                      })
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Lock</label>
                  <select className="w-full border rounded px-2 py-1" value={permLockId} onChange={(e) => setPermLockId(e.target.value)} disabled={pickerLoading.locks}>
                    <option value="">Select lock…</option>
                    {pickerLocks
                      .filter(l => {
                        const s = lockSearch.toLowerCase()
                        if (!s) return true
                        return l.name.toLowerCase().includes(s)
                      })
                      .map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Valid from</label>
                  <input type="datetime-local" className="w-full border rounded px-2 py-1" value={permValidFrom} onChange={(e) => setPermValidFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Valid to</label>
                  <input type="datetime-local" className="w-full border rounded px-2 py-1" value={permValidTo} onChange={(e) => setPermValidTo(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => {
                    if (!permUserId || !permLockId) return
                    const vf = permValidFrom ? new Date(permValidFrom).toISOString() : ''
                    const vt = permValidTo ? new Date(permValidTo).toISOString() : ''
                    const line = [permUserId, permLockId, vf, vt].filter(Boolean).join(',')
                    setGrantsText(gt => (gt ? `${gt}\n${line}` : line))
                  }}
                >Add to grants</button>
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => {
                    if (!permUserId || !permLockId) return
                    const line = [permUserId, permLockId].join(',')
                    setRevokesText(rt => (rt ? `${rt}\n${line}` : line))
                  }}
                >Add to revokes</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grants (one per line)</label>
              <textarea
                value={grantsText}
                onChange={(e) => setGrantsText(e.target.value)}
                placeholder="userId,lockId[,validFromISO][,validToISO]"
                rows={5}
                className="w-full border rounded p-2 font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">Example: <code>user_123,lock_abc,2025-01-01T00:00:00Z,2025-12-31T23:59:59Z</code></p>
              <div className="flex gap-2 mt-2">
                <button className="px-2 py-1 border rounded text-xs" onClick={downloadGrantsTemplate}>Download grants CSV template</button>
              </div>
              {grantsErrors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                  {grantsErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Revokes (one per line)</label>
              <textarea
                value={revokesText}
                onChange={(e) => setRevokesText(e.target.value)}
                placeholder="userId,lockId"
                rows={5}
                className="w-full border rounded p-2 font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">Example: <code>user_123,lock_abc</code></p>
              <div className="flex gap-2 mt-2">
                <button className="px-2 py-1 border rounded text-xs" onClick={downloadRevokesTemplate}>Download revokes CSV template</button>
              </div>
              {revokesErrors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                  {revokesErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1 border rounded" disabled={submitting} onClick={() => setShowPermsModal(false)}>Cancel</button>
              <button className="px-3 py-1 border rounded bg-blue-600 text-white disabled:opacity-50" disabled={submitting || hasPermsErrors} onClick={handleSubmitPermissions}>
                {submitting ? 'Applying…' : 'Apply changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showKeysModal && (
        <Modal title="Bulk key assignment" onClose={() => !submitting && setShowKeysModal(false)}>
          <div className="space-y-4">
            {cityId && (
              <div className="text-sm text-gray-600">Applying to location <code className="bg-gray-100 px-1 rounded">{addressId}</code> in city <code className="bg-gray-100 px-1 rounded">{cityId}</code>.</div>
            )}
            {/* Builder */}
            <div className="border rounded p-3 bg-gray-50">
              <div className="text-sm font-medium mb-2">Add key assignment via pickers</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Filter users</label>
                  <input className="w-full border rounded px-2 py-1" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users by name or email" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">User</label>
                  <select className="w-full border rounded px-2 py-1" value={keyUserId} onChange={(e) => setKeyUserId(e.target.value)} disabled={pickerLoading.users}>
                    <option value="">Select user…</option>
                    {pickerUsers
                      .filter(u => {
                        const s = userSearch.toLowerCase()
                        if (!s) return true
                        return `${u.firstName} ${u.lastName}`.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
                      })
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Card ID</label>
                  <input className="w-full border rounded px-2 py-1" value={keyCardId} onChange={(e) => setKeyCardId(e.target.value)} placeholder="e.g. CARD-001" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Name (optional)</label>
                  <input className="w-full border rounded px-2 py-1" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Display name" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Expires at</label>
                  <input type="datetime-local" className="w-full border rounded px-2 py-1" value={keyExpiresAt} onChange={(e) => setKeyExpiresAt(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <input id="key-active" type="checkbox" checked={!!keyIsActive} onChange={(e) => setKeyIsActive(e.target.checked)} />
                  <label htmlFor="key-active" className="text-sm text-gray-700">Is active</label>
                </div>
              </div>
              <div className="mt-3">
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => {
                    if (!keyCardId || !keyUserId) return
                    const ea = keyExpiresAt ? new Date(keyExpiresAt).toISOString() : ''
                    const ia = typeof keyIsActive === 'boolean' ? String(keyIsActive) : ''
                    const parts = [keyCardId, keyUserId, keyName || '', ea, ia]
                    const line = parts.join(',').replace(/,+$/,'')
                    setKeysText(kt => (kt ? `${kt}\n${line}` : line))
                  }}
                >Add item</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Items (one per line)</label>
              <textarea
                value={keysText}
                onChange={(e) => setKeysText(e.target.value)}
                placeholder="cardId,userId[,name][,expiresAtISO][,isActive]"
                rows={8}
                className="w-full border rounded p-2 font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">Example: <code>CARD-001,user_123,Main Card,2025-12-31T23:59:59Z,true</code></p>
              <div className="flex gap-2 mt-2">
                <button className="px-2 py-1 border rounded text-xs" onClick={downloadKeysTemplate}>Download key assignment CSV template</button>
              </div>
              {keysErrors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                  {keysErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1 border rounded" disabled={submitting} onClick={() => setShowKeysModal(false)}>Cancel</button>
              <button className="px-3 py-1 border rounded bg-blue-600 text-white disabled:opacity-50" disabled={submitting || hasKeysErrors} onClick={handleSubmitKeys}>
                {submitting ? 'Assigning…' : 'Assign keys'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
