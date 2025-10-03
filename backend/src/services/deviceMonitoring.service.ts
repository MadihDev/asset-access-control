import DeviceService from './device.service'
import { emitToProjectCity } from '../lib/ws'

class DeviceMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * Start device monitoring service
   */
  start(intervalMs: number = 300000): void { // Default 5 minutes
    if (this.isRunning) {
      console.log('Device monitoring service is already running')
      return
    }

    console.log(`Starting device monitoring service with ${intervalMs}ms interval`)
    
    this.isRunning = true
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkDeviceHealth()
      } catch (error) {
        console.error('Error in device monitoring service:', error)
      }
    }, intervalMs)

    // Run initial check
    this.checkDeviceHealth().catch(error => {
      console.error('Error in initial device health check:', error)
    })
  }

  /**
   * Stop device monitoring service
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isRunning = false
    console.log('Device monitoring service stopped')
  }

  /**
   * Check health of all devices
   */
  private async checkDeviceHealth(): Promise<void> {
    console.log('Running device health check...')

    try {
      // Get all active devices
      const devices = await DeviceService.list()
      const now = new Date()
      let offlineDevicesCount = 0

      for (const device of devices) {
        if (!device.lastPing) {
          continue // Skip devices that never pinged
        }

        // Calculate time since last ping
        const timeSinceLastPing = now.getTime() - new Date(device.lastPing).getTime()
        const offlineThreshold = (device.pingInterval || 300) * 2 * 1000 // 2x ping interval in ms

        // Check if device should be marked offline
        if (timeSinceLastPing > offlineThreshold && device.isOnline) {
          try {
            await DeviceService.markOffline(device.deviceId)
            offlineDevicesCount++

            // Emit WebSocket event for device offline
            if (device.projectCityId) {
              emitToProjectCity(device.projectCityId, 'device:offline', {
                device: {
                  id: device.id,
                  deviceId: device.deviceId,
                  name: device.name,
                  isOnline: false,
                  lastSeen: device.lastSeen,
                  timeSinceLastPing: Math.floor(timeSinceLastPing / 1000) // seconds
                }
              })
            }

            console.log(`Marked device ${device.deviceId} (${device.name}) as offline - last ping: ${device.lastPing}`)
          } catch (error) {
            console.error(`Failed to mark device ${device.deviceId} as offline:`, error)
          }
        }

        // Check for low battery alerts
        if (device.batteryLevel !== null && device.batteryLevel !== undefined && device.batteryLevel < 20 && device.isOnline) {
          try {
            if (device.projectCityId) {
              emitToProjectCity(device.projectCityId, 'device:low_battery', {
                device: {
                  id: device.id,
                  deviceId: device.deviceId,
                  name: device.name,
                  batteryLevel: device.batteryLevel,
                  locationId: device.locationId
                }
              })
            }

            console.log(`Low battery alert for device ${device.deviceId} (${device.name}): ${device.batteryLevel}%`)
          } catch (error) {
            console.error(`Failed to send low battery alert for device ${device.deviceId}:`, error)
          }
        }

        // Check for high error count
        if (device.errorCount > 10 && device.isOnline) {
          try {
            if (device.projectCityId) {
              emitToProjectCity(device.projectCityId, 'device:high_error_count', {
                device: {
                  id: device.id,
                  deviceId: device.deviceId,
                  name: device.name,
                  errorCount: device.errorCount,
                  locationId: device.locationId
                }
              })
            }

            console.log(`High error count alert for device ${device.deviceId} (${device.name}): ${device.errorCount} errors`)
          } catch (error) {
            console.error(`Failed to send high error count alert for device ${device.deviceId}:`, error)
          }
        }
      }

      if (offlineDevicesCount > 0) {
        console.log(`Device health check completed - marked ${offlineDevicesCount} devices as offline`)
      } else {
        console.log('Device health check completed - all devices healthy')
      }

    } catch (error) {
      console.error('Failed to run device health check:', error)
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isRunning: boolean; intervalMs?: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.monitoringInterval ? 300000 : undefined
    }
  }

  /**
   * Force run health check
   */
  async runHealthCheck(): Promise<void> {
    await this.checkDeviceHealth()
  }

  /**
   * Get device statistics
   */
  async getDeviceStats(): Promise<any> {
    try {
      const devices = await DeviceService.list()
      
      const stats = {
        total: devices.length,
        online: devices.filter(d => d.isOnline).length,
        offline: devices.filter(d => !d.isOnline).length,
        lowBattery: devices.filter(d => d.batteryLevel !== null && d.batteryLevel !== undefined && d.batteryLevel < 20).length,
        highErrorCount: devices.filter(d => d.errorCount > 10).length,
        byType: devices.reduce((acc: any, device) => {
          acc[device.deviceType] = (acc[device.deviceType] || 0) + 1
          return acc
        }, {}),
        byStatus: devices.reduce((acc: any, device) => {
          acc[device.status] = (acc[device.status] || 0) + 1
          return acc
        }, {})
      }

      return stats
    } catch (error) {
      console.error('Failed to get device statistics:', error)
      throw error
    }
  }
}

export default new DeviceMonitoringService()