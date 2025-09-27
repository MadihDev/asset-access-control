import http from 'http'
import app from './app'
import { startKeyExpiryJob } from './jobs/keyExpiry.job'
import { startRefreshCleanupJob } from './jobs/refreshCleanup.job'
import DeviceMonitoringService from './services/deviceMonitoring.service'
import logger from './lib/logger'
import { initWebSocket } from './lib/ws'

const port = process.env.PORT || 5000
const server = http.createServer(app)

// Initialize WebSocket
initWebSocket(server)

server.listen(port, () => {
  logger.info(`Server is listening on port ${port}`)
  if (process.env.NODE_ENV !== 'test') {
    startKeyExpiryJob()
    logger.info('Key expiry job started')
    startRefreshCleanupJob()
    logger.info('Refresh token cleanup job started')
    
    // Start device monitoring service
    const deviceMonitoringInterval = parseInt(process.env.DEVICE_MONITORING_INTERVAL_MS || '300000') // 5 minutes default
    DeviceMonitoringService.start(deviceMonitoringInterval)
    logger.info('Device monitoring service started')
  }
})
