import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock the tenant API to prevent network calls during tests
vi.mock('../services/tenantApi', () => ({
  fetchProjects: vi.fn().mockResolvedValue([
    { id: 'project-1', slug: 'test-project', name: 'Test Project' }
  ]),
  fetchCitiesByProject: vi.fn().mockResolvedValue([
    { id: 'city-1', name: 'Test City', projectId: 'project-1' }
  ])
}))

// Mock the notification API to prevent network calls during tests
vi.mock('../services/notificationApi', () => ({
  fetchNotifications: vi.fn().mockResolvedValue([]),
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllAsRead: vi.fn().mockResolvedValue(undefined)
}))

// Mock WebSocket connections
vi.mock('../services/websocket', () => ({
  createWebSocket: vi.fn().mockReturnValue({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN
  })
}))

// Mock the API service to prevent actual HTTP calls
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:5000' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  },
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:5000' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}))

// Global cleanup
afterEach(() => {
  cleanup()
})

// Suppress console warnings during tests (unless they're actual test failures)
const originalWarn = console.warn
const originalError = console.error
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    // Allow test-specific warnings but suppress known network/mock warnings
    const firstArg = args[0]
    if (
      (typeof firstArg === 'string' && (
        firstArg.includes('Tenant selection persist failed') ||
        firstArg.includes('Failed to execute "fetch()"') ||
        firstArg.includes('ECONNREFUSED') ||
        firstArg.includes('Tenant refresh failed')
      ))
    ) {
      return
    }
    originalWarn(...args)
  }
  
  console.error = (...args: unknown[]) => {
    // Suppress network-related errors during tests
    const firstArg = args[0]
    if (
      (typeof firstArg === 'string' && (
        firstArg.includes('ECONNREFUSED') ||
        firstArg.includes('Failed to execute "fetch()"')
      )) ||
      (typeof firstArg === 'object' && firstArg !== null && 'message' in firstArg &&
        typeof firstArg.message === 'string' && firstArg.message.includes('ECONNREFUSED'))
    ) {
      return
    }
    originalError(...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})
