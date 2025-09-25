/**
 * Location Hierarchy Demo Data Creation Script
 * 
 * Creates realistic demo data for the Perfect IT Solutions example:
 * - Perfect IT Solutions address with 6 locations
 * - Multiple locks per location
 * - Users with realistic permissions
 * - RFID keys and access logs
 */

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Creating Location Hierarchy Demo Data...')

  try {
    // Find or create Perfect IT Solutions address
    let perfectITAddress = await prisma.address.findFirst({
      where: {
        street: { contains: 'Perfect IT' }
      },
      include: { city: true }
    })

    if (!perfectITAddress) {
      // Create city if it doesn't exist
      const city = await prisma.city.upsert({
        where: { name: 'New York' },
        update: {},
        create: {
          name: 'New York',
          country: 'USA'
        }
      })

      // Create address
      perfectITAddress = await prisma.address.create({
        data: {
          street: 'Perfect IT Solutions Building',
          number: '123',
          zipCode: '10001',
          cityId: city.id
        },
        include: { city: true }
      })
    }

    console.log(`📍 Address: ${perfectITAddress.street} ${perfectITAddress.number}, ${perfectITAddress.city.name}`)

    // Define locations with their locks
    const locationsData = [
      {
        name: 'IT Infrastructure Room',
        description: 'Main server room with network equipment and servers',
        locks: [
          { name: 'Server Rack Lock #1', description: 'Primary server rack access', deviceId: 'SRV-RACK-001' },
          { name: 'Server Rack Lock #2', description: 'Secondary server rack access', deviceId: 'SRV-RACK-002' },
          { name: 'Main Room Access Lock', description: 'Primary entrance to IT infrastructure room', deviceId: 'IT-MAIN-001' },
          { name: 'Network Cabinet Lock', description: 'Network switch and router cabinet', deviceId: 'NET-CAB-001' }
        ]
      },
      {
        name: 'Private Rooms',
        description: 'Individual offices and executive areas',
        locks: [
          { name: 'Office Door Lock #1', description: 'Manager office access', deviceId: 'OFC-001' },
          { name: 'Office Door Lock #2', description: 'Director office access', deviceId: 'OFC-002' },
          { name: 'Filing Cabinet Lock', description: 'Confidential documents storage', deviceId: 'FILE-001' },
          { name: 'Executive Suite Lock', description: 'Executive meeting room access', deviceId: 'EXEC-001' }
        ]
      },
      {
        name: 'Conference Room',
        description: 'Main conference and meeting facilities',
        locks: [
          { name: 'Main Conference Room Lock', description: 'Primary conference room entrance', deviceId: 'CONF-MAIN-001' },
          { name: 'AV Equipment Cabinet Lock', description: 'Audio/Visual equipment storage', deviceId: 'AV-CAB-001' },
          { name: 'Document Storage Lock', description: 'Meeting materials and presentations', deviceId: 'DOC-STOR-001' }
        ]
      },
      {
        name: 'Archive Rooms',
        description: 'Document storage and archival systems',
        locks: [
          { name: 'Main Archive Door Lock', description: 'Primary archive room access', deviceId: 'ARCH-MAIN-001' },
          { name: 'Document Cabinet Lock #1', description: 'Archive filing system A-M', deviceId: 'ARCH-CAB-001' },
          { name: 'Document Cabinet Lock #2', description: 'Archive filing system N-Z', deviceId: 'ARCH-CAB-002' },
          { name: 'Climate Control Panel Lock', description: 'Environmental controls for archives', deviceId: 'CLIM-001' }
        ]
      },
      {
        name: 'Equipment Room',
        description: 'General equipment and tool storage',
        locks: [
          { name: 'Main Equipment Room Lock', description: 'Primary equipment storage access', deviceId: 'EQUIP-MAIN-001' },
          { name: 'Tool Cabinet Lock #1', description: 'Professional tools and instruments', deviceId: 'TOOL-001' },
          { name: 'Tool Cabinet Lock #2', description: 'Maintenance tools and supplies', deviceId: 'TOOL-002' },
          { name: 'Spare Parts Storage Lock', description: 'Replacement parts and components', deviceId: 'SPARE-001' }
        ]
      },
      {
        name: 'Maintenance Areas',
        description: 'Building maintenance and utility access',
        locks: [
          { name: 'Utility Room Lock', description: 'Building utilities and meters', deviceId: 'UTIL-001' },
          { name: 'Cleaning Supply Lock', description: 'Janitorial supplies storage', deviceId: 'CLEAN-001' },
          { name: 'HVAC Access Lock', description: 'Heating and cooling system access', deviceId: 'HVAC-001' },
          { name: 'Electrical Panel Lock', description: 'Main electrical distribution panel', deviceId: 'ELEC-001' }
        ]
      }
    ]

    // Create locations and their locks
    const createdLocations = []
    for (const locationData of locationsData) {
      console.log(`📍 Creating location: ${locationData.name}`)
      
      const location = await prisma.location.create({
        data: {
          name: locationData.name,
          description: locationData.description,
          addressId: perfectITAddress.id
        }
      })
      
      createdLocations.push(location)

      // Create locks for this location
      for (const lockData of locationData.locks) {
        await prisma.lock.create({
          data: {
            name: lockData.name,
            description: lockData.description,
            deviceId: lockData.deviceId,
            secretKey: `secret_${lockData.deviceId.toLowerCase()}`,
            lockType: 'DOOR',
            locationId: location.id,
            isActive: true,
            isOnline: Math.random() > 0.3 // 70% chance of being online
          }
        })
        console.log(`  🔒 Created lock: ${lockData.name}`)
      }
    }

    // Create demo users with realistic roles
    const demoUsers = [
      {
        email: 'admin@perfectit.com',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        locations: createdLocations // Admin has access to all locations
      },
      {
        email: 'itmanager@perfectit.com',
        username: 'itmanager',
        firstName: 'John',
        lastName: 'Mitchell',
        role: 'SUPERVISOR',
        locations: createdLocations.filter(l => 
          l.name.includes('IT Infrastructure') || 
          l.name.includes('Equipment') || 
          l.name.includes('Maintenance')
        )
      },
      {
        email: 'officemanager@perfectit.com',
        username: 'officemanager',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'SUPERVISOR',
        locations: createdLocations.filter(l => 
          l.name.includes('Private Rooms') || 
          l.name.includes('Conference') || 
          l.name.includes('Archive')
        )
      },
      {
        email: 'technician@perfectit.com',
        username: 'technician',
        firstName: 'Mike',
        lastName: 'Rodriguez',
        role: 'USER',
        locations: createdLocations.filter(l => 
          l.name.includes('IT Infrastructure') || 
          l.name.includes('Equipment')
        )
      },
      {
        email: 'security@perfectit.com',
        username: 'security',
        firstName: 'David',
        lastName: 'Chen',
        role: 'USER',
        locations: createdLocations // Security has access to all areas
      }
    ]

    // Create users and assign permissions
    const createdUsers = []
    for (const userData of demoUsers) {
      console.log(`👤 Creating user: ${userData.firstName} ${userData.lastName}`)
      
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: hashedPassword,
          role: userData.role as UserRole,
          isActive: true
        }
      })
      
      createdUsers.push({ user, locations: userData.locations })

      // Create RFID key for user
      const cardId = `CARD-${userData.username.toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      await prisma.rFIDKey.create({
        data: {
          cardId,
          name: `${userData.firstName} ${userData.lastName}'s Access Card`,
          userId: user.id,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      })
      console.log(`  💳 Created RFID key: ${cardId}`)
    }

    // Create permissions for users
    for (const { user, locations } of createdUsers) {
      for (const location of locations) {
        // Get all locks in this location
        const locks = await prisma.lock.findMany({
          where: { locationId: location.id }
        })

        for (const lock of locks) {
          await prisma.userPermission.create({
            data: {
              userId: user.id,
              lockId: lock.id,
              canAccess: true,
              validFrom: new Date(),
              validTo: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
            }
          })
        }
      }
      console.log(`  ✅ Created permissions for ${user.firstName} ${user.lastName} (${locations.length} locations)`)
    }

    // Create some sample access logs
    console.log('📊 Creating sample access logs...')
    
    for (let i = 0; i < 50; i++) {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)]
      const randomLocation = randomUser.locations[Math.floor(Math.random() * randomUser.locations.length)]
      
      const locks = await prisma.lock.findMany({
        where: { locationId: randomLocation.id }
      })
      
      if (locks.length > 0) {
        const randomLock = locks[Math.floor(Math.random() * locks.length)]
        const userRfidKey = await prisma.rFIDKey.findFirst({
          where: { userId: randomUser.user.id, isActive: true }
        })

        if (userRfidKey) {
          const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time within last 7 days
          
          await prisma.accessLog.create({
            data: {
              accessType: 'RFID_CARD',
              result: Math.random() > 0.1 ? 'GRANTED' : 'DENIED_NO_PERMISSION', // 90% success rate
              timestamp,
              userId: randomUser.user.id,
              rfidKeyId: userRfidKey.id,
              lockId: randomLock.id,
              deviceInfo: {
                lockName: randomLock.name,
                locationName: randomLocation.name
              },
              metadata: {
                accessMethod: 'RFID',
                deviceId: randomLock.deviceId
              }
            }
          })
        }
      }
    }

    console.log('✅ Demo data creation completed!')
    console.log('\n📊 Summary:')
    console.log(`  • Address: 1 (Perfect IT Solutions)`)
    console.log(`  • Locations: ${createdLocations.length}`)
    console.log(`  • Users: ${createdUsers.length}`)
    console.log(`  • RFID Keys: ${createdUsers.length}`)
    console.log(`  • Access Logs: 50 sample entries`)
    
    // Count total locks
    const totalLocks = await prisma.lock.count()
    const totalPermissions = await prisma.userPermission.count()
    console.log(`  • Locks: ${totalLocks}`)
    console.log(`  • Permissions: ${totalPermissions}`)

  } catch (error) {
    console.error('❌ Error creating demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })