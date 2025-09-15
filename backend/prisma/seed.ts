import * as Prisma from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new (Prisma as any).PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Optional cleanup to make seed idempotent in dev
  // Deletes in dependency order to avoid FK violations
  console.log('🧹 Clearing existing data...')
  await prisma.$transaction([
    prisma.accessLog.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.userPermission.deleteMany(),
    prisma.rFIDKey.deleteMany(),
    prisma.lock.deleteMany(),
    prisma.address.deleteMany(),
    prisma.city.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
    prisma.systemConfig.deleteMany(),
  ])
  // Ensure self-references are safe (not strictly needed here but harmless)
  await prisma.user.updateMany({ data: { createdById: null } })
  await prisma.user.deleteMany()

  // Create cities
  const cities = await prisma.city.createMany({
    data: [
      { name: 'New York', country: 'USA' },
      { name: 'London', country: 'UK' },
      { name: 'Paris', country: 'France' },
      { name: 'Berlin', country: 'Germany' },
      { name: 'Tokyo', country: 'Japan' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Created cities')

  // Get cities for relations
  const cityRecords = await prisma.city.findMany()

  // Create addresses
  const addresses = []
  for (const city of cityRecords) {
    addresses.push(
      { street: 'Main Street', number: '123', zipCode: '10001', cityId: city.id },
      { street: 'Broadway', number: '456', zipCode: '10002', cityId: city.id },
      { street: 'Park Avenue', number: '789', zipCode: '10003', cityId: city.id }
    )
  }

  await prisma.address.createMany({ data: addresses, skipDuplicates: true })
  console.log('✅ Created addresses')

  // Get addresses for relations
  const addressRecords = await prisma.address.findMany()

  // Create locks
  const lockTypes = ['DOOR', 'GATE', 'CABINET', 'ROOM'] as const
  type LockType = typeof lockTypes[number]
  const locks: Array<{ name: string; description?: string; deviceId: string; secretKey: string; lockType: LockType; addressId: string; isOnline: boolean }> = []
  for (const address of addressRecords.slice(0, 10)) { // Limit to 10 locks
    const lockType: LockType = lockTypes[Math.floor(Math.random() * lockTypes.length)]
    locks.push({
      name: `Lock-${address.street}-${address.number}`,
      description: `Main entrance lock for ${address.street} ${address.number}`,
      deviceId: `DEVICE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      secretKey: Math.random().toString(36).substring(2, 32),
      lockType,
      addressId: address.id,
      isOnline: Math.random() > 0.3 // 70% online
    })
  }

  await prisma.lock.createMany({ data: locks, skipDuplicates: true })
  console.log('✅ Created locks')

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const users = await prisma.user.createMany({
    data: [
      {
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      },
      {
        email: 'manager@example.com',
        username: 'manager',
        firstName: 'Site',
        lastName: 'Manager',
        password: hashedPassword,
        role: 'ADMIN'
      },
      {
        email: 'supervisor@example.com',
        username: 'supervisor',
        firstName: 'Floor',
        lastName: 'Supervisor',
        password: hashedPassword,
        role: 'SUPERVISOR'
      },
      {
        email: 'user1@example.com',
        username: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        password: hashedPassword,
        role: 'USER'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        firstName: 'Jane',
        lastName: 'Smith',
        password: hashedPassword,
        role: 'USER'
      }
    ],
    skipDuplicates: true
  })
  console.log('✅ Created users')

  // Get users and locks for relations
  const userRecords = await prisma.user.findMany()
  const lockRecords = await prisma.lock.findMany()

  // Create RFID keys
  const rfidKeys = []
  for (const user of userRecords) {
    rfidKeys.push({
      cardId: `CARD-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      name: `${user.firstName}'s Access Card`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    })
  }

  await prisma.rFIDKey.createMany({ data: rfidKeys, skipDuplicates: true })
  console.log('✅ Created RFID keys')

  // Create user permissions (give users access to some locks)
  const permissions = []
  for (const user of userRecords) {
    // Admins get access to all locks
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      for (const lock of lockRecords) {
        permissions.push({
          userId: user.id,
          lockId: lock.id,
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        })
      }
    } else {
      // Regular users get access to 2-3 random locks
      const numLocks = Math.floor(Math.random() * 2) + 2
      const shuffledLocks = lockRecords.sort(() => 0.5 - Math.random())
      
      for (let i = 0; i < Math.min(numLocks, shuffledLocks.length); i++) {
        permissions.push({
          userId: user.id,
          lockId: shuffledLocks[i].id,
          validTo: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
        })
      }
    }
  }

  await prisma.userPermission.createMany({ data: permissions, skipDuplicates: true })
  console.log('✅ Created user permissions')

  // Create sample access logs
  const accessLogs = []
  const rfidKeyRecords = await prisma.rFIDKey.findMany({ include: { user: true } })
  
  for (let i = 0; i < 50; i++) {
    const randomRfidKey = rfidKeyRecords[Math.floor(Math.random() * rfidKeyRecords.length)]
    const randomLock = lockRecords[Math.floor(Math.random() * lockRecords.length)]
    const randomDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
    
    accessLogs.push({
      accessType: 'RFID_CARD',
      result: Math.random() > 0.2 ? 'GRANTED' : 'DENIED_NO_PERMISSION', // 80% success rate
      timestamp: randomDate,
      userId: randomRfidKey.userId,
      rfidKeyId: randomRfidKey.id,
      lockId: randomLock.id,
      deviceInfo: {
        deviceModel: 'RFID-Reader-v2',
        firmwareVersion: '2.1.0',
        signalStrength: Math.floor(Math.random() * 100)
      }
    })
  }

  await prisma.accessLog.createMany({ data: accessLogs as any })
  console.log('✅ Created access logs')

  // Create system configuration
  await prisma.systemConfig.createMany({
    data: [
      { key: 'SYSTEM_NAME', value: 'RFID Access Control System', type: 'string' },
      { key: 'MAX_LOGIN_ATTEMPTS', value: '5', type: 'number' },
      { key: 'SESSION_TIMEOUT', value: '30', type: 'number' },
      { key: 'ENABLE_EMAIL_NOTIFICATIONS', value: 'true', type: 'boolean' },
      { key: 'ENABLE_SMS_NOTIFICATIONS', value: 'false', type: 'boolean' },
      { key: 'DEFAULT_CARD_EXPIRY_DAYS', value: '365', type: 'number' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Created system configuration')

  // Create notification templates
  await prisma.notificationTemplate.createMany({
    data: [
      {
        name: 'ACCESS_DENIED_EMAIL',
        type: 'EMAIL',
        subject: 'Access Denied Alert',
        body: 'Access was denied for user {{userName}} at {{lockName}} on {{timestamp}}'
      },
      {
        name: 'CARD_EXPIRY_WARNING',
        type: 'EMAIL',
        subject: 'RFID Card Expiring Soon',
        body: 'Your RFID card {{cardId}} will expire on {{expiryDate}}'
      },
      {
        name: 'UNAUTHORIZED_ACCESS_SMS',
        type: 'SMS',
        body: 'ALERT: Unauthorized access attempt at {{lockName}} - {{timestamp}}'
      }
    ],
    skipDuplicates: true
  })
  console.log('✅ Created notification templates')

  console.log('🎉 Database seeding completed!')
  console.log('\n📋 Login Credentials:')
  console.log('• Admin: admin@example.com / password123')
  console.log('• Manager: manager@example.com / password123')
  console.log('• Supervisor: supervisor@example.com / password123')
  console.log('• User: user1@example.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })