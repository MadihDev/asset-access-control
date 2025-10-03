// setup-2fa.ts
// Script to set up 2FA for your multi-tenant access control system

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

interface Setup2FAOptions {
  enableGlobally?: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  testMode?: boolean;
}

class Setup2FA {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async setup() {
    console.log('🔐 2FA SETUP WIZARD');
    console.log('==================\n');

    try {
      // Check current 2FA status
      await this.checkCurrentStatus();

      // Get setup preferences
      const options = await this.getSetupOptions();

      // Create notification templates
      await this.createNotificationTemplates();

      // Configure users for 2FA
      if (options.enableGlobally) {
        await this.enableGloballyForUsers();
      } else {
        await this.selectiveUserSetup();
      }

      // Generate environment configuration
      await this.generateEnvConfig(options);

      console.log('\n✅ 2FA Setup Complete!');
      console.log('\n📋 Next Steps:');
      console.log('1. Update your .env file with the generated configuration');
      console.log('2. Restart your backend server');
      console.log('3. Test 2FA with a user account');
      console.log('4. Monitor SMS delivery in production\n');

    } catch (error) {
      console.error('❌ Setup failed:', error);
    } finally {
      this.rl.close();
      await prisma.$disconnect();
    }
  }

  async checkCurrentStatus() {
    console.log('🔍 Checking current 2FA status...\n');

    // Check users with 2FA enabled
    const users2FA = await prisma.user.findMany({
      where: { twoFactorEnabled: true },
      select: {
        username: true,
        phone: true,
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true
      }
    });

    // Check notification templates
    const templates = await prisma.notificationTemplate.findMany({
      where: { type: 'SMS' }
    });

    console.log(`📊 Current Status:`);
    console.log(`   - Users with 2FA: ${users2FA.length}`);
    console.log(`   - SMS Templates: ${templates.length}`);
    
    if (users2FA.length > 0) {
      console.log('\n👥 Users with 2FA enabled:');
      users2FA.forEach(user => {
        const phoneStatus = user.phone ? '📱' : '❌';
        const verifiedStatus = user.twoFactorVerifiedAt ? '✅' : '⏳';
        console.log(`   ${phoneStatus} ${verifiedStatus} ${user.username} (${user.phone || 'No phone'})`);
      });
    }
    console.log('');
  }

  async getSetupOptions(): Promise<Setup2FAOptions> {
    const options: Setup2FAOptions = {};

    // Test mode or production?
    const testMode = await this.askQuestion('Use test mode (mock SMS)? (y/n): ');
    options.testMode = testMode.toLowerCase() === 'y';

    if (!options.testMode) {
      console.log('\n📞 Twilio Configuration (for production SMS):');
      options.twilioAccountSid = await this.askQuestion('Twilio Account SID: ');
      options.twilioAuthToken = await this.askQuestion('Twilio Auth Token: ');
      options.twilioFromNumber = await this.askQuestion('Twilio Phone Number (e.g., +1234567890): ');
    }

    // Global or selective enablement?
    const global = await this.askQuestion('\nEnable 2FA for all existing users? (y/n): ');
    options.enableGlobally = global.toLowerCase() === 'y';

    return options;
  }

  async createNotificationTemplates() {
    console.log('📝 Creating notification templates...');

    // 2FA verification code template
    await prisma.notificationTemplate.upsert({
      where: { name: '2FA_VERIFICATION_CODE' },
      create: {
        name: '2FA_VERIFICATION_CODE',
        type: 'SMS',
        subject: null,
        body: 'Your {{appName}} verification code is: {{code}}. This code expires in {{expiryMinutes}} minutes.',
        isActive: true
      },
      update: {
        body: 'Your {{appName}} verification code is: {{code}}. This code expires in {{expiryMinutes}} minutes.',
        isActive: true
      }
    });

    // Unauthorized access alert template
    await prisma.notificationTemplate.upsert({
      where: { name: 'UNAUTHORIZED_ACCESS_SMS' },
      create: {
        name: 'UNAUTHORIZED_ACCESS_SMS',
        type: 'SMS',
        subject: null,
        body: 'SECURITY ALERT: {{userName}} attempted unauthorized access to {{lockName}} at {{timestamp}}.',
        isActive: true
      },
      update: {
        body: 'SECURITY ALERT: {{userName}} attempted unauthorized access to {{lockName}} at {{timestamp}}.',
        isActive: true
      }
    });

    console.log('✅ Notification templates created');
  }

