import { PrismaClient, UserRole, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function createTestProject() {
  const project = await prisma.project.create({
    data: {
      name: `Test Company ${Date.now()}`,
      slug: `test-company-${Date.now()}`
    }
  })
  return project
}

export async function createTestCity() {
  const city = await prisma.city.create({
    data: {
      name: `Test City ${Date.now()}`,
      country: 'Test Country'
    }
  })
  return city
}

export async function createTestProjectCity(projectId?: string, cityId?: string) {
  if (!projectId) {
    const project = await createTestProject()
    projectId = project.id
  }
  
  if (!cityId) {
    const city = await createTestCity()
    cityId = city.id
  }

  const projectCity = await prisma.projectCity.create({
    data: {
      projectId,
      cityId
    }
  })
  return projectCity
}

interface UserOverrides {
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  password?: string
  role?: UserRole
  isActive?: boolean
  projectCityId?: string
}

export async function createTestUser(overrides: UserOverrides = {}) {
  const projectCity = overrides.projectCityId ? 
    { id: overrides.projectCityId } : 
    await createTestProjectCity()

  const hashedPassword = await bcrypt.hash(overrides.password || 'Password123!', 10)
  
  const user = await prisma.user.create({
    data: {
      username: overrides.username || `testuser_${Date.now()}`,
      email: overrides.email || `test_${Date.now()}@example.com`,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      password: hashedPassword,
      role: overrides.role || UserRole.USER,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      projectCityId: projectCity.id
    }
  })
  return user
}

export async function createTestAddress(projectCityId?: string) {
  const projectCity = projectCityId ? 
    await prisma.projectCity.findUnique({ where: { id: projectCityId } }) || await createTestProjectCity() :
    await createTestProjectCity()

  const address = await prisma.address.create({
    data: {
      street: 'Test Street',
      number: '123',
      zipCode: '12345',
      cityId: projectCity.cityId,
      projectCityId: projectCity.id
    }
  })
  return address
}

export async function createTestLocation(addressId?: string, projectCityId?: string) {
  if (!addressId) {
    const address = await createTestAddress(projectCityId)
    addressId = address.id
    projectCityId = address.projectCityId || undefined
  }

  const location = await prisma.location.create({
    data: {
      name: `Test Location ${Date.now()}`,
      description: 'Test location for unit tests',
      addressId,
      projectCityId: projectCityId || (await createTestProjectCity()).id
    }
  })
  return location
}

export async function createTestLock(locationId?: string, projectCityId?: string) {
  if (!locationId) {
    const location = await createTestLocation(undefined, projectCityId)
    locationId = location.id
    projectCityId = location.projectCityId || undefined
  }

  const lock = await prisma.lock.create({
    data: {
      name: `Test Lock ${Date.now()}`,
      description: 'Test lock for unit tests',
      deviceId: `TEST_DEVICE_${Date.now()}`,
      secretKey: `secret_${Date.now()}`,
      lockType: 'DOOR',
      locationId,
      projectCityId: projectCityId || (await createTestProjectCity()).id,
      isActive: true,
      isOnline: true
    }
  })
  return lock
}

export async function createTestRFIDKey(userId?: string) {
  if (!userId) {
    const user = await createTestUser()
    userId = user.id
  }

  const rfidKey = await prisma.rFIDKey.create({
    data: {
      cardId: `TEST_CARD_${Date.now()}`,
      name: `Test RFID Key ${Date.now()}`,
      userId,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  })
  return rfidKey
}

export async function createTestPermission(userId?: string, lockId?: string) {
  if (!userId) {
    const user = await createTestUser()
    userId = user.id
  }
  
  if (!lockId) {
    const lock = await createTestLock()
    lockId = lock.id
  }

  const permission = await prisma.userPermission.create({
    data: {
      userId,
      lockId,
      canAccess: true,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
    }
  })
  return permission
}

interface AccessLogOverrides {
  userId?: string
  lockId?: string
  rfidKeyId?: string
  accessType?: 'RFID_CARD' | 'MANUAL' | 'EMERGENCY' | 'MAINTENANCE'
  result?: 'GRANTED' | 'DENIED_INVALID_CARD' | 'DENIED_EXPIRED_CARD' | 'DENIED_NO_PERMISSION' | 'DENIED_INACTIVE_USER' | 'DENIED_INACTIVE_LOCK' | 'DENIED_TIME_RESTRICTION' | 'ERROR_DEVICE_OFFLINE' | 'ERROR_SYSTEM_FAILURE'
  timestamp?: Date
  projectCityId?: string
  deviceInfo?: Prisma.JsonValue
  metadata?: Prisma.JsonValue
}

export async function createTestAccessLog(overrides: AccessLogOverrides = {}) {
  const user = overrides.userId ? 
    await prisma.user.findUnique({ where: { id: overrides.userId } }) || await createTestUser() :
    await createTestUser()
  
  const lock = overrides.lockId ? 
    await prisma.lock.findUnique({ where: { id: overrides.lockId } }) || await createTestLock() :
    await createTestLock()
  
  const rfidKey = overrides.rfidKeyId ? 
    await prisma.rFIDKey.findUnique({ where: { id: overrides.rfidKeyId } }) || await createTestRFIDKey(user.id) :
    await createTestRFIDKey(user.id)

  const accessLog = await prisma.accessLog.create({
    data: {
      accessType: overrides.accessType || 'RFID_CARD',
      result: overrides.result || 'GRANTED',
      timestamp: overrides.timestamp || new Date(),
      userId: user.id,
      lockId: lock.id,
      rfidKeyId: rfidKey.id,
      projectCityId: overrides.projectCityId || lock.projectCityId || (await createTestProjectCity()).id,
      deviceInfo: overrides.deviceInfo || Prisma.JsonNull,
      metadata: overrides.metadata || Prisma.JsonNull
    }
  })
  return accessLog
}

export async function cleanupTestData() {
  await prisma.accessLog.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.rFIDKey.deleteMany()
  await prisma.lock.deleteMany()
  await prisma.location.deleteMany()
  await prisma.address.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.twoFactorChallenge.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.projectCity.deleteMany()
  await prisma.project.deleteMany()
  await prisma.city.deleteMany()
}