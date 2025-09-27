import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function completeRotterdamDemo() {
  console.log('🔧 Completing PerfectIT Solutions Rotterdam Demo Data...\n')
  
  try {
    // Find Rotterdam project-city
    const perfectIT_Rotterdam = await prisma.projectCity.findFirst({
      where: {
        project: { slug: 'perfectit-solutions' },
        city: { name: 'Rotterdam' }
      },
      include: {
        project: true,
        city: true
      }
    })

    if (!perfectIT_Rotterdam) {
      throw new Error('Rotterdam project-city not found')
    }

    console.log(`✅ Found: ${perfectIT_Rotterdam.project.name} - ${perfectIT_Rotterdam.city.name}`)

    // Get existing addresses
    const addresses = await prisma.address.findMany({
      where: { projectCityId: perfectIT_Rotterdam.id },
      include: { city: true }
    })

    console.log(`✅ Found ${addresses.length} existing addresses`)

    // Check if locations already exist
    const existingLocations = await prisma.location.count({
      where: { projectCityId: perfectIT_Rotterdam.id }
    })

    if (existingLocations > 0) {
      console.log(`✅ Found ${existingLocations} existing locations - data already complete!`)
      
      // Just show summary
      const users = await prisma.user.count({ where: { projectCityId: perfectIT_Rotterdam.id } })
      const locks = await prisma.lock.count({ where: { projectCityId: perfectIT_Rotterdam.id } })
      const rfidKeys = await prisma.rFIDKey.count({ where: { projectCityId: perfectIT_Rotterdam.id } })
      
      console.log('\n📊 Current Rotterdam Data:')
      console.log(`   👥 Users: ${users}`)
      console.log(`   🏠 Addresses: ${addresses.length}`)
      console.log(`   📍 Locations: ${existingLocations}`)
      console.log(`   🔒 Locks: ${locks}`)
      console.log(`   🎫 RFID Keys: ${rfidKeys}`)
      
      console.log('\n🔑 Login Credentials:')
      console.log('   Username: rotterdamadmin')
      console.log('   Password: Password123!')
      
      return
    }

    // Create locations for existing addresses
    const locationTemplates = {
      'Erasmusbrug Plaza': [
        { name: 'Executive Boardroom', description: 'Main boardroom with bridge view' },
        { name: 'Innovation Lab', description: 'Technology development workspace' },
        { name: 'Reception Lobby', description: 'Main entrance and reception area' },
        { name: 'CEO Suite', description: 'Executive office with panoramic view' },
        { name: 'Data Center', description: 'Primary server and network hub' },
      ],
      'Markthal Boulevard': [
        { name: 'Client Meeting Center', description: 'Modern client presentation space' },
        { name: 'Creative Studio', description: 'Design and creative team workspace' },
        { name: 'Collaboration Hub', description: 'Open collaborative working area' },
        { name: 'Training Academy', description: 'Professional development center' },
      ],
      'Euromast Tower': [
        { name: 'Sky Conference Room', description: 'High-altitude meeting space' },
        { name: 'Observation Deck Office', description: 'Premium office with city view' },
        { name: 'Executive Lounge', description: 'VIP client entertainment area' },
        { name: 'Strategic Planning Room', description: 'Private strategy sessions' },
      ],
      'Oude Haven': [
        { name: 'Harbor Operations Center', description: 'Maritime logistics coordination' },
        { name: 'Historic Vault', description: 'Secure document storage' },
        { name: 'Waterfront Café', description: 'Employee relaxation area' },
        { name: 'Maritime Museum Display', description: 'Company history showcase' },
      ]
    }

    let totalLocations = 0
    let totalLocks = 0

    for (const address of addresses) {
      let locationKey = ''
      if (address.street.includes('Erasmusbrug')) locationKey = 'Erasmusbrug Plaza'
      else if (address.street.includes('Markthal')) locationKey = 'Markthal Boulevard'
      else if (address.street.includes('Euromast')) locationKey = 'Euromast Tower'
      else if (address.street.includes('Oude Haven')) locationKey = 'Oude Haven'

      const locations = locationTemplates[locationKey as keyof typeof locationTemplates] || []
      
      for (const locationData of locations) {
        const location = await prisma.location.create({
          data: {
            name: locationData.name,
            description: locationData.description,
            addressId: address.id,
            projectCityId: perfectIT_Rotterdam.id,
            isActive: true
          }
        })
        console.log(`  📍 ${location.name}`)
        totalLocations++

        // Create 2-4 locks per location
        const lockTypes = [
          { name: 'Smart Door Lock', description: 'Biometric access control' },
          { name: 'Security Cabinet', description: 'Encrypted storage unit' },
          { name: 'Equipment Vault', description: 'High-security equipment storage' },
          { name: 'Emergency Access', description: 'Emergency override system' }
        ]

        const numLocks = Math.floor(Math.random() * 3) + 2 // 2-4 locks
        for (let i = 0; i < numLocks; i++) {
          const lockType = lockTypes[i % lockTypes.length]
          const lock = await prisma.lock.create({
            data: {
              name: `${lockType.name} - ${location.name}`,
              description: lockType.description,
              deviceId: `ROT${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
              secretKey: Math.random().toString(36).substr(2, 16),
              locationId: location.id,
              projectCityId: perfectIT_Rotterdam.id,
              isActive: true,
              isOnline: Math.random() > 0.2, // 80% online
              lastSeen: new Date()
            }
          })
          console.log(`    🔒 ${lock.name}`)
          totalLocks++
        }
      }
    }

    // Create RFID keys for existing users
    const users = await prisma.user.findMany({
      where: { projectCityId: perfectIT_Rotterdam.id }
    })

    let totalRfidKeys = 0
    for (const user of users) {
      const cardId = `ROT${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      const rfidKey = await prisma.rFIDKey.create({
        data: {
          cardId: cardId,
          name: `${user.firstName}'s Access Card`,
          userId: user.id,
          projectCityId: perfectIT_Rotterdam.id,
          isActive: true
        }
      })
      console.log(`🎫 RFID Key: ${rfidKey.cardId} → ${user.firstName} ${user.lastName}`)
      totalRfidKeys++
    }

    console.log('\n🎉 Rotterdam demo data completed successfully!')
    console.log('\n📊 Final Summary:')
    console.log(`   👥 Users: ${users.length}`)
    console.log(`   🏠 Addresses: ${addresses.length}`)
    console.log(`   📍 Locations: ${totalLocations}`)
    console.log(`   🔒 Locks: ${totalLocks}`)
    console.log(`   🎫 RFID Keys: ${totalRfidKeys}`)

    console.log('\n🔑 Login Credentials:')
    console.log('   Username: rotterdamadmin')
    console.log('   Password: Password123!')
    console.log('   Email: rotterdam.admin@perfectitsolutions.com')

    console.log('\n🌟 Features:')
    console.log('   ✅ Modern Dutch locations (Erasmusbrug, Markthal, Euromast)')
    console.log('   ✅ Smart locks with biometric access')
    console.log('   ✅ Alphanumeric-only usernames')
    console.log('   ✅ Multi-tenant isolation from Amsterdam')
    console.log('   ✅ RFID key assignments')

  } catch (error) {
    console.error('❌ Error completing Rotterdam demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

completeRotterdamDemo()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })