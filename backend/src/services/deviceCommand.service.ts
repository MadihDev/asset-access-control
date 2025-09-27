import prisma from '../lib/prisma'
import { DeviceCommand, CreateDeviceCommandRequest, DeviceCommandResponse } from '../types'

class DeviceCommandService {
  /**
   * Send command to device
   */
  async sendCommand(data: CreateDeviceCommandRequest): Promise<DeviceCommand> {
    const { deviceId, command, parameters } = data

    // Verify device exists and is online
    const device = await prisma.device.findUnique({
      where: { deviceId }
    })

    if (!device) {
      throw new Error('Device not found')
    }

    if (!device.isOnline) {
      throw new Error('Device is offline')
    }

    // Create command
    const deviceCommand = await prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        command,
        parameters,
        status: 'PENDING'
      }
    })

    return deviceCommand as DeviceCommand
  }

  /**
   * Get commands for device
   */
  async getDeviceCommands(deviceId: string, limit: number = 50): Promise<DeviceCommand[]> {
    const device = await prisma.device.findUnique({
      where: { deviceId }
    })

    if (!device) {
      throw new Error('Device not found')
    }

    const commands = await prisma.deviceCommand.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return commands as DeviceCommand[]
  }

  /**
   * Get pending commands for device
   */
  async getPendingCommands(deviceId: string): Promise<DeviceCommand[]> {
    const device = await prisma.device.findUnique({
      where: { deviceId }
    })

    if (!device) {
      throw new Error('Device not found')
    }

    const commands = await prisma.deviceCommand.findMany({
      where: { 
        deviceId: device.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    })

    return commands as DeviceCommand[]
  }

  /**
   * Mark command as sent
   */
  async markCommandSent(commandId: string): Promise<DeviceCommand> {
    const command = await prisma.deviceCommand.update({
      where: { id: commandId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    })

    return command as DeviceCommand
  }

  /**
   * Update command response
   */
  async updateCommandResponse(commandId: string, response: DeviceCommandResponse): Promise<DeviceCommand> {
    const { success, response: responseData, error } = response

    const command = await prisma.deviceCommand.update({
      where: { id: commandId },
      data: {
        status: success ? 'EXECUTED' : 'FAILED',
        response: responseData,
        error,
        executedAt: new Date()
      }
    })

    return command as DeviceCommand
  }

  /**
   * Get command by ID
   */
  async getById(commandId: string): Promise<DeviceCommand | null> {
    const command = await prisma.deviceCommand.findUnique({
      where: { id: commandId },
      include: {
        device: true
      }
    })

    return command as DeviceCommand | null
  }

  /**
   * Cancel pending command
   */
  async cancelCommand(commandId: string): Promise<DeviceCommand> {
    const command = await prisma.deviceCommand.update({
      where: { 
        id: commandId,
        status: 'PENDING'
      },
      data: {
        status: 'FAILED',
        error: 'Command cancelled',
        executedAt: new Date()
      }
    })

    return command as DeviceCommand
  }

  /**
   * Clean up old commands
   */
  async cleanupOldCommands(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    const result = await prisma.deviceCommand.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        status: {
          in: ['EXECUTED', 'FAILED']
        }
      }
    })

    return result.count
  }

  /**
   * Get command statistics
   */
  async getCommandStats(deviceId?: string): Promise<any> {
    const where: any = {}

    if (deviceId) {
      const device = await prisma.device.findUnique({
        where: { deviceId }
      })

      if (device) {
        where.deviceId = device.id
      }
    }

    const stats = await prisma.deviceCommand.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    })

    return stats.reduce((acc: any, stat: any) => {
      acc[stat.status.toLowerCase()] = stat._count.status
      return acc
    }, {})
  }
}

export default new DeviceCommandService()