  async enableGloballyForUsers() {
    console.log('🌐 Enabling 2FA for all users...');

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, phone: true }
    });

    for (const user of users) {
      let phone = user.phone;
      
      if (!phone) {
        console.log(`\n📱 User ${user.username} has no phone number.`);
        phone = await this.askQuestion(`Enter phone number for ${user.username} (+1234567890 format): `);
        
        if (!this.isValidPhoneNumber(phone)) {
          console.log(`⚠️  Invalid phone format for ${user.username}, skipping...`);
          continue;
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          phone: phone,
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date() // Assume phone is verified for setup
        }
      });

      console.log(`✅ 2FA enabled for ${user.username}`);
    }
  }

  async selectiveUserSetup() {
    console.log('👤 Selective 2FA setup...');

    const users = await prisma.user.findMany({
      where: { 
        isActive: true,
        twoFactorEnabled: false 
      },
      select: { id: true, username: true, phone: true, role: true }
    });

    if (users.length === 0) {
      console.log('No users available for 2FA setup');
      return;
    }

    console.log('\n📋 Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.role}) - ${user.phone || 'No phone'}`);
    });

    const selections = await this.askQuestion('\nEnter user numbers to enable 2FA (comma-separated, e.g., 1,3,5): ');
    const selectedIndices = selections.split(',').map(s => parseInt(s.trim()) - 1);

    for (const index of selectedIndices) {
      if (index >= 0 && index < users.length) {
        const user = users[index];
        let phone = user.phone;

        if (!phone) {
          phone = await this.askQuestion(`Enter phone number for ${user.username} (+1234567890 format): `);
          
          if (!this.isValidPhoneNumber(phone)) {
            console.log(`⚠️  Invalid phone format for ${user.username}, skipping...`);
            continue;
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            phone: phone,
            twoFactorEnabled: true,
            twoFactorVerifiedAt: new Date()
          }
        });

        console.log(`✅ 2FA enabled for ${user.username}`);
      }
    }
  }

  async generateEnvConfig(options: Setup2FAOptions) {
    console.log('\n🔧 Generating environment configuration...\n');

    const envConfig = [
      '# 2FA Configuration',
      'TWOFA_ENABLED=true',
      'TWOFA_CODE_TTL_SEC=300',
      'TWOFA_MAX_ATTEMPTS=5',
      'TWOFA_RESEND_COOLDOWN_SEC=30',
      '',
      '# SMS Notifications',
      'ENABLE_SMS_NOTIFICATIONS=true'
    ];

    if (options.testMode) {
      envConfig.push('NOTIFICATION_PROVIDER=mock');
    } else {
      envConfig.push(
        'NOTIFICATION_PROVIDER=twilio',
        '',
        '# Twilio Configuration',
        `TWILIO_ACCOUNT_SID=${options.twilioAccountSid}`,
        `TWILIO_AUTH_TOKEN=${options.twilioAuthToken}`,
        `TWILIO_FROM_NUMBER=${options.twilioFromNumber}`
      );
    }

    console.log('📄 Add these lines to your .env file:');
    console.log(''.padStart(50, '='));
    console.log(envConfig.join('\n'));
    console.log(''.padStart(50, '='));
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 validation
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }
}

// Main execution
async function main() {
  const setup = new Setup2FA();
  await setup.setup();
}

// Export for use in other scripts
export { Setup2FA };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}