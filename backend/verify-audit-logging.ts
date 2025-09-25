import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyAuditLogging() {
  console.log('🔍 Verifying audit logging for permission and RFID operations...\n')
  
  try {
    // Check recent audit logs for permission operations
    const permissionLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['PERMISSION_GRANT', 'PERMISSION_REVOKE']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    })

    console.log('📋 Recent Permission Audit Logs:')
    console.log('=================================')
    if (permissionLogs.length === 0) {
      console.log('⚠️  No permission audit logs found. This might indicate:')
      console.log('   - No permission operations have been performed yet')
      console.log('   - Audit logging is not working properly')
    } else {
      permissionLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.action} - ${new Date(log.timestamp).toLocaleString()}`)
        console.log(`   User: ${log.user?.firstName} ${log.user?.lastName} (@${log.user?.username})`)
        console.log(`   Entity: ${log.entityType} (${log.entityId})`)
        console.log(`   IP: ${log.ipAddress || 'N/A'}`)
        if (log.newValues) {
          console.log(`   New Values: ${JSON.stringify(log.newValues, null, 2)}`)
        }
      })
    }

    // Check recent audit logs for RFID operations
    const rfidLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'RFIDKey',
        action: {
          in: ['CREATE', 'UPDATE', 'DELETE']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    })

    console.log('\n\n🏷️  Recent RFID Audit Logs:')
    console.log('===========================')
    if (rfidLogs.length === 0) {
      console.log('⚠️  No RFID audit logs found. This might indicate:')
      console.log('   - No RFID operations have been performed yet')
      console.log('   - Audit logging is not working properly')
    } else {
      rfidLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.action} - ${new Date(log.timestamp).toLocaleString()}`)
        console.log(`   User: ${log.user?.firstName} ${log.user?.lastName} (@${log.user?.username})`)
        console.log(`   Entity: ${log.entityType} (${log.entityId})`)
        console.log(`   IP: ${log.ipAddress || 'N/A'}`)
        if (log.newValues) {
          console.log(`   New Values: ${JSON.stringify(log.newValues, null, 2)}`)
        }
      })
    }

    // Check user creation audit logs
    const userLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'User',
        action: 'CREATE'
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    })

    console.log('\n\n👤 Recent User Creation Audit Logs:')
    console.log('===================================')
    if (userLogs.length === 0) {
      console.log('⚠️  No user creation audit logs found.')
    } else {
      userLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.action} - ${new Date(log.timestamp).toLocaleString()}`)
        console.log(`   Created by: ${log.user?.firstName} ${log.user?.lastName} (@${log.user?.username})`)
        console.log(`   Entity: ${log.entityType} (${log.entityId})`)
      })
    }

    // Summary statistics
    const totalAuditLogs = await prisma.auditLog.count()
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentAuditLogs = await prisma.auditLog.count({
      where: {
        timestamp: { gte: last24Hours }
      }
    })

    console.log('\n\n📊 Audit Logging Summary:')
    console.log('=========================')
    console.log(`Total audit logs: ${totalAuditLogs}`)
    console.log(`Recent (last 24h): ${recentAuditLogs}`)
    
    if (totalAuditLogs > 0) {
      console.log('\n✅ Audit logging system is functioning and has recorded operations.')
    } else {
      console.log('\n⚠️  No audit logs found. Consider performing some operations to test audit logging.')
    }

    // Test different action types
    const actionCounts = await Promise.all([
      prisma.auditLog.count({ where: { action: 'CREATE' } }),
      prisma.auditLog.count({ where: { action: 'UPDATE' } }),
      prisma.auditLog.count({ where: { action: 'DELETE' } }),
      prisma.auditLog.count({ where: { action: 'PERMISSION_GRANT' } }),
      prisma.auditLog.count({ where: { action: 'PERMISSION_REVOKE' } }),
      prisma.auditLog.count({ where: { action: 'LOGIN' } }),
      prisma.auditLog.count({ where: { action: 'LOGOUT' } })
    ])

    console.log('\n📈 Audit Log Actions Breakdown:')
    console.log('===============================')
    console.log(`CREATE: ${actionCounts[0]}`)
    console.log(`UPDATE: ${actionCounts[1]}`)
    console.log(`DELETE: ${actionCounts[2]}`)
    console.log(`PERMISSION_GRANT: ${actionCounts[3]}`)
    console.log(`PERMISSION_REVOKE: ${actionCounts[4]}`)
    console.log(`LOGIN: ${actionCounts[5]}`)
    console.log(`LOGOUT: ${actionCounts[6]}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyAuditLogging()