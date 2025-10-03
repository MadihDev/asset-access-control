import prisma from './src/lib/prisma'

async function createMinimalDemo() {
  try {
    console.log('🏗️ Creating minimal multi-tenant demo data...\n')
    
    // Step 1: Create Projects
    console.log('1️⃣ Creating projects...')
    const perfectIT = await prisma.project.upsert({
      where: { slug: 'perfect-it' },
      update: {},
      create: {
        name: 'Perfect IT Solutions',
        slug: 'perfect-it'
      }
    })
    console.log(`✅ Project: ${perfectIT.name} (${perfectIT.slug})`)
    
    const acmeCorp = await prisma.project.upsert({
      where: { slug: 'acme-corp' },
      update: {},
      create: {
        name: 'ACME Corporation',
        slug: 'acme-corp'
      }
    })
    console.log(`✅ Project: ${acmeCorp.name} (${acmeCorp.slug})`)
    
    const techStartup = await prisma.project.upsert({
      where: { slug: 'tech-startup' },
      update: {},
      create: {
        name: 'Tech Startup Inc',
        slug: 'tech-startup'
      }
    })
    console.log(`✅ Project: ${techStartup.name} (${techStartup.slug})\n`)
    
    // Step 2: Create Cities
    console.log('2️⃣ Creating cities...')
    const amsterdam = await prisma.city.upsert({
      where: { name: 'Amsterdam' },
      update: {},
      create: {
        name: 'Amsterdam',
        country: 'Netherlands'
      }
    })
    console.log(`✅ City: ${amsterdam.name}, ${amsterdam.country}`)
    
    const rotterdam = await prisma.city.upsert({
      where: { name: 'Rotterdam' },
      update: {},
      create: {
        name: 'Rotterdam',
        country: 'Netherlands'
      }
    })
    console.log(`✅ City: ${rotterdam.name}, ${rotterdam.country}`)
    
    const utrecht = await prisma.city.upsert({
      where: { name: 'Utrecht' },
      update: {},
      create: {
        name: 'Utrecht',
        country: 'Netherlands'
      }
    })
    console.log(`✅ City: ${utrecht.name}, ${utrecht.country}`)
    
    const nyc = await prisma.city.upsert({
      where: { name: 'New York' },
      update: {},
      create: {
        name: 'New York',
        country: 'United States'
      }
    })
    console.log(`✅ City: ${nyc.name}, ${nyc.country}\n`)
    
    // Step 3: Create ProjectCity combinations
    console.log('3️⃣ Creating project-city combinations...')
    
    // Perfect IT in Amsterdam and Rotterdam
    const perfectAmsterdam = await prisma.projectCity.upsert({
      where: { 
        projectId_cityId: { 
          projectId: perfectIT.id, 
          cityId: amsterdam.id 
        } 
      },
      update: {},
      create: {
        projectId: perfectIT.id,
        cityId: amsterdam.id
      }
    })
    console.log(`✅ ${perfectIT.name} ↔ ${amsterdam.name}`)
    
    const perfectRotterdam = await prisma.projectCity.upsert({
      where: { 
        projectId_cityId: { 
          projectId: perfectIT.id, 
          cityId: rotterdam.id 
        } 
      },
      update: {},
      create: {
        projectId: perfectIT.id,
        cityId: rotterdam.id
      }
    })
    console.log(`✅ ${perfectIT.name} ↔ ${rotterdam.name}`)
    
    // ACME in Amsterdam and New York
    const acmeAmsterdam = await prisma.projectCity.upsert({
      where: { 
        projectId_cityId: { 
          projectId: acmeCorp.id, 
          cityId: amsterdam.id 
        } 
      },
      update: {},
      create: {
        projectId: acmeCorp.id,
        cityId: amsterdam.id
      }
    })
    console.log(`✅ ${acmeCorp.name} ↔ ${amsterdam.name}`)
    
    const acmeNYC = await prisma.projectCity.upsert({
      where: { 
        projectId_cityId: { 
          projectId: acmeCorp.id, 
          cityId: nyc.id 
        } 
      },
      update: {},
      create: {
        projectId: acmeCorp.id,
        cityId: nyc.id
      }
    })
    console.log(`✅ ${acmeCorp.name} ↔ ${nyc.name}`)
    
    // Tech Startup in Utrecht only
    const techUtrecht = await prisma.projectCity.upsert({
      where: { 
        projectId_cityId: { 
          projectId: techStartup.id, 
          cityId: utrecht.id 
        } 
      },
      update: {},
      create: {
        projectId: techStartup.id,
        cityId: utrecht.id
      }
    })
    console.log(`✅ ${techStartup.name} ↔ ${utrecht.name}\n`)
    
    // Step 4: Summary
    console.log('📊 Demo data summary:')
    const projects = await prisma.project.count()
    const cities = await prisma.city.count()
    const projectCities = await prisma.projectCity.count()
    
    console.log(`✅ Projects: ${projects}`)
    console.log(`✅ Cities: ${cities}`)
    console.log(`✅ Project-City combinations: ${projectCities}`)
    console.log(`\n🎉 Multi-tenant demo data created successfully!`)
    
  } catch (error) {
    console.error('❌ Error creating demo data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMinimalDemo()