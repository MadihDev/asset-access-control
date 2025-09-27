import prisma from '../lib/prisma'
import crypto from 'crypto'
import { 
  Device, 
  UpdateDeviceRequest, 
  DeviceRegistrationRequest,
  DeviceType,
  DeviceStatus,
  DevicePingRequest
} from '../types'

class DeviceService {
  /**
   * Register a new device
   */
  async register(data: DeviceRegistrationRequest, projectCityId?: string): Promise<Device> {
    const { deviceId, secretKey, deviceType, name, firmwareVersion, ipAddress, macAddress, locationId } = data

    // Check if device already exists
    const existingDevice = await prisma.device.findUnique({
      where: { deviceId }
    })

    if (existingDevice) {
      throw new Error(`Device with ID ${deviceId} already exists`)
    }

    // Validate location if provided
    if (locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          ...(projectCityId ? { projectCityId } : {})
        }
      })

      if (!location) {
        throw new Error('Location not found or not accessible')
      }
    }

    // Create the device
    const device = await prisma.device.create({
      data: {
        name,
        deviceId,
        secretKey,
        deviceType,
        firmwareVersion,
        ipAddress,
        macAddress,
        locationId,
        projectCityId,
        status: DeviceStatus.ACTIVE,
        isOnline: true,
        lastSeen: new Date(),
        lastPing: new Date()
      }
    })

    return device as Device
  }

  /**
   * List devices with optional filtering
   */
  async list(projectCityId?: string, filters?: {
    status?: DeviceStatus
    deviceType?: DeviceType
    locationId?: string
    isOnline?: boolean
  }): Promise<Device[]> {
    const where: any = {}

    if (projectCityId) {
      where.projectCityId = projectCityId
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.deviceType) {
      where.deviceType = filters.deviceType
    }

    if (filters?.locationId) {
      where.locationId = filters.locationId
    }

    if (filters?.isOnline !== undefined) {
      where.isOnline = filters.isOnline
    }

    const devices = await prisma.device.findMany({
      where,
      include: {
        location: {
          include: {
            address: {
              include: {
                city: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return devices as Device[]
  }

  /**
   * Get device by ID
   */
  async getById(id: string, projectCityId?: string): Promise<Device | null> {
    const where: any = { id }

    if (projectCityId) {
      where.projectCityId = projectCityId
    }

    const device = await prisma.device.findUnique({
      where,
      include: {
        location: {
          include: {
            address: {
              include: {
                city: true
              }
            }
          }
        },
        locks: true,
        commands: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    return device as Device | null
  }

  /**
   * Get device by deviceId (for authentication)
   */
  async getByDeviceId(deviceId: string): Promise<Device | null> {
    const device = await prisma.device.findUnique({
      where: { deviceId },
      include: {
        location: true
      }
    })

    return device as Device | null
  }

  /**
   * Update device
   */
  async update(id: string, data: UpdateDeviceRequest, projectCityId?: string): Promise<Device> {
    const where: any = { id }

    if (projectCityId) {
      where.projectCityId = projectCityId
    }

    // Validate location if provided
    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: data.locationId,
          ...(projectCityId ? { projectCityId } : {})
        }
      })

      if (!location) {
        throw new Error('Location not found or not accessible')
      }
    }

    const device = await prisma.device.update({
      where,
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return device as Device
  }

  /**
   * Handle device ping/heartbeat
   */
  async ping(deviceId: string, pingData: DevicePingRequest): Promise<Device> {
    const device = await prisma.device.findUnique({
      where: { deviceId }
    })

    if (!device) {
      throw new Error('Device not found')
    }

    // Update device status and health data
    const updateData: any = {
      isOnline: true,
      lastSeen: new Date(),
      lastPing: new Date(),
      errorCount: 0 // Reset error count on successful ping
    }

    if (pingData.batteryLevel !== undefined) {
      updateData.batteryLevel = pingData.batteryLevel
    }

    if (pingData.signalStrength !== undefined) {
      updateData.signalStrength = pingData.signalStrength
    }

    if (pingData.firmwareVersion) {
      updateData.firmwareVersion = pingData.firmwareVersion
    }

    if (pingData.status) {
      updateData.status = pingData.status
    }

    if (pingData.metadata) {
      updateData.metadata = pingData.metadata
    }

    const updatedDevice = await prisma.device.update({
      where: { deviceId },
      data: updateData
    })

    // Store health metrics if provided
    if (pingData.batteryLevel !== undefined) {
      await this.recordHealthMetric(device.id, 'battery_level', pingData.batteryLevel, 'percentage')
    }

    if (pingData.signalStrength !== undefined) {
      await this.recordHealthMetric(device.id, 'signal_strength', pingData.signalStrength, 'dBm')
    }

    return updatedDevice as Device
  }

  /**
   * Mark device as offline
   */
  async markOffline(deviceId: string): Promise<void> {
    await prisma.device.update({
      where: { deviceId },
      data: {
        isOnline: false,
        errorCount: {
          increment: 1
        }
      }
    })
  }

  /**
   * Authenticate device using deviceId and secretKey
   */
  async authenticate(deviceId: string, secretKey: string): Promise<Device | null> {
    const device = await prisma.device.findUnique({
      where: { deviceId }
    })

    if (!device || device.secretKey !== secretKey) {
      return null
    }

    if (device.status !== DeviceStatus.ACTIVE) {
      return null
    }

    return device as Device
  }

  /**
   * Generate new secret key for device
   */
  async regenerateSecretKey(id: string, projectCityId?: string): Promise<string> {
    const where: any = { id }

    if (projectCityId) {
      where.projectCityId = projectCityId
    }

    const newSecretKey = crypto.randomBytes(32).toString('hex')

    await prisma.device.update({
      where,
      data: { secretKey: newSecretKey }
    })

    return newSecretKey
  }

  /**
   * Delete device
   */
  async delete(id: string, projectCityId?: string): Promise<void> {
    const where: any = { id }

    if (projectCityId) {
      where.projectCityId = projectCityId
    }

    await prisma.device.delete({ where })
  }

  /**
   * Record health metric for device
   */
  async recordHealthMetric(deviceId: string, metricType: string, value: number, unit?: string): Promise<void> {
    await prisma.deviceHealthMetric.create({
      data: {
        deviceId,
        metricType,
        value,
        unit
      }
    })
  }

  /**
   * Get device health metrics
   */
  async getHealthMetrics(deviceId: string, metricType?: string, hours: number = 24): Promise<any[]> {
    const where: any = {
      deviceId,
      timestamp: {
        gte: new Date(Date.now() - hours * 60 * 60 * 1000)
      }
    }

    if (metricType) {
      where.metricType = metricType
    }

    return await prisma.deviceHealthMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    })
  }

  /**
   * Check for offline devices and mark them
   */
  async checkOfflineDevices(): Promise<void> {
    const offlineThreshold = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes

    await prisma.device.updateMany({
      where: {
        lastPing: {
          lt: offlineThreshold
        },
        isOnline: true
      },
      data: {
        isOnline: false
      }
    })
  }
}

export default new DeviceService()