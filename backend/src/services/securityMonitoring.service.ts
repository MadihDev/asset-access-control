import winston from 'winston';
import { SecurityEvent, SecurityEventType, SecurityAlert, SecurityMetrics } from '../types/securityEvents';
import logger from '../lib/logger';
import { randomUUID } from 'crypto';

class SecurityMonitoringService {
  private securityLogger!: winston.Logger;
  private alertThresholds: Map<SecurityEventType, number> = new Map();
  private eventStore: SecurityEvent[] = []; // In production, use database
  private alertStore: SecurityAlert[] = []; // In production, use database
  private maxEventHistory = 10000; // Keep last 10k events in memory

  constructor() {
    this.initializeSecurityLogger();
    this.initializeAlertThresholds();
    this.startPeriodicCleanup();
  }

  private initializeSecurityLogger(): void {
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // Security events log
        new winston.transports.File({
          filename: 'logs/security-events.log',
          level: 'info',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
        // Critical security events
        new winston.transports.File({
          filename: 'logs/security-critical.log',
          level: 'error',
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
        }),
        // Console output for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
          silent: process.env.NODE_ENV === 'production',
        }),
      ],
    });
  }

  private initializeAlertThresholds(): void {
    // Define alert thresholds (events per hour)
    this.alertThresholds.set(SecurityEventType.LOGIN_FAILURE, 50);
    this.alertThresholds.set(SecurityEventType.UNAUTHORIZED_ACCESS, 20);
    this.alertThresholds.set(SecurityEventType.RATE_LIMIT_EXCEEDED, 100);
    this.alertThresholds.set(SecurityEventType.SQL_INJECTION_ATTEMPT, 5);
    this.alertThresholds.set(SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT, 1);
    this.alertThresholds.set(SecurityEventType.JWT_TOKEN_MANIPULATION, 3);
    this.alertThresholds.set(SecurityEventType.JWT_IP_MISMATCH, 10);
    this.alertThresholds.set(SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT, 5);
    this.alertThresholds.set(SecurityEventType.DOS_ATTEMPT_DETECTED, 1);
    this.alertThresholds.set(SecurityEventType.RFID_CARD_CLONING_ATTEMPT, 3);
  }

  /**
   * Log a security event with comprehensive monitoring
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Add timestamp if not provided
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      // Map security severity to Winston log levels
      const getWinstonLevel = (severity: string): string => {
        switch (severity.toUpperCase()) {
          case 'CRITICAL': return 'error';
          case 'HIGH': return 'error';
          case 'MEDIUM': return 'warn';
          case 'LOW': return 'info';
          default: return 'info';
        }
      };

      // Log to file with proper Winston level
      this.securityLogger.log(getWinstonLevel(event.severity), {
        eventType: event.eventType,
        timestamp: event.timestamp,
        severity: event.severity,
        userId: event.userId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details,
        metadata: event.metadata,
      });

      // Store in memory for analysis (in production, use database)
      this.eventStore.push(event);
      this.maintainEventHistory();

      // Check for alert conditions
      await this.checkAlertConditions(event);

      // Log to main application logger for integration
      logger.info('Security event logged', {
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        ipAddress: event.ipAddress,
      });

      // Real-time processing for critical events
      if (event.severity === 'CRITICAL') {
        await this.handleCriticalEvent(event);
      }

    } catch (error) {
      logger.error('Failed to log security event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.eventType,
      });
    }
  }

  /**
   * Check for alert conditions and trigger alerts if thresholds are exceeded
   */
  private async checkAlertConditions(event: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds.get(event.eventType);
    if (!threshold) return;

    // Count similar events in the last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.eventStore.filter(e => 
      e.eventType === event.eventType && 
      e.timestamp >= hourAgo
    );

    if (recentEvents.length >= threshold) {
      await this.triggerSecurityAlert(event.eventType, recentEvents, threshold);
    }
  }

  /**
   * Trigger a security alert
   */
  private async triggerSecurityAlert(
    eventType: SecurityEventType,
    events: SecurityEvent[],
    threshold: number
  ): Promise<void> {
    // Check if alert already exists for this event type
    const existingAlert = this.alertStore.find(alert => 
      alert.eventType === eventType && 
      !alert.isResolved &&
      alert.lastOccurrence.getTime() > Date.now() - 60 * 60 * 1000 // Within last hour
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.actualCount = events.length;
      existingAlert.lastOccurrence = new Date();
      existingAlert.affectedUsers = [...new Set([
        ...existingAlert.affectedUsers,
        ...events.map(e => e.userId).filter(Boolean) as string[]
      ])];
      existingAlert.ipAddresses = [...new Set([
        ...existingAlert.ipAddresses,
        ...events.map(e => e.ipAddress)
      ])];
    } else {
      // Create new alert
      const alert: SecurityAlert = {
        id: randomUUID(),
        eventType,
        severity: this.getAlertSeverity(eventType, events.length, threshold),
        threshold,
        actualCount: events.length,
        timeWindow: '1 hour',
        firstOccurrence: events[0].timestamp,
        lastOccurrence: events[events.length - 1].timestamp,
        affectedUsers: [...new Set(events.map(e => e.userId).filter(Boolean) as string[])],
        ipAddresses: [...new Set(events.map(e => e.ipAddress))],
        isResolved: false,
      };

      this.alertStore.push(alert);

      // Log alert creation
      this.securityLogger.error('Security alert triggered', {
        alertId: alert.id,
        eventType: alert.eventType,
        severity: alert.severity,
        actualCount: alert.actualCount,
        threshold: alert.threshold,
        affectedUsers: alert.affectedUsers,
        ipAddresses: alert.ipAddresses,
      });

      // Send notifications
      await this.sendSecurityAlert(alert);
    }
  }

  /**
   * Determine alert severity based on event type and count
   */
  private getAlertSeverity(
    eventType: SecurityEventType,
    count: number,
    threshold: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const ratio = count / threshold;

    // Critical events that should always be high severity
    const criticalEventTypes = [
      SecurityEventType.DOS_ATTEMPT_DETECTED,
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.JWT_TOKEN_MANIPULATION,
    ];

    if (criticalEventTypes.includes(eventType)) {
      return 'CRITICAL';
    }

    if (ratio >= 5) return 'CRITICAL';
    if (ratio >= 3) return 'HIGH';
    if (ratio >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Handle critical security events with immediate response
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    logger.error('CRITICAL SECURITY EVENT DETECTED', {
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      details: event.details,
      timestamp: event.timestamp,
    });

    // In production, implement immediate response actions:
    // - Block IP address
    // - Disable user account
    // - Send immediate notifications
    // - Trigger incident response procedures
  }

  /**
   * Send security alert notifications
   */
  private async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Log alert for now (in production, send to notification system)
      logger.warn('🚨 SECURITY ALERT TRIGGERED', {
        alertId: alert.id,
        eventType: alert.eventType,
        severity: alert.severity,
        count: alert.actualCount,
        threshold: alert.threshold,
        affectedUsers: alert.affectedUsers.length,
        ipAddresses: alert.ipAddresses.length,
      });

      // In production, implement:
      // - Email notifications
      // - Slack/Teams alerts
      // - SMS for critical alerts
      // - PagerDuty integration
      // - SIEM integration

    } catch (error) {
      logger.error('Failed to send security alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get comprehensive security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.eventStore.filter(e => e.timestamp >= last24Hours);
    
    // Count events by type
    const eventTypeCounts = new Map<SecurityEventType, number>();
    const ipCounts = new Map<string, Set<SecurityEventType>>();
    
    recentEvents.forEach(event => {
      // Count by event type
      eventTypeCounts.set(event.eventType, (eventTypeCounts.get(event.eventType) || 0) + 1);
      
      // Count by IP
      if (!ipCounts.has(event.ipAddress)) {
        ipCounts.set(event.ipAddress, new Set());
      }
      ipCounts.get(event.ipAddress)!.add(event.eventType);
    });

    return {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'CRITICAL').length,
      highSeverityEvents: recentEvents.filter(e => e.severity === 'HIGH').length,
      activeAlerts: this.alertStore.filter(a => !a.isResolved).length,
      topEventTypes: Array.from(eventTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([eventType, count]) => ({
          eventType,
          count,
          severity: this.getEventTypeSeverity(eventType),
        })),
      topIpAddresses: Array.from(ipCounts.entries())
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 10)
        .map(([ipAddress, uniqueEventTypes]) => ({
          ipAddress,
          eventCount: recentEvents.filter(e => e.ipAddress === ipAddress).length,
          uniqueEventTypes: uniqueEventTypes.size,
        })),
      recentEvents: recentEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50),
      alertsOverTime: this.getAlertsOverTime(),
    };
  }

  /**
   * Get typical severity for an event type
   */
  private getEventTypeSeverity(eventType: SecurityEventType): string {
    const criticalEvents = [
      SecurityEventType.DOS_ATTEMPT_DETECTED,
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
    ];

    const highEvents = [
      SecurityEventType.JWT_TOKEN_MANIPULATION,
      SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT,
      SecurityEventType.RFID_CARD_CLONING_ATTEMPT,
    ];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (highEvents.includes(eventType)) return 'HIGH';
    return 'MEDIUM';
  }

  /**
   * Get alerts over time for dashboard
   */
  private getAlertsOverTime(): Array<{ timestamp: Date; count: number }> {
    const now = new Date();
    const hours = [];
    
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const alertCount = this.alertStore.filter(alert => 
        alert.firstOccurrence >= hourStart && 
        alert.firstOccurrence < hourEnd
      ).length;

      hours.push({
        timestamp: hourStart,
        count: alertCount,
      });
    }

    return hours;
  }

  /**
   * Resolve a security alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alertStore.find(a => a.id === alertId);
    if (alert && !alert.isResolved) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      
      logger.info('Security alert resolved', {
        alertId,
        resolvedBy,
        eventType: alert.eventType,
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return this.alertStore.filter(alert => !alert.isResolved);
  }

  /**
   * Maintain event history size
   */
  private maintainEventHistory(): void {
    if (this.eventStore.length > this.maxEventHistory) {
      // Remove oldest events, keep most recent
      this.eventStore = this.eventStore
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.maxEventHistory);
    }
  }

  /**
   * Periodic cleanup of old alerts and events
   */
  private startPeriodicCleanup(): void {
    // Clean up every hour
    setInterval(() => {
      try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Remove old resolved alerts
        this.alertStore = this.alertStore.filter(alert => 
          !alert.isResolved || 
          (alert.resolvedAt && alert.resolvedAt > oneWeekAgo)
        );

        // Remove very old events (keep last week)
        this.eventStore = this.eventStore.filter(event => 
          event.timestamp > oneWeekAgo
        );

        logger.debug('Security monitoring cleanup completed', {
          activeAlerts: this.alertStore.filter(a => !a.isResolved).length,
          totalEvents: this.eventStore.length,
        });

      } catch (error) {
        logger.error('Security monitoring cleanup failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get security monitoring health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    eventStoreSize: number;
    alertStoreSize: number;
    activeAlerts: number;
    lastEventTimestamp?: Date;
  } {
    const activeAlerts = this.alertStore.filter(a => !a.isResolved).length;
    const lastEvent = this.eventStore[this.eventStore.length - 1];

    return {
      isHealthy: activeAlerts < 10, // Consider unhealthy if too many active alerts
      eventStoreSize: this.eventStore.length,
      alertStoreSize: this.alertStore.length,
      activeAlerts,
      lastEventTimestamp: lastEvent?.timestamp,
    };
  }
}

// Export singleton instance
export default new SecurityMonitoringService();