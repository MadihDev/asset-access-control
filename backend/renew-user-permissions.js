const { PrismaClient } = require('@prisma/client');

async function renewUserPermissions(userId, additionalHours = 12) {
  const prisma = new PrismaClient();
  
  try {
    console.log(`🔄 Renewing permissions for user: ${userId}`);
    console.log(`⏰ Adding ${additionalHours} hours to existing permissions`);
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;
    console.log(`👤 User: ${userName} (${user.email})`);
    
    // Find all active permissions for the user
    const now = new Date();
    const activePermissions = await prisma.userPermission.findMany({
      where: {
        userId: userId,
        canAccess: true,
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      },
      include: {
        lock: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📋 Found ${activePermissions.length} active permissions to renew`);
    
    if (activePermissions.length === 0) {
      console.log('✅ No active permissions to renew');
      return;
    }
    
    // Calculate new expiry time
    const renewalTime = new Date(now.getTime() + additionalHours * 60 * 60 * 1000);
    console.log(`📅 New expiry time: ${renewalTime.toISOString()}`);
    
    // Show current permissions
    console.log('\n📝 Current permissions:');
    activePermissions.forEach((perm, idx) => {
      const currentExpiry = perm.validTo ? new Date(perm.validTo) : 'Never';
      console.log(`  ${idx + 1}. Lock: ${perm.lock.name} | Current expiry: ${currentExpiry}`);
    });
    
    // Update all permissions to the new expiry time
    const updateResult = await prisma.userPermission.updateMany({
      where: {
        userId: userId,
        canAccess: true,
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      },
      data: {
        validTo: renewalTime
      }
    });
    
    console.log(`\n✅ Renewed ${updateResult.count} permissions`);
    console.log(`📅 All permissions now expire at: ${renewalTime.toISOString()}`);
    
    // Verify the renewal
    const renewedPermissions = await prisma.userPermission.findMany({
      where: {
        userId: userId,
        validTo: renewalTime
      },
      include: {
        lock: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('\n📋 Renewed permissions:');
    renewedPermissions.forEach((perm, idx) => {
      const hoursUntilExpiry = (renewalTime - now) / (1000 * 60 * 60);
      console.log(`  ${idx + 1}. Lock: ${perm.lock.name} | Expires in: ${hoursUntilExpiry.toFixed(1)} hours`);
    });
    
  } catch (error) {
    console.error('❌ Error renewing permissions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Allow script to be called with user ID and optional hours
if (require.main === module) {
  const userId = process.argv[2];
  const hours = process.argv[3] ? parseInt(process.argv[3]) : 12;
  
  if (!userId) {
    console.log('Usage: node renew-user-permissions.js <userId> [hours]');
    console.log('Example: node renew-user-permissions.js cmfvxyd8w0007p33sjo9nvvbv 24');
    process.exit(1);
  }
  
  renewUserPermissions(userId, hours);
}

module.exports = { renewUserPermissions };