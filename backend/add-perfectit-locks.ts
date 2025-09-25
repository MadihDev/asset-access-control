import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateSecretKey(): string {
  return randomBytes(32).toString('hex')
}

async function addPerfectITLocks() {
  console.log('🔐 Adding locks for PerfectIT Solutions...\n')
  
  try {
    // Get PerfectIT project
    const perfectIT = await prisma.project.findUnique({
      where: { slug: 'perfectit-solutions' }
    })
    
    if (!perfectIT) {
      console.error('❌ PerfectIT Solutions project not found.')
      return
    }
    
    // Get Amsterdam city
    const amsterdam = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    })
    
    if (!amsterdam) {
      console.error('❌ Amsterdam city not found.')
      return
    }
    
    // Get PerfectIT-Amsterdam project-city relationship
    const perfectIT_Amsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectIT.id,
        cityId: amsterdam.id
      }
    })
    
    if (!perfectIT_Amsterdam) {
      console.error('❌ PerfectIT-Amsterdam relationship not found.')
      return
    }
    
    // Get or create addresses for the locks
    const addresses = []
    
    // Address 1: Main Office
    const mainOffice = await prisma.address.upsert({
      where: {
        street_number_zipCode_cityId: {
          street: 'Damrak',
          number: '100',
          zipCode: '1012LM',
          cityId: amsterdam.id
        }
      },
      create: {
        street: 'Damrak',
        number: '100',
        zipCode: '1012LM',
        cityId: amsterdam.id,
        projectCityId: perfectIT_Amsterdam.id,
        isActive: true
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    addresses.push(mainOffice)
    
    // Address 2: Data Center
    const dataCenter = await prisma.address.upsert({
      where: {
        street_number_zipCode_cityId: {
          street: 'Zuidas',
          number: '42',
          zipCode: '1077XX',
          cityId: amsterdam.id
        }
      },
      create: {
        street: 'Zuidas',
        number: '42',
        zipCode: '1077XX',
        cityId: amsterdam.id,
        projectCityId: perfectIT_Amsterdam.id,
        isActive: true
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    addresses.push(dataCenter)
    
    // Address 3: Warehouse
    const warehouse = await prisma.address.upsert({
      where: {
        street_number_zipCode_cityId: {
          street: 'Industrieweg',
          number: '25',
          zipCode: '1043DT',
          cityId: amsterdam.id
        }
      },
      create: {
        street: 'Industrieweg',
        number: '25',
        zipCode: '1043DT',
        cityId: amsterdam.id,
        projectCityId: perfectIT_Amsterdam.id,
        isActive: true
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    addresses.push(warehouse)
    
    console.log('✅ Created/updated addresses')
    
    // Lock 1: Main Office Entrance
    const lock1 = await prisma.lock.upsert({
      where: { deviceId: 'PERFECTIT-MAIN-001' },
      create: {
        name: 'Main Office - Front Entrance',
        description: 'Primary entrance to PerfectIT main office building',
        deviceId: 'PERFECTIT-MAIN-001',
        secretKey: generateSecretKey(),
        lockType: 'DOOR',
        isActive: true,
        isOnline: true,
        lastSeen: new Date(),
        addressId: mainOffice.id,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        isOnline: true,
        lastSeen: new Date(),
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    console.log(`✅ Created lock: ${lock1.name} (${lock1.deviceId})`)
    
    // Lock 2: Data Center Server Room
    const lock2 = await prisma.lock.upsert({
      where: { deviceId: 'PERFECTIT-DC-001' },
      create: {
        name: 'Data Center - Server Room',
        description: 'High-security server room access in PerfectIT data center',
        deviceId: 'PERFECTIT-DC-001',
        secretKey: generateSecretKey(),
        lockType: 'ROOM',
        isActive: true,
        isOnline: true,
        lastSeen: new Date(),
        addressId: dataCenter.id,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        isOnline: true,
        lastSeen: new Date(),
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    console.log(`✅ Created lock: ${lock2.name} (${lock2.deviceId})`)
    
    // Lock 3: Warehouse Security Gate
    const lock3 = await prisma.lock.upsert({
      where: { deviceId: 'PERFECTIT-WH-001' },
      create: {
        name: 'Warehouse - Security Gate',
        description: 'Main security gate for PerfectIT warehouse facility',
        deviceId: 'PERFECTIT-WH-001',
        secretKey: generateSecretKey(),
        lockType: 'GATE',
        isActive: true,
        isOnline: true,
        lastSeen: new Date(),
        addressId: warehouse.id,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        isOnline: true,
        lastSeen: new Date(),
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    console.log(`✅ Created lock: ${lock3.name} (${lock3.deviceId})`)
    
    console.log('\n🔑 Creating user permissions for admin users...\n')
    
    // Get PerfectIT admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        projectCityId: perfectIT_Amsterdam.id,
        role: 'ADMIN'
      }
    })
    
    // Give admin users access to all locks
    for (const user of adminUsers) {
      // Permission for Lock 1
      await prisma.userPermission.upsert({
        where: {
          userId_lockId: {
            userId: user.id,
            lockId: lock1.id
          }
        },
        create: {
          userId: user.id,
          lockId: lock1.id,
          canAccess: true,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          projectCityId: perfectIT_Amsterdam.id
        },
        update: {
          canAccess: true,
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      })
      
      // Permission for Lock 2
      await prisma.userPermission.upsert({
        where: {
          userId_lockId: {
            userId: user.id,
            lockId: lock2.id
          }
        },
        create: {
          userId: user.id,
          lockId: lock2.id,
          canAccess: true,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          projectCityId: perfectIT_Amsterdam.id
        },
        update: {
          canAccess: true,
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      })
      
      // Permission for Lock 3
      await prisma.userPermission.upsert({
        where: {
          userId_lockId: {
            userId: user.id,
            lockId: lock3.id
          }
        },
        create: {
          userId: user.id,
          lockId: lock3.id,
          canAccess: true,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          projectCityId: perfectIT_Amsterdam.id
        },
        update: {
          canAccess: true,
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      })
      
      console.log(`✅ Granted permissions to ${user.firstName} ${user.lastName} for all locks`)
    }
    
    console.log('\n🎉 Successfully added PerfectIT locks and permissions!')
    console.log('\n📋 Lock Summary:')
    console.log('┌─────────────────────────────────┬─────────────────────┬─────────────┬──────────────────────┐')
    console.log('│ Lock Name                       │ Device ID           │ Type        │ Location             │')
    console.log('├─────────────────────────────────┼─────────────────────┼─────────────┼──────────────────────┤')
    console.log(`│ Main Office - Front Entrance    │ PERFECTIT-MAIN-001  │ DOOR        │ Damrak 100          │`)
    console.log(`│ Data Center - Server Room       │ PERFECTIT-DC-001    │ ROOM        │ Zuidas 42           │`)
    console.log(`│ Warehouse - Security Gate       │ PERFECTIT-WH-001    │ GATE        │ Industrieweg 25     │`)
    console.log('└─────────────────────────────────┴─────────────────────┴─────────────┴──────────────────────┘')
    console.log('\n🔐 All locks are online and active')
    console.log('🔑 Admin users have been granted access to all locks')
    console.log('🏢 All locks are assigned to PerfectIT Solutions in Amsterdam')
    console.log('📅 Permissions expire in 1 year')
    
  } catch (error) {
    console.error('❌ Error adding locks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addPerfectITLocks()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })