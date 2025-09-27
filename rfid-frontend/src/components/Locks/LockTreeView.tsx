import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, BoltIcon, PowerIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon, BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/solid';

interface Lock {
  id: string;
  name: string;
  lockType: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  projectCityId: string;
}

interface Location {
  id: string;
  name: string;
  description: string | null;
  locks: Lock[];
  counts: {
    total: number;
    online: number;
    offline: number;
    active: number;
    inactive: number;
  };
}

interface Address {
  id: string;
  street: string;
  number: string;
  zipCode: string;
  city: {
    id: string;
    name: string;
  };
  locations: Location[];
  counts: {
    total: number;
    online: number;
    offline: number;
    active: number;
    inactive: number;
    locations: number;
  };
}

interface User {
  role: string;
}

interface LockTreeViewProps {
  onLockSelect?: (lock: Lock) => void;
  onLocationSelect?: (location: Location) => void;
  onLockAction?: (action: 'ping' | 'toggle-active', lock: Lock) => void;
  searchTerm?: string;
  className?: string;
  user?: User;
}

const StatusBadge: React.FC<{ count: number; type: 'online' | 'offline' | 'total' }> = ({ count, type }) => {
  const colors = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    total: 'bg-blue-100 text-blue-800'
  };

  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
      {count}
    </span>
  );
};

const LockTreeView: React.FC<LockTreeViewProps> = ({ 
  onLockSelect, 
  onLocationSelect, 
  onLockAction,
  searchTerm = '', 
  className = '',
  user
}) => {
  const [treeData, setTreeData] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // User permissions
  const canPing = user && ['ADMIN', 'SUPERVISOR'].includes(user.role);
  const canToggleActive = user && ['ADMIN'].includes(user.role);

  // Format last seen time
  const formatLastSeen = (lastSeen?: string | null) => {
    if (!lastSeen) return 'Never';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchTreeData();
  }, []);

  const fetchTreeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/lock/tree', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tree data');
      }

      const data = await response.json();
      if (data.success) {
        setTreeData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load tree data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tree data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAddressExpanded = (addressId: string) => {
    const newExpanded = new Set(expandedAddresses);
    if (newExpanded.has(addressId)) {
      newExpanded.delete(addressId);
    } else {
      newExpanded.add(addressId);
    }
    setExpandedAddresses(newExpanded);
  };

  const toggleLocationExpanded = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  const filterData = (data: Address[]): Address[] => {
    if (!searchTerm) return data;

    return data.map(address => ({
      ...address,
      locations: address.locations.map(location => ({
        ...location,
        locks: location.locks.filter(lock =>
          lock.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(location => 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.locks.length > 0
      )
    })).filter(address =>
      address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.locations.length > 0
    );
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-md h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-2">⚠️ Error loading locks</div>
        <div className="text-sm text-gray-500">{error}</div>
        <button 
          onClick={fetchTreeData} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredData = filterData(treeData);

  if (filteredData.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        {searchTerm ? 'No locks match your search' : 'No locks found'}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {filteredData.map((address) => (
        <div key={address.id} className="border border-gray-200 rounded-lg">
          {/* Address Header */}
          <div className="flex items-center justify-between p-3 hover:bg-gray-50">
            <div 
              className="flex items-center space-x-3 cursor-pointer flex-1"
              onClick={() => toggleAddressExpanded(address.id)}
            >
              {expandedAddresses.has(address.id) ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {address.street} {address.number}
                </div>
                <div className="text-sm text-gray-500">
                  {address.zipCode} {address.city.name}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge count={address.counts.total} type="total" />
              <StatusBadge count={address.counts.online} type="online" />
              <StatusBadge count={address.counts.offline} type="offline" />
              <span className="text-xs text-gray-500">
                {address.counts.locations} locations
              </span>
              
              {/* Address Actions */}
              {canPing && address.counts.total > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Ping all locks in this address
                    address.locations.forEach(location => {
                      location.locks.forEach(lock => {
                        onLockAction?.('ping', lock);
                      });
                    });
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors"
                  title={`Ping all ${address.counts.total} locks in this address`}
                >
                  <BoltIcon className="h-3 w-3 mr-1" />
                  Ping All
                </button>
              )}
            </div>
          </div>

          {/* Locations */}
          {expandedAddresses.has(address.id) && (
            <div className="border-t border-gray-200 bg-gray-50">
              {address.locations.map((location) => (
                <div key={location.id} className="border-b border-gray-200 last:border-b-0">
                  {/* Location Header */}
                  <div className="flex items-center justify-between p-3 pl-8 hover:bg-gray-100">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer flex-1"
                      onClick={() => {
                        toggleLocationExpanded(location.id);
                        onLocationSelect?.(location);
                      }}
                    >
                      {expandedLocations.has(location.id) ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                      )}
                      <BuildingOfficeIcon className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">{location.name}</div>
                        {location.description && (
                          <div className="text-sm text-gray-500">{location.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge count={location.counts.total} type="total" />
                      <StatusBadge count={location.counts.online} type="online" />
                      <StatusBadge count={location.counts.offline} type="offline" />
                      
                      {/* Location Actions */}
                      {canPing && location.counts.total > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Ping all locks in this location
                            location.locks.forEach(lock => {
                              onLockAction?.('ping', lock);
                            });
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors"
                          title={`Ping all ${location.counts.total} locks`}
                        >
                          <BoltIcon className="h-3 w-3 mr-1" />
                          Ping All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Locks */}
                  {expandedLocations.has(location.id) && (
                    <div className="bg-white">
                      {location.locks.map((lock) => (
                        <div
                          key={lock.id}
                          className="flex items-center justify-between p-3 pl-12 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div 
                            className="flex items-center space-x-3 cursor-pointer flex-1"
                            onClick={() => onLockSelect?.(lock)}
                          >
                            <LockClosedIcon 
                              className={`h-4 w-4 ${lock.isOnline ? 'text-green-600' : 'text-red-600'}`} 
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{lock.name}</div>
                              <div className="text-sm text-gray-500">
                                {lock.lockType} • {lock.isActive ? 'Active' : 'Inactive'} • Last seen: {formatLastSeen(lock.lastSeen)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Status and Actions */}
                          <div className="flex items-center space-x-2">
                            {/* Status Indicators */}
                            <div className="flex items-center space-x-1">
                              {/* Online/Offline Status */}
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  lock.isOnline
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                  lock.isOnline ? 'bg-green-400' : 'bg-red-400'
                                }`}></div>
                                {lock.isOnline ? 'Online' : 'Offline'}
                              </span>
                              
                              {/* Active/Inactive Status */}
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  lock.isActive
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {lock.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            {(canPing || canToggleActive) && (
                              <div className="flex items-center space-x-1 ml-2">
                                {canPing && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onLockAction?.('ping', lock);
                                    }}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors"
                                    title="Ping lock"
                                  >
                                    <BoltIcon className="h-3 w-3 mr-1" />
                                    Ping
                                  </button>
                                )}
                                
                                {canToggleActive && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onLockAction?.('toggle-active', lock);
                                    }}
                                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-transparent transition-colors ${
                                      lock.isActive
                                        ? 'text-red-600 hover:text-red-800 hover:bg-red-50 hover:border-red-200'
                                        : 'text-green-600 hover:text-green-800 hover:bg-green-50 hover:border-green-200'
                                    }`}
                                    title={lock.isActive ? 'Deactivate lock' : 'Activate lock'}
                                  >
                                    <PowerIcon className="h-3 w-3 mr-1" />
                                    {lock.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LockTreeView;