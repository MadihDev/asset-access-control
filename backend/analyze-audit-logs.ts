import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeAuditLogs() {
  console.log('📋 AUDIT LOG ANALYSIS FOR LAYER 4 FAILURE');
  console.log('===============================================');
  
  try {
    // Get all distinct action types
    const actionTypes = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action']
    });
    
    console.log('🔍 Current Action Types in Database:');
    actionTypes.forEach(log => console.log(`   - ${log.action}`));
    
    // Get recent logs with details
    const recentLogs = await prisma.auditLog.findMany({
      take: 15,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { username: true, email: true } }
      }
    });
    
    console.log('\n📅 Recent Audit Logs (Last 15):');
    recentLogs.forEach(log => {
      console.log(`   ${log.timestamp.toISOString()} | ${log.action} | User: ${log.user?.username || 'N/A'} | Entity: ${log.entityType}/${log.entityId}`);
    });
    
    // Check coverage in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActionTypes = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: sevenDaysAgo
        }
      },
      select: { action: true },
      distinct: ['action']
    });
    
    console.log('\n📊 Action Types in Last 7 Days:');
    recentActionTypes.forEach(log => console.log(`   - ${log.action}`));
    
    // Available and expected action types based on AuditAction enum
    console.log('\n🎯 Available vs Used Action Types:');
    const availableActions: AuditAction[] = [
      AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE, 
      AuditAction.LOGIN, AuditAction.LOGOUT, 
      AuditAction.PERMISSION_GRANT, AuditAction.PERMISSION_REVOKE, 
      AuditAction.ACCESS_ATTEMPT
    ];
    
    const currentActions = actionTypes.map(log => log.action);
    
    availableActions.forEach(action => {
      const exists = currentActions.includes(action);
      console.log(`   ${exists ? '✅' : '❌'} ${action}`);
    });
    
    // Calculate coverage
    const coverage = (recentActionTypes.length / availableActions.length) * 100;
    console.log(`\n📈 Current Audit Coverage: ${coverage.toFixed(1)}% (${recentActionTypes.length}/${availableActions.length} action types in last 7 days)`);
    
    // Identify missing critical actions
    const missingActions = availableActions.filter(action => !currentActions.includes(action));
    console.log('\n🚨 Missing Critical Action Types:');
    missingActions.forEach(action => console.log(`   - ${action}`));
    
    // Check which services need audit logging enhancement
    console.log('\n🔧 Services That Need Audit Logging Enhancement:');
    const serviceNeeds = {
      'AuthService': [AuditAction.LOGOUT],
      'UserService': [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
      'LocationService': [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
      'LockService': [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
      'AccessService': [AuditAction.ACCESS_ATTEMPT],
      'PermissionService': [AuditAction.PERMISSION_GRANT, AuditAction.PERMISSION_REVOKE]
    };
    
    Object.entries(serviceNeeds).forEach(([service, actions]) => {
      const missing = actions.filter(action => !currentActions.includes(action));
      if (missing.length > 0) {
        console.log(`   ${service}: ${missing.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error analyzing audit logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAuditLogs().catch(console.error);