import { PrismaClient } from '@prisma/client'

// Global test setup
const prisma = new PrismaClient()

// Make Jest globals available
declare global {
  var prisma: PrismaClient
}

beforeAll(async () => {
  // Reset test database before running tests
  try {
    await prisma.$executeRaw`TRUNCATE TABLE "User", "Project", "City", "ProjectCity", "Address", "Location", "Lock", "RFIDKey", "UserPermission", "AccessLog" RESTART IDENTITY CASCADE`
  } catch (error) {
    console.log('Database truncation failed (might be empty):', error instanceof Error ? error.message : String(error))
  }
})

afterAll(async () => {
  // Clean up after all tests
  await prisma.$disconnect()
})

// Make prisma available globally in tests
global.prisma = prisma

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
}