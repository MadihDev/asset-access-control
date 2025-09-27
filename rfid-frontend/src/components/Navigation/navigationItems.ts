import {
  HomeIcon,
  MapPinIcon,
  LockClosedIcon,
  UsersIcon,
  KeyIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export interface NavigationItem {
  id: string
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
  badge?: number | string
  onClick?: () => void
  children?: NavigationItem[]
}

export const defaultNavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon
  },
  {
    id: 'locations',
    name: 'Locations',
    icon: MapPinIcon,
    children: [
      {
        id: 'locations-manage',
        name: 'Manage Locations',
        href: '/locations',
        icon: MapPinIcon
      },
      {
        id: 'locations-hierarchy',
        name: 'Location Hierarchy',
        href: '/locations/hierarchy',
        icon: ChartBarIcon
      }
    ]
  },
  {
    id: 'locks',
    name: 'Locks',
    icon: LockClosedIcon,
    children: [
      {
        id: 'locks-manage',
        name: 'Manage Locks',
        href: '/locks',
        icon: LockClosedIcon
      },
      {
        id: 'locks-status',
        name: 'Lock Status',
        href: '/locks/status',
        icon: ShieldCheckIcon
      }
    ]
  },
  {
    id: 'users',
    name: 'Users',
    icon: UsersIcon,
    children: [
      {
        id: 'users-manage',
        name: 'Manage Users',
        href: '/users',
        icon: UsersIcon
      },
      {
        id: 'users-permissions',
        name: 'User Permissions',
        href: '/users/permissions',
        icon: KeyIcon
      }
    ]
  },
  {
    id: 'access',
    name: 'Access Control',
    icon: KeyIcon,
    children: [
      {
        id: 'access-permissions',
        name: 'Permissions',
        href: '/access/permissions',
        icon: KeyIcon
      },
      {
        id: 'access-logs',
        name: 'Access Logs',
        href: '/access/logs',
        icon: ClockIcon
      },
      {
        id: 'access-reports',
        name: 'Reports',
        href: '/access/reports',
        icon: DocumentTextIcon
      }
    ]
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    icon: ChartBarIcon,
    children: [
      {
        id: 'monitoring-overview',
        name: 'System Overview',
        href: '/monitoring',
        icon: ChartBarIcon
      },
      {
        id: 'monitoring-alerts',
        name: 'Alerts',
        href: '/monitoring/alerts',
        icon: ShieldCheckIcon,
        badge: 3
      }
    ]
  },
  {
    id: 'settings',
    name: 'Settings',
    href: '/settings',
    icon: CogIcon
  }
]