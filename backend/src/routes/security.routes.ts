import { Router, Request, Response } from 'express';
import securityMonitoringService from '../services/securityMonitoring.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * Get comprehensive security metrics
 * GET /api/security/metrics
 */
router.get('/metrics', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const metrics = securityMonitoringService.getSecurityMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security metrics',
      code: 'METRICS_ERROR'
    });
  }
});

/**
 * Get active security alerts
 * GET /api/security/alerts
 */
router.get('/alerts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const alerts = securityMonitoringService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security alerts',
      code: 'ALERTS_ERROR'
    });
  }
});

/**
 * Resolve a security alert
 * POST /api/security/alerts/:alertId/resolve
 */
router.post('/alerts/:alertId/resolve', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const resolved = securityMonitoringService.resolveAlert(alertId, userId);
    
    if (resolved) {
      res.json({
        success: true,
        data: {
          alertId,
          resolved: true,
          resolvedBy: userId,
          resolvedAt: new Date().toISOString(),
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found or already resolved',
        code: 'ALERT_NOT_FOUND'
      });
    }

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve security alert',
      code: 'RESOLVE_ERROR'
    });
  }
});

/**
 * Get security monitoring health status
 * GET /api/security/health
 */
router.get('/health', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const healthStatus = securityMonitoringService.getHealthStatus();
    
    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString(),
    });

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security monitoring health',
      code: 'HEALTH_ERROR'
    });
  }
});

/**
 * Test security event logging (for development/testing)
 * POST /api/security/test-event
 */
router.post('/test-event', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoint not available in production',
        code: 'PRODUCTION_DISABLED'
      });
    }

    const { eventType, severity, details } = req.body;
    
    await securityMonitoringService.logSecurityEvent({
      eventType: eventType || 'security.test_event',
      timestamp: new Date(),
      severity: severity || 'LOW',
      userId: (req as any).user?.id,
      ipAddress: req.ip || 'test',
      userAgent: req.get('User-Agent'),
      details: {
        testEvent: true,
        ...details,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Test security event logged successfully',
        eventType,
        severity,
      }
    });

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to log test security event',
      code: 'TEST_EVENT_ERROR'
    });
  }
});

/**
 * Get security dashboard summary
 * GET /api/security/dashboard
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const metrics = securityMonitoringService.getSecurityMetrics();
    const alerts = securityMonitoringService.getActiveAlerts();
    const healthStatus = securityMonitoringService.getHealthStatus();

    // Create dashboard summary
    const dashboard = {
      overview: {
        totalEvents24h: metrics.totalEvents,
        criticalEvents24h: metrics.criticalEvents,
        highSeverityEvents24h: metrics.highSeverityEvents,
        activeAlerts: metrics.activeAlerts,
        isHealthy: healthStatus.isHealthy,
      },
      alerts: {
        critical: alerts.filter(a => a.severity === 'CRITICAL'),
        high: alerts.filter(a => a.severity === 'HIGH'),
        medium: alerts.filter(a => a.severity === 'MEDIUM'),
        low: alerts.filter(a => a.severity === 'LOW'),
      },
      topThreats: {
        eventTypes: metrics.topEventTypes.slice(0, 5),
        ipAddresses: metrics.topIpAddresses.slice(0, 5),
      },
      trends: {
        alertsOverTime: metrics.alertsOverTime,
      },
      recentActivity: metrics.recentEvents.slice(0, 10),
    };

    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security dashboard',
      code: 'DASHBOARD_ERROR'
    });
  }
});

export default router;