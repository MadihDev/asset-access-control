import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Only run tests under backend/__tests__ to avoid duplicate runs from src/__tests__
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts', '<rootDir>/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: [],
  verbose: true,
}

export default config
