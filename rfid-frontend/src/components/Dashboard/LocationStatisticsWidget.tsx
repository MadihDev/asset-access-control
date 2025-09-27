import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useTenantScope } from '../../hooks/useTenantScope'

interface LocationStats {
  id: string
  name: string
  address: {
    street: string
    number: string
    city: { name: string }
  }
  totalLocks: number
  onlineLocks: number
  offlineLocks: number
  activeUsers: number
  totalAccesses: number
  todayAccesses: number
  averageResponseTime: number
  batteryAlerts: number
}

interface LocationStatisticsWidgetProps {
  className?: string
}

export default function LocationStatisticsWidget({ className = '' }: LocationStatisticsWidgetProps) {
  const { tenantParams } = useTenantScope()

  const { data: locationStats = [], isLoading, error } = useQuery({
    queryKey: ['location-statistics', tenantParams],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/location-statistics', {
        params: tenantParams
      })
      return response.data.data as LocationStats[]
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const totalStats = locationStats.reduce(
    (acc, location) => ({
      totalLocks: acc.totalLocks + location.totalLocks,
      onlineLocks: acc.onlineLocks + location.onlineLocks,
      offlineLocks: acc.offlineLocks + location.offlineLocks,
      activeUsers: acc.activeUsers + location.activeUsers,
      totalAccesses: acc.totalAccesses + location.totalAccesses,
      todayAccesses: acc.todayAccesses + location.todayAccesses,
      batteryAlerts: acc.batteryAlerts + location.batteryAlerts
    }),
    {
      totalLocks: 0,
      onlineLocks: 0,
      offlineLocks: 0,
      activeUsers: 0,
      totalAccesses: 0,
      todayAccesses: 0,
      batteryAlerts: 0
    }
  )

  const getStatusColor = (onlineCount: number, totalCount: number) => {
    if (totalCount === 0) return 'text-gray-500'
    const percentage = (onlineCount / totalCount) * 100
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (onlineCount: number, totalCount: number) => {
    if (totalCount === 0) return { text: 'No locks', className: 'bg-gray-100 text-gray-600' }
    const percentage = (onlineCount / totalCount) * 100
    if (percentage >= 90) return { text: `${percentage.toFixed(0)}% online`, className: 'bg-green-100 text-green-800' }
    if (percentage >= 70) return { text: `${percentage.toFixed(0)}% online`, className: 'bg-yellow-100 text-yellow-800' }
    return { text: `${percentage.toFixed(0)}% online`, className: 'bg-red-100 text-red-800' }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <svg className="h-8 w-8 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-600 text-sm font-medium">Failed to load statistics</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Location Statistics</h3>
          </div>
          <span className="text-sm text-gray-500">{locationStats.length} locations</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalLocks}</div>
            <div className="text-sm text-gray-500">Total Locks</div>
            <div className={`text-xs font-medium ${getStatusColor(totalStats.onlineLocks, totalStats.totalLocks)}`}>
              {totalStats.onlineLocks} online
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalStats.activeUsers}</div>
            <div className="text-sm text-gray-500">Active Users</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStats.todayAccesses)}</div>
            <div className="text-sm text-gray-500">Today's Access</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalStats.batteryAlerts}</div>
            <div className="text-sm text-gray-500">Battery Alerts</div>
          </div>
        </div>
      </div>

      {/* Top Locations */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Most Accessed Locations</h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {locationStats
            .sort((a, b) => b.todayAccesses - a.todayAccesses)
            .slice(0, 5)
            .map((location, index) => {
              const statusBadge = getStatusBadge(location.onlineLocks, location.totalLocks)
              
              return (
                <div key={location.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-800">#{index + 1}</span>
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{location.name}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {location.address.street} {location.address.number}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{location.todayAccesses}</div>
                      <div className="text-xs text-gray-500">accesses</div>
                    </div>
                    
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                      {statusBadge.text}
                    </span>
                    
                    {location.batteryAlerts > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-xs text-red-600 font-medium">{location.batteryAlerts}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
        
        {locationStats.length === 0 && (
          <div className="text-center py-8">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600 font-medium">No location data available</p>
            <p className="text-gray-500 text-sm mt-1">Statistics will appear once locations are created and used</p>
          </div>
        )}
      </div>
    </div>
  )
}