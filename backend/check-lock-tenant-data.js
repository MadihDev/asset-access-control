const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkLockTenantData() {
  try {
    console.log('🔍 Checking Lock Tenant Data Consistency...')
    
    // Get all locks with their tenant information
    const locks = await prisma.lock.findMany({
      include: {
        address: {
          include: {
            city: true,
            projectCity: {
              include: { project: true, city: true }
            }
          }
        },
        projectCity: {
          include: { project: true, city: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    console.log('\n📋 LOCK TENANT ANALYSIS:')
    console.log('Format: Lock Name | Lock.projectCityId | Address.projectCityId | Expected Project')
    
    locks.forEach(lock => {
      const lockProjectCityId = lock.projectCityId || 'NULL'
      const addressProjectCityId = lock.address?.projectCity?.id || 'NULL'
      const lockProject = lock.projectCity?.project?.name || 'NULL'
      const addressProject = lock.address?.projectCity?.project?.name || 'NULL'
      const isConsistent = lockProjectCityId === addressProjectCityId && lockProject === addressProject
      const status = isConsistent ? '✅' : '❌'
      
      console.log(`${status} ${lock.name}`)
      console.log(`    Lock ProjectCity: ${lockProjectCityId} (${lockProject})`)
      console.log(`    Address ProjectCity: ${addressProjectCityId} (${addressProject})`)
      console.log('')
    })
    
    // Count locks by project
    const projectCounts = {}
    locks.forEach(lock => {
      const project = lock.projectCity?.project?.name || 'UNKNOWN'
      if (!projectCounts[project]) projectCounts[project] = 0
      projectCounts[project]++
    })
    
    console.log('🏢 LOCKS BY PROJECT:')
    Object.entries(projectCounts).forEach(([project, count]) => {
      console.log(`  ${project}: ${count} locks`)
    })
    
    // Check if there are locks with inconsistent projectCityIds
    const inconsistentLocks = locks.filter(lock => {
      const lockProjectCityId = lock.projectCityId
      const addressProjectCityId = lock.address?.projectCity?.id
      return lockProjectCityId !== addressProjectCityId
    })
    
    if (inconsistentLocks.length > 0) {
      console.log(`\n🔧 FIXING ${inconsistentLocks.length} INCONSISTENT LOCKS...`)
      
      for (const lock of inconsistentLocks) {
        const correctProjectCityId = lock.address?.projectCity?.id
        if (correctProjectCityId) {
          await prisma.lock.update({
            where: { id: lock.id },
            data: { projectCityId: correctProjectCityId }
          })
          console.log(`✅ Fixed lock ${lock.name}: ${lock.projectCityId} -> ${correctProjectCityId}`)
        }
      }
    }
    
    // Now let's check PerfectIT lock counts specifically
    const perfectITProject = await prisma.project.findFirst({
      where: { name: 'PerfectIT Solutions' }
    })
    const amsterdamCity = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    })
    const perfectITAmsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectITProject.id,
        cityId: amsterdamCity.id
      }
    })
    
    console.log(`\n🔍 PERFECTIT-AMSTERDAM LOCK CHECK:`)
    console.log(`ProjectCity ID: ${perfectITAmsterdam.id}`)
    
    const perfectITLocks = await prisma.lock.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: { id: true, name: true, projectCityId: true }
    })
    
    console.log(`PerfectIT-Amsterdam locks: ${perfectITLocks.length}`)
    perfectITLocks.forEach(lock => {
      console.log(`  - ${lock.name} (${lock.id})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkLockTenantData()