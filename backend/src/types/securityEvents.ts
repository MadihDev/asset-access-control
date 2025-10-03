// Security event types for comprehensive monitoring
export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGIN_BRUTE_FORCE = 'auth.login.brute_force',
  TOKEN_REFRESH = 'auth.token.refresh',
  TOKEN_VALIDATION_FAILURE = 'auth.token.validation_failure',

  // Authorization Events
  UNAUTHORIZED_ACCESS = 'authz.unauthorized_access',
  PRIVILEGE_ESCALATION_ATTEMPT = 'authz.privilege_escalation',
  CROSS_TENANT_ACCESS_ATTEMPT = 'authz.cross_tenant_access',

  // Rate Limiting Events
  RATE_LIMIT_EXCEEDED = 'rate_limit.exceeded',
  DOS_ATTEMPT_DETECTED = 'security.dos_attempt',

  // Database Security Events
  DATABASE_CONNECTION_FAILURE = 'db.connection.failure',
  SLOW_QUERY_DETECTED = 'db.query.slow',
  SQL_INJECTION_ATTEMPT = 'db.injection.attempt',

  // System Security Events
  CONFIGURATION_CHANGE = 'system.config.change',
  SECURITY_POLICY_VIOLATION = 'system.policy.violation',

  // RFID Specific Events
  RFID_ACCESS_DENIED = 'rfid.access.denied',
  RFID_CARD_CLONING_ATTEMPT = 'rfid.card.cloning_attempt',

  // Enhanced JWT Events
  JWT_TOKEN_MANIPULATION = 'jwt.token.manipulation',
  JWT_IP_MISMATCH = 'jwt.ip.mismatch',
  JWT_SESSION_HIJACK_ATTEMPT = 'jwt.session.hijack',
}

// Security event interface
export interface SecurityEvent {
  eventType: SecurityEventType;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  metadata?: {
    endpoint?: string;
    requestId?: string;
    tenantId?: string;
  };
}

// Security alert interface
export interface SecurityAlert {
  id: string;
  eventType: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold: number;
  actualCount: number;
  timeWindow: string;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: string[];
  ipAddresses: string[];
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Security dashboard metrics
export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  activeAlerts: number;
  topEventTypes: Array<{
    eventType: SecurityEventType;
    count: number;
    severity: string;
  }>;
  topIpAddresses: Array<{
    ipAddress: string;
    eventCount: number;
    uniqueEventTypes: number;
  }>;
  recentEvents: SecurityEvent[];
  alertsOverTime: Array<{
    timestamp: Date;
    count: number;
  }>;
}