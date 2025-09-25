import { PrismaClient, AccessType, AccessResult } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Optional cleanup to make seed idempotent in dev
  // Deletes in dependency order to avoid FK violations
  console.log('🧹 Clearing existing data...')
  await prisma.$transaction([
    prisma.accessLog.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.userPermission.deleteMany(),
    prisma.rFIDKey.deleteMany(),
    prisma.lock.deleteMany(),
    prisma.address.deleteMany(),
    // Note: defer city deletion until after users are removed
    prisma.notificationTemplate.deleteMany(),
    prisma.systemConfig.deleteMany(),
  ])
  // Detach users from FKs then remove users before deleting cities and projects
  await prisma.user.updateMany({ data: { createdById: null, projectCityId: null } })
  await prisma.user.deleteMany()
  // Delete project-city relationships before cities and projects
  await prisma.projectCity.deleteMany()
  await prisma.project.deleteMany()
  // Now it's safe to delete cities
  await prisma.city.deleteMany()

  // Create cities
  await prisma.city.createMany({
    data: [
      { name: 'Amsterdam', country: 'Netherlands' },
      { name: 'Rotterdam', country: 'Netherlands' },
      { name: 'The Hague', country: 'Netherlands' },
      { name: 'Utrecht', country: 'Netherlands' },
      { name: 'Eindhoven', country: 'Netherlands' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Created cities')

  // Get cities for relations
  const cityRecords = await prisma.city.findMany()
  type CityRecord = (typeof cityRecords)[number]

  // Create multiple projects for demo
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { slug: 'perfectit-solutions' },
      create: { name: 'PerfectIT Solutions', slug: 'perfectit-solutions' },
      update: {},
    }),
    prisma.project.upsert({
      where: { slug: 'acme-corporation' },
      create: { name: 'Acme Corporation', slug: 'acme-corporation' },
      update: {},
    })
  ])

  // Create project-city relationships for all projects
  const projectCitiesData = []
  for (const project of projects) {
    for (const city of cityRecords) {
      projectCitiesData.push({ projectId: project.id, cityId: city.id })
    }
  }
  
  await prisma.projectCity.createMany({ data: projectCitiesData, skipDuplicates: true })
  const projectCities = await prisma.projectCity.findMany()
  const projectCityByCityId = new Map<string, string>()
  const projectCityByProjectAndCity = new Map<string, string>()
  
  for (const pc of projectCities) {
    projectCityByCityId.set(pc.cityId, pc.id)
    const project = projects.find(p => p.id === pc.projectId)
    const city = cityRecords.find(c => c.id === pc.cityId)
    if (project && city) {
      projectCityByProjectAndCity.set(`${project.slug}-${city.name}`, pc.id)
    }
  }
  console.log('✅ Created projects and project-city links')

  // Create addresses for each project-city combination
  const addresses: Array<{ street: string; number: string; zipCode: string; cityId: string; projectCityId: string | null }> = []
  for (const city of cityRecords as CityRecord[]) {
    for (const project of projects) {
      const projectCityId = projectCityByProjectAndCity.get(`${project.slug}-${city.name}`)
      if (projectCityId) {
        addresses.push(
          { street: `${project.name} Main St`, number: '123', zipCode: '10001', cityId: city.id, projectCityId },
          { street: `${project.name} Broadway`, number: '456', zipCode: '10002', cityId: city.id, projectCityId },
          { street: `${project.name} Park Ave`, number: '789', zipCode: '10003', cityId: city.id, projectCityId }
        )
      }
    }
  }

  await prisma.address.createMany({ data: addresses, skipDuplicates: true })
  console.log('✅ Created addresses')

  // Get addresses for relations
  const addressRecords = await prisma.address.findMany()
  type AddressRecord = (typeof addressRecords)[number]

  // Create locks
  const lockTypes = ['DOOR', 'GATE', 'CABINET', 'ROOM'] as const
  type LockType = typeof lockTypes[number]
  const locks: Array<{ name: string; description?: string; deviceId: string; secretKey: string; lockType: LockType; addressId: string; isOnline: boolean; projectCityId: string | null }> = []
  for (const address of (addressRecords as AddressRecord[]).slice(0, 10)) { // Limit to 10 locks
    const lockType: LockType = lockTypes[Math.floor(Math.random() * lockTypes.length)]
    locks.push({
      name: `Lock-${address.street}-${address.number}`,
      description: `Main entrance lock for ${address.street} ${address.number}`,
      deviceId: `DEVICE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      secretKey: Math.random().toString(36).substring(2, 32),
      lockType,
      addressId: address.id,
      isOnline: Math.random() > 0.3, // 70% online
      projectCityId: address.projectCityId, // Use the address's project-city ID directly
    })
  }

  await prisma.lock.createMany({ data: locks, skipDuplicates: true })
  console.log('✅ Created locks')

  // Create users with your specific demo credentials
  const hashedPassword = await bcrypt.hash('password123', 10)

  await prisma.user.createMany({
    data: [
      // PerfectIT Solutions users
      {
        email: 'perfectit_admin@perfectitsolutions.com',
        username: 'perfectitadmin',
        firstName: 'PerfectIT',
        lastName: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN'
      },
      {
        email: 'perfectit_user@perfectitsolutions.com',
        username: 'perfectituser',
        firstName: 'PerfectIT',
        lastName: 'User',
        password: hashedPassword,
        role: 'USER'
      },
      // Acme Corporation users
      {
        email: 'acme_admin@acmecorp.com',
        username: 'acmeadmin',
        firstName: 'Acme',
        lastName: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN'
      },
      {
        email: 'acme_user@acmecorp.com',
        username: 'acmeuser',
        firstName: 'Acme',
        lastName: 'User',
        password: hashedPassword,
        role: 'USER'
      }
    ],
    skipDuplicates: true
  })
  console.log('✅ Created users')

  // Assign users to specific project-city combinations
  const userProjectCityMap: Array<{ username: string; projectSlug: string; cityName: string }> = [
    { username: 'perfectitadmin', projectSlug: 'perfectit-solutions', cityName: 'Amsterdam' },
    { username: 'perfectituser', projectSlug: 'perfectit-solutions', cityName: 'Rotterdam' },
    { username: 'acmeadmin', projectSlug: 'acme-corporation', cityName: 'Amsterdam' },
    { username: 'acmeuser', projectSlug: 'acme-corporation', cityName: 'Utrecht' }
  ]

  for (const upc of userProjectCityMap) {
    const projectCityId = projectCityByProjectAndCity.get(`${upc.projectSlug}-${upc.cityName}`)
    if (projectCityId) {
      await prisma.user.update({
        where: { username: upc.username },
        data: {
          projectCity: { connect: { id: projectCityId } }
        }
      })
    }
  }
  console.log('✅ Assigned users to project-city combinations')

  // Get users and locks for relations
  const userRecords = await prisma.user.findMany()
  const lockRecords = await prisma.lock.findMany()
  type UserRecord = (typeof userRecords)[number]
  type LockRecord = (typeof lockRecords)[number]

  // Create RFID keys
  const rfidKeys: Array<{ cardId: string; name: string; userId: string; expiresAt: Date; projectCityId: string }> = []
  for (const user of userRecords as UserRecord[]) {
    rfidKeys.push({
      cardId: `CARD-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      name: `${user.firstName}'s Access Card`,
      userId: user.id,
      projectCityId: user.projectCityId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    })
  }

  await prisma.rFIDKey.createMany({ data: rfidKeys, skipDuplicates: true })
  console.log('✅ Created RFID keys')

  // Create user permissions (give users access to locks within their tenant only)
  const permissions: Array<{ userId: string; lockId: string; validTo: Date; projectCityId?: string | null }> = []
  const addressMap = new Map(addressRecords.map((a) => [a.id, a]))
  for (const user of userRecords as UserRecord[]) {
    // Users only get access to locks within their own project-city
    const userProjectCityId = user.projectCityId
    if (!userProjectCityId) continue // Skip users without project-city assignment
    
    const eligibleLocks = (lockRecords as LockRecord[]).filter(lock => {
      const address = addressMap.get(lock.addressId)
      return address?.projectCityId === userProjectCityId
    })
    
    if (user.role === 'ADMIN') {
      // Admins get access to all locks within their tenant
      for (const lock of eligibleLocks) {
        permissions.push({
          userId: user.id,
          lockId: lock.id,
          validTo: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
          projectCityId: addressMap.get(lock.addressId)?.projectCityId || null,
        })
      }
    } else {
      // Regular users get access to 2-3 random locks within their tenant
      const numLocks = Math.floor(Math.random() * 2) + 2
      const shuffledLocks = eligibleLocks.slice().sort(() => 0.5 - Math.random())
      
      for (let i = 0; i < Math.min(numLocks, shuffledLocks.length); i++) {
        permissions.push({
          userId: user.id,
          lockId: shuffledLocks[i].id,
          validTo: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
          projectCityId: addressMap.get(shuffledLocks[i].addressId)?.projectCityId || null,
        })
      }
    }
  }

  await prisma.userPermission.createMany({ data: permissions, skipDuplicates: true })
  console.log('✅ Created user permissions')

  // Create sample access logs
  const accessLogs: Array<{ accessType: AccessType; result: AccessResult; timestamp: Date; userId: string | null; rfidKeyId: string; lockId: string; projectCityId?: string | null; deviceInfo: { deviceModel: string; firmwareVersion: string; signalStrength: number } } > = []
  const rfidKeyRecords = await prisma.rFIDKey.findMany({ include: { user: true } })
  
  for (let i = 0; i < 50; i++) {
    const randomRfidKey = rfidKeyRecords[Math.floor(Math.random() * rfidKeyRecords.length)]
    const randomLock = lockRecords[Math.floor(Math.random() * lockRecords.length)]
    const randomDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
    
    accessLogs.push({
      accessType: AccessType.RFID_CARD,
      result: Math.random() > 0.2 ? AccessResult.GRANTED : AccessResult.DENIED_NO_PERMISSION, // 80% success rate
      timestamp: randomDate,
      userId: randomRfidKey.userId,
      rfidKeyId: randomRfidKey.id,
      lockId: randomLock.id,
      projectCityId: addressMap.get(randomLock.addressId)?.projectCityId || null,
      deviceInfo: {
        deviceModel: 'RFID-Reader-v2',
        firmwareVersion: '2.1.0',
        signalStrength: Math.floor(Math.random() * 100)
      }
    })
  }

  await prisma.accessLog.createMany({ data: accessLogs })
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
  console.log('\n📋 Demo Login Credentials:')
  console.log('• PerfectIT Admin: username=perfectitadmin, password=password123, project=PerfectIT Solutions, city=Amsterdam')
  console.log('• PerfectIT User: username=perfectituser, password=password123, project=PerfectIT Solutions, city=Rotterdam')
  console.log('• Acme Admin: username=acmeadmin, password=password123, project=Acme Corporation, city=Amsterdam')
  console.log('• Acme User: username=acmeuser, password=password123, project=Acme Corporation, city=Utrecht')
  console.log('\n🔒 Perfect tenant isolation: Each user can only access their own tenant data!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })