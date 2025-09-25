const { PrismaClient } = require('@prisma/client');

async function cleanupExpiredPermissions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Cleaning up expired permissions...');
    
    const now = new Date();
    console.log(`⏰ Current time: ${now.toISOString()}`);
    
    // Find all expired permissions
    const expiredPermissions = await prisma.userPermission.findMany({
      where: {
        validTo: {
          lt: now  // Less than current time = expired
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        },
        lock: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📋 Found ${expiredPermissions.length} expired permissions`);
    
    if (expiredPermissions.length === 0) {
      console.log('✅ No expired permissions to clean up');
      return;
    }
    
    // Show expired permissions before deletion
    console.log('\n📝 Expired permissions:');
    expiredPermissions.forEach((perm, idx) => {
      console.log(`  ${idx + 1}. User: ${perm.user.email} | Lock: ${perm.lock.name} | Expired: ${perm.validTo}`);
    });
    
    // Delete expired permissions
    const deleteResult = await prisma.userPermission.deleteMany({
      where: {
        validTo: {
          lt: now
        }
      }
    });
    
    console.log(`\n✅ Deleted ${deleteResult.count} expired permissions`);
    
    // Show remaining active permissions count
    const remainingPermissions = await prisma.userPermission.count({
      where: {
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      }
    });
    
    console.log(`📊 Remaining active permissions: ${remainingPermissions}`);
    
  } catch (error) {
    console.error('❌ Error cleaning up permissions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Add option to run as a scheduled job
if (require.main === module) {
  cleanupExpiredPermissions();
}

module.exports = { cleanupExpiredPermissions };