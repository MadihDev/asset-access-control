/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  roots: ['<rootDir>/src'],
  setupFiles: [],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: false,
  maxWorkers: 1,
};