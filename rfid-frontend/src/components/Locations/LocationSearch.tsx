import React from 'react'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface LocationSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filterOptions: {
    showOfflineOnly: boolean
    showLowBattery: boolean
    sortBy: 'name' | 'status' | 'locks'
  }
  onFilterChange: (options: LocationSearchProps['filterOptions']) => void
  totalCount: number
  filteredCount: number
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  searchQuery,
  onSearchChange,
  filterOptions,
  onFilterChange,
  totalCount,
  filteredCount
}) => {
  const [showFilters, setShowFilters] = React.useState(false)

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search locations, addresses, or locks..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Toggle and Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredCount} of {totalCount} locations
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
          {(filterOptions.showOfflineOnly || filterOptions.showLowBattery) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filters */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Status Filters</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={filterOptions.showOfflineOnly}
                    onChange={(e) => onFilterChange({
                      ...filterOptions,
                      showOfflineOnly: e.target.checked
                    })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Show offline locks only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={filterOptions.showLowBattery}
                    onChange={(e) => onFilterChange({
                      ...filterOptions,
                      showLowBattery: e.target.checked
                    })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Show low battery locks only</span>
                </label>
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Sort By</h4>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={filterOptions.sortBy}
                onChange={(e) => onFilterChange({
                  ...filterOptions,
                  sortBy: e.target.value as 'name' | 'status' | 'locks'
                })}
              >
                <option value="name">Name (A-Z)</option>
                <option value="status">Status</option>
                <option value="locks">Number of Locks</option>
              </select>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => onFilterChange({
                    showOfflineOnly: false,
                    showLowBattery: false,
                    sortBy: 'name'
                  })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Clear all filters
                </button>
                <button
                  onClick={() => onSearchChange('')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Clear search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LocationSearch