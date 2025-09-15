import * as Prisma from '@prisma/client'

// Single Prisma client instance for the whole app
// Avoids exhausting DB connections in dev with hot reload
const prisma = new (Prisma as any).PrismaClient()

export default prisma
