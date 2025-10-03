import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';

// Database security configuration interface
interface DatabaseSecurityConfig {
  ssl: boolean;
  connectionTimeout: number;
  queryTimeout: number;
  poolSize: number;
  logQueries: boolean;
  logSlowQueries: boolean;
  slowQueryThreshold: number;
  enableSecurityMonitoring: boolean;
}

// Enhanced Prisma client with security features
class EnhancedDatabaseClient {
  private prisma: PrismaClient;
  private config: DatabaseSecurityConfig;
  private queryCount: number = 0;
  private slowQueryCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.config = this.getSecurityConfig();
    this.prisma = this.createSecurePrismaClient();
    this.initializeSecurityMonitoring();
  }

  private getSecurityConfig(): DatabaseSecurityConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      ssl: isProduction,
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
      poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
      logQueries: process.env.DB_LOG_QUERIES === 'true',
      logSlowQueries: process.env.DB_LOG_SLOW_QUERIES !== 'false', // Default true
      slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
      enableSecurityMonitoring: process.env.DB_SECURITY_MONITORING !== 'false', // Default true
    };
  }

  private createSecurePrismaClient(): PrismaClient {
    return new PrismaClient({
      datasourceUrl: this.buildSecureConnectionString(),
      log: this.getLogConfiguration(),
      errorFormat: 'pretty',
    });
  }

  private buildSecureConnectionString(): string {
    const baseUrl = process.env.DATABASE_URL!;
    
    if (!this.config.ssl) {
      return baseUrl;
    }

    // Add SSL parameters for production
    const url = new URL(baseUrl);
    url.searchParams.set('sslmode', 'require');
    url.searchParams.set('connect_timeout', (this.config.connectionTimeout / 1000).toString());
    
    // Add additional SSL parameters if certificates are provided
    if (process.env.DATABASE_CA_CERT) {
      url.searchParams.set('sslcert', process.env.DATABASE_CLIENT_CERT || '');
      url.searchParams.set('sslkey', process.env.DATABASE_CLIENT_KEY || '');
      url.searchParams.set('sslrootcert', process.env.DATABASE_CA_CERT);
    }

    return url.toString();
  }

  private getLogConfiguration(): Array<'query' | 'info' | 'warn' | 'error'> {
    const logConfig: Array<'query' | 'info' | 'warn' | 'error'> = [];
    
    if (this.config.logQueries) {
      logConfig.push('query');
    }
    
    if (process.env.NODE_ENV === 'development') {
      logConfig.push('info', 'warn', 'error');
    } else {
      logConfig.push('warn', 'error');
    }

    return logConfig;
  }

  private initializeSecurityMonitoring(): void {
    if (!this.config.enableSecurityMonitoring) return;

    // Monitor query performance
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();
      this.queryCount++;

      try {
        const result = await next(params);
        const duration = Date.now() - startTime;

        // Log slow queries
        if (duration > this.config.slowQueryThreshold) {
          this.slowQueryCount++;
          if (this.config.logSlowQueries) {
            logger.warn('Slow database query detected', {
              model: params.model,
              action: params.action,
              duration: `${duration}ms`,
              args: this.sanitizeArgs(params.args),
              threshold: `${this.config.slowQueryThreshold}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Log query for security analysis (if enabled)
        if (this.config.logQueries && process.env.NODE_ENV === 'development') {
          logger.debug('Database query executed', {
            model: params.model,
            action: params.action,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        }

        return result;
        
      } catch (error) {
        this.errorCount++;
        logger.error('Database query failed', {
          model: params.model,
          action: params.action,
          duration: `${Date.now() - startTime}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
          args: this.sanitizeArgs(params.args),
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    });

    // Monitor connection health
    this.startHealthMonitoring();
  }

  private sanitizeArgs(args: any): any {
    if (!args) return {};
    
    // Remove sensitive data from logs
    const sanitized = { ...args };
    
    if (sanitized.data) {
      const data = { ...sanitized.data };
      
      // Remove password fields
      if (data.password) data.password = '[REDACTED]';
      if (data.secretKey) data.secretKey = '[REDACTED]';
      if (data.codeHash) data.codeHash = '[REDACTED]';
      
      sanitized.data = data;
    }
    
    if (sanitized.where) {
      const where = { ...sanitized.where };
      if (where.password) where.password = '[REDACTED]';
      sanitized.where = where;
    }

    return sanitized;
  }

  private startHealthMonitoring(): void {
    // Check database health every 5 minutes
    setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        logger.error('Database health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  async healthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Simple query to test connection
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      
      const responseTime = Date.now() - startTime;
      
      logger.info('Database health check passed', {
        responseTime: `${responseTime}ms`,
        queryCount: this.queryCount,
        slowQueryCount: this.slowQueryCount,
        errorCount: this.errorCount,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryCount: this.queryCount,
        errorCount: this.errorCount,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  // Get database security status
  async getSecurityStatus(): Promise<any> {
    try {
      // Check SSL status
      const sslStatus = await this.prisma.$queryRaw`SHOW ssl`;
      
      // Check current user and connection info
      const connectionInfo = await this.prisma.$queryRaw`
        SELECT 
          current_user as username,
          current_database() as database,
          inet_server_addr() as server_address,
          inet_server_port() as server_port,
          current_setting('ssl') as ssl_enabled,
          version() as postgres_version
      `;

      // Check user privileges (sample - may need adjustment based on your setup)
      const privileges = await this.prisma.$queryRaw`
        SELECT 
          grantee,
          privilege_type,
          is_grantable
        FROM information_schema.role_table_grants 
        WHERE grantee = current_user
        LIMIT 10
      `;

      return {
        ssl: sslStatus,
        connection: connectionInfo,
        privileges: privileges,
        statistics: {
          totalQueries: this.queryCount,
          slowQueries: this.slowQueryCount,
          errors: this.errorCount,
          config: this.config,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get database security status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Validate database security configuration
  async validateSecurity(): Promise<{
    isSecure: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      await this.getSecurityStatus();
      
      // Check SSL
      if (!this.config.ssl && process.env.NODE_ENV === 'production') {
        warnings.push('SSL is not enabled in production environment');
        recommendations.push('Enable SSL for production database connections');
      }

      // Check connection timeout
      if (this.config.connectionTimeout > 30000) {
        warnings.push('Connection timeout is very high (>30s)');
        recommendations.push('Consider reducing connection timeout for better security');
      }

      // Check query timeout
      if (this.config.queryTimeout > 60000) {
        warnings.push('Query timeout is very high (>60s)');
        recommendations.push('Consider reducing query timeout to prevent long-running queries');
      }

      // Check if monitoring is enabled
      if (!this.config.enableSecurityMonitoring) {
        warnings.push('Database security monitoring is disabled');
        recommendations.push('Enable database security monitoring for production');
      }

      const isSecure = warnings.length === 0;

      return {
        isSecure,
        warnings,
        recommendations,
      };
    } catch (_error) {
      return {
        isSecure: false,
        warnings: ['Failed to validate database security'],
        recommendations: ['Fix database connection issues and retry validation'],
      };
    }
  }

  // Get the Prisma client instance
  getClient(): PrismaClient {
    return this.prisma;
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('Database connection closed gracefully');
  }
}

// Create singleton instance
const enhancedDb = new EnhancedDatabaseClient();

// Export both the enhanced client and the raw Prisma client for backward compatibility
export default enhancedDb.getClient();
export { enhancedDb };