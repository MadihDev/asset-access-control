import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function testAuditLogginBatch() {
  console.log('🧪 TESTING AUDIT LOGGING IMPROVEMENTS');
  console.log('===============================================');
  
  try {
    // Simulate various audit actions to test coverage
    console.log('🔧 Creating simulated audit entries...');
    
    // Get some existing user and check for locks
    const user = await prisma.user.findFirst();
    const lock = await prisma.lock.findFirst();
    
    console.log(`   Users found: ${user ? 1 : 0}`);
    console.log(`   Locks found: ${lock ? 1 : 0}`);
    
    if (!user) {
      console.log('❌ No user data found. Run setup-demo-data.ts first.');
      return;
    }
    
    // If no locks, create a simple test lock
    let testLock = lock;
    if (!testLock) {
      console.log('   Creating test lock for audit testing...');
      // Find an address or create one
      let address = await prisma.address.findFirst();
      if (!address) {
        const city = await prisma.city.findFirst();
        if (!city) {
          console.log('❌ No city data found.');
          return;
        }
        address = await prisma.address.create({
          data: {
            street: 'Test Street',
            number: '1',
            zipCode: '12345',
            cityId: city.id,
            projectCityId: user.projectCityId
          }
        });
      }
      
      // Create location if none exists
      let location = await prisma.location.findFirst();
      if (!location) {
        location = await prisma.location.create({
          data: {
            name: 'Test Location',
            description: 'Test location for audit logging',
            addressId: address.id,
            projectCityId: user.projectCityId
          }
        });
      }
      
      testLock = await prisma.lock.create({
        data: {
          name: 'Test Lock',
          description: 'Test lock for audit logging',
          deviceId: 'TEST123',
          secretKey: 'testsecret',
          locationId: location.id,
          projectCityId: user.projectCityId
        }
      });
      console.log('   ✅ Test lock created');
    }

    const testActions = [
      {
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        newValues: { username: 'test_user', email: 'test@example.com' }
      },
      {
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        oldValues: { email: 'old@example.com' },
        newValues: { email: 'new@example.com' }
      },
      {
        action: AuditAction.DELETE,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        oldValues: { username: 'deleted_user' }
      },
      {
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: user.id,
        userId: user.id
      },
      {
        action: AuditAction.PERMISSION_GRANT,
        entityType: 'UserPermission',
        entityId: 'perm-123',
        userId: user.id,
        newValues: { lockId: testLock.id, canAccess: true }
      },
      {
        action: AuditAction.PERMISSION_REVOKE,
        entityType: 'UserPermission',
        entityId: 'perm-123',
        userId: user.id,
        oldValues: { lockId: testLock.id, canAccess: true }
      },
      {
        action: AuditAction.ACCESS_ATTEMPT,
        entityType: 'Lock',
        entityId: testLock.id,
        userId: user.id,
        newValues: { result: 'GRANTED', method: 'RFID' }
      }
    ];

    // Create test audit entries
    for (const testAction of testActions) {
      await prisma.auditLog.create({
        data: testAction
      });
      console.log(`   ✅ Created ${testAction.action} audit log`);
    }

    console.log('\n📊 UPDATED AUDIT COVERAGE ANALYSIS');
    console.log('===============================================');
    
    // Get all distinct action types now
    const actionTypes = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action']
    });
    
    console.log('🔍 Current Action Types in Database:');
    actionTypes.forEach(log => console.log(`   - ${log.action}`));
    
    // Available action types
    const availableActions = [
      AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE, 
      AuditAction.LOGIN, AuditAction.LOGOUT, 
      AuditAction.PERMISSION_GRANT, AuditAction.PERMISSION_REVOKE, 
      AuditAction.ACCESS_ATTEMPT
    ];
    
    console.log('\n🎯 Coverage Status:');
    const currentActions = actionTypes.map(log => log.action);
    availableActions.forEach(action => {
      const exists = currentActions.includes(action);
      console.log(`   ${exists ? '✅' : '❌'} ${action}`);
    });
    
    const coverage = (currentActions.length / availableActions.length) * 100;
    console.log(`\n📈 New Audit Coverage: ${coverage.toFixed(1)}% (${currentActions.length}/${availableActions.length} action types)`);
    
    // Check recent logs
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { username: true } }
      }
    });
    
    console.log('\n📅 Recent Audit Logs (Last 10):');
    recentLogs.forEach(log => {
      console.log(`   ${log.timestamp.toISOString()} | ${log.action} | User: ${log.user?.username || 'N/A'} | Entity: ${log.entityType}/${log.entityId}`);
    });
    
  } catch (error) {
    console.error('Error testing audit logging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditLogginBatch().catch(console.error);