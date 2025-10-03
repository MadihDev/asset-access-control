#!/usr/bin/env node

/**
 * DATABASE SECURITY VALIDATION SCRIPT
 * 
 * This script validates the database security configuration
 * and checks for potential security issues.
 * 
 * Part of PRIORITY 2: DATABASE SECURITY HARDENING
 */

import { enhancedDb } from './src/config/enhancedDatabase';

interface SecurityValidationResult {
  passed: number;
  failed: number;
  warnings: number;
  details: Array<{
    test: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    recommendation?: string;
  }>;
}

class DatabaseSecurityValidator {
  private results: SecurityValidationResult = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, recommendation?: string) {
    this.results.details.push({ test, status, message, recommendation });
    
    switch (status) {
      case 'PASS': this.results.passed++; break;
      case 'FAIL': this.results.failed++; break;
      case 'WARN': this.results.warnings++; break;
    }
  }

  async validateSecurity(): Promise<void> {
    console.log('🔐 DATABASE SECURITY VALIDATION');
    console.log('================================\n');

    try {
      // Test 1: Database Connection Health
      await this.testConnectionHealth();

      // Test 2: SSL Configuration
      await this.testSSLConfiguration();

      // Test 3: Connection Security Settings
      await this.testConnectionSettings();

      // Test 4: User Privileges Assessment
      await this.testUserPrivileges();

      // Test 5: Database Configuration Security
      await this.testDatabaseConfiguration();

      // Test 6: Query Performance Monitoring
      await this.testQueryMonitoring();

    } catch (error) {
      this.addResult(
        'Global Database Test', 
        'FAIL', 
        `Critical error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check database connection and configuration'
      );
    }
  }

  private async testConnectionHealth(): Promise<void> {
    console.log('1. 🏥 Testing Database Connection Health...');
    
    try {
      const healthCheck = await enhancedDb.healthCheck();
      
      if (healthCheck) {
        this.addResult(
          'Database Connection Health',
          'PASS',
          'Database connection is healthy and responsive'
        );
      } else {
        this.addResult(
          'Database Connection Health',
          'FAIL',
          'Database health check failed',
          'Check database server status and network connectivity'
        );
      }
    } catch (error) {
      this.addResult(
        'Database Connection Health',
        'FAIL',
        `Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Verify database connection parameters'
      );
    }
  }

  private async testSSLConfiguration(): Promise<void> {
    console.log('2. 🔒 Testing SSL Configuration...');
    
    try {
      const securityStatus = await enhancedDb.getSecurityStatus();
      const connectionInfo = securityStatus.connection[0];
      
      if (process.env.NODE_ENV === 'production') {
        if (connectionInfo.ssl_enabled === 'on') {
          this.addResult(
            'SSL Configuration',
            'PASS',
            'SSL is enabled for production database connection'
          );
        } else {
          this.addResult(
            'SSL Configuration',
            'FAIL',
            'SSL is not enabled in production environment',
            'Enable SSL for production database connections'
          );
        }
      } else {
        this.addResult(
          'SSL Configuration',
          'WARN',
          `SSL status: ${connectionInfo.ssl_enabled} (Development environment)`,
          'Ensure SSL is enabled for production deployment'
        );
      }
    } catch (error) {
      this.addResult(
        'SSL Configuration',
        'WARN',
        `Could not verify SSL status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Manually verify SSL configuration'
      );
    }
  }

  private async testConnectionSettings(): Promise<void> {
    console.log('3. ⚙️ Testing Connection Security Settings...');
    
    const connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000');
    const queryTimeout = parseInt(process.env.DB_QUERY_TIMEOUT || '30000');
    const poolSize = parseInt(process.env.DB_POOL_SIZE || '10');

    // Test connection timeout
    if (connectionTimeout <= 15000) {
      this.addResult(
        'Connection Timeout',
        'PASS',
        `Connection timeout is appropriately set: ${connectionTimeout}ms`
      );
    } else {
      this.addResult(
        'Connection Timeout',
        'WARN',
        `Connection timeout is high: ${connectionTimeout}ms`,
        'Consider reducing connection timeout for better security'
      );
    }

    // Test query timeout
    if (queryTimeout <= 30000) {
      this.addResult(
        'Query Timeout',
        'PASS',
        `Query timeout is appropriately set: ${queryTimeout}ms`
      );
    } else {
      this.addResult(
        'Query Timeout',
        'WARN',
        `Query timeout is high: ${queryTimeout}ms`,
        'Consider reducing query timeout to prevent long-running queries'
      );
    }

    // Test pool size
    if (poolSize >= 5 && poolSize <= 20) {
      this.addResult(
        'Connection Pool Size',
        'PASS',
        `Connection pool size is appropriate: ${poolSize}`
      );
    } else if (poolSize < 5) {
      this.addResult(
        'Connection Pool Size',
        'WARN',
        `Connection pool size may be too small: ${poolSize}`,
        'Consider increasing pool size for better performance'
      );
    } else {
      this.addResult(
        'Connection Pool Size',
        'WARN',
        `Connection pool size may be too large: ${poolSize}`,
        'Consider reducing pool size to avoid overwhelming the database'
      );
    }
  }

  private async testUserPrivileges(): Promise<void> {
    console.log('4. 👤 Testing Database User Privileges...');
    
    try {
      const securityStatus = await enhancedDb.getSecurityStatus();
      const privileges = securityStatus.privileges;
      const connectionInfo = securityStatus.connection[0];

      // Check if we're using a dedicated application user
      const currentUser = connectionInfo.username;
      if (currentUser === 'postgres' || currentUser === 'root') {
        this.addResult(
          'Database User Privileges',
          'FAIL',
          `Using superuser account: ${currentUser}`,
          'Create dedicated application user with minimal privileges'
        );
      } else {
        this.addResult(
          'Database User Privileges',
          'PASS',
          `Using dedicated application user: ${currentUser}`
        );
      }

      // Analyze privileges
      const hasCreatePrivilege = privileges.some((p: { privilege_type: string; is_grantable: string }) => 
        p.privilege_type === 'CREATE' && p.is_grantable === 'YES'
      );
      
      if (hasCreatePrivilege) {
        this.addResult(
          'Privilege Analysis',
          'WARN',
          'User has CREATE privileges with GRANT option',
          'Review if CREATE privileges are necessary for application operation'
        );
      } else {
        this.addResult(
          'Privilege Analysis',
          'PASS',
          'User privileges appear to be restricted appropriately'
        );
      }

    } catch (error) {
      this.addResult(
        'Database User Privileges',
        'WARN',
        `Could not analyze user privileges: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Manually review database user privileges'
      );
    }
  }

  private async testDatabaseConfiguration(): Promise<void> {
    console.log('5. 🔧 Testing Database Configuration...');
    
    try {
      const securityStatus = await enhancedDb.getSecurityStatus();
      const connectionInfo = securityStatus.connection[0];

      // Check PostgreSQL version
      const version = connectionInfo.postgres_version;
      const versionMatch = version.match(/PostgreSQL (\d+)\.(\d+)/);
      
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[1]);
        const minorVersion = parseInt(versionMatch[2]);
        
        if (majorVersion >= 13) {
          this.addResult(
            'PostgreSQL Version',
            'PASS',
            `Using supported PostgreSQL version: ${majorVersion}.${minorVersion}`
          );
        } else if (majorVersion >= 11) {
          this.addResult(
            'PostgreSQL Version',
            'WARN',
            `Using older PostgreSQL version: ${majorVersion}.${minorVersion}`,
            'Consider upgrading to PostgreSQL 13+ for latest security features'
          );
        } else {
          this.addResult(
            'PostgreSQL Version',
            'FAIL',
            `Using outdated PostgreSQL version: ${majorVersion}.${minorVersion}`,
            'Upgrade to a supported PostgreSQL version immediately'
          );
        }
      }

      // Check database name
      const dbName = connectionInfo.database;
      if (dbName === 'postgres' || dbName === 'template1') {
        this.addResult(
          'Database Name',
          'WARN',
          `Using system database: ${dbName}`,
          'Use a dedicated application database'
        );
      } else {
        this.addResult(
          'Database Name',
          'PASS',
          `Using dedicated application database: ${dbName}`
        );
      }

    } catch (error) {
      this.addResult(
        'Database Configuration',
        'WARN',
        `Could not analyze database configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Manually review database configuration'
      );
    }
  }

  private async testQueryMonitoring(): Promise<void> {
    console.log('6. 📊 Testing Query Performance Monitoring...');
    
    const securityMonitoring = process.env.DB_SECURITY_MONITORING !== 'false';
    const slowQueryLogging = process.env.DB_LOG_SLOW_QUERIES !== 'false';
    const slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000');

    if (securityMonitoring) {
      this.addResult(
        'Security Monitoring',
        'PASS',
        'Database security monitoring is enabled'
      );
    } else {
      this.addResult(
        'Security Monitoring',
        'WARN',
        'Database security monitoring is disabled',
        'Enable security monitoring for production environments'
      );
    }

    if (slowQueryLogging) {
      this.addResult(
        'Slow Query Logging',
        'PASS',
        'Slow query logging is enabled'
      );
    } else {
      this.addResult(
        'Slow Query Logging',
        'WARN',
        'Slow query logging is disabled',
        'Enable slow query logging to identify performance issues'
      );
    }

    if (slowQueryThreshold <= 2000) {
      this.addResult(
        'Slow Query Threshold',
        'PASS',
        `Slow query threshold is appropriate: ${slowQueryThreshold}ms`
      );
    } else {
      this.addResult(
        'Slow Query Threshold',
        'WARN',
        `Slow query threshold is high: ${slowQueryThreshold}ms`,
        'Consider lowering threshold to catch more performance issues'
      );
    }
  }

  displayResults(): void {
    console.log('\n📊 DATABASE SECURITY VALIDATION RESULTS');
    console.log('========================================\n');

    // Display summary
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : '0.0';

    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📈 Success Rate: ${successRate}%\n`);

    // Display detailed results
    this.results.details.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${icon} ${result.test}`);
      console.log(`   ${result.message}`);
      if (result.recommendation) {
        console.log(`   💡 Recommendation: ${result.recommendation}`);
      }
      console.log('');
    });

    // Overall assessment
    if (this.results.failed === 0) {
      if (this.results.warnings === 0) {
        console.log('🎉 EXCELLENT: Database security is fully compliant!');
      } else {
        console.log('✅ GOOD: Database security is solid with minor improvements needed');
      }
    } else {
      console.log('🚨 CRITICAL: Database security issues must be addressed immediately');
    }

    console.log('\n🔐 Database security validation complete');
  }

  getResults(): SecurityValidationResult {
    return this.results;
  }
}

// Main execution
async function main() {
  const validator = new DatabaseSecurityValidator();
  
  try {
    await validator.validateSecurity();
    validator.displayResults();
    
    const results = validator.getResults();
    
    // Exit with appropriate code
    if (results.failed > 0) {
      process.exit(1); // Critical issues found
    } else if (results.warnings > 0) {
      process.exit(2); // Warnings found
    } else {
      process.exit(0); // All good
    }
    
  } catch (error) {
    console.error('❌ Database security validation failed:', error);
    process.exit(1);
  } finally {
    // Ensure clean shutdown
    try {
      await enhancedDb.disconnect();
    } catch {
      console.error('Warning: Could not disconnect from database properly');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseSecurityValidator };