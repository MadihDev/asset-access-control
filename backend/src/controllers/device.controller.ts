import { Request, Response } from 'express'
import DeviceService from '../services/device.service'
import DeviceCommandService from '../services/deviceCommand.service'
import AuditService from '../services/audit.service'
import { AuditAction, DeviceRegistrationRequest, UpdateDeviceRequest, DevicePingRequest, CreateDeviceCommandRequest } from '../types'
import { getEffectiveProjectCityId } from '../lib/scope'
import { emitToProjectCity } from '../lib/ws'

class DeviceController {
  /**
   * Register a new device
   * POST /api/device/register
   */
  async register(req: Request, res: Response) {
    try {
      const data: DeviceRegistrationRequest = req.body
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      const device = await DeviceService.register(data, effectiveProjectCityId)

      // Log audit
      await AuditService.log({ 
        req, 
        action: AuditAction.CREATE, 
        entityType: 'Device', 
        entityId: device.id, 
        newValues: { name: device.name, deviceId: device.deviceId, deviceType: device.deviceType } 
      })

      // Emit WebSocket event
      if (effectiveProjectCityId) {
        emitToProjectCity(effectiveProjectCityId, 'device:registered', {
          device: {
            id: device.id,
            name: device.name,
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            status: device.status
          }
        })
      }

      res.status(201).json({
        success: true,
        data: device,
        message: 'Device registered successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register device'
      })
    }
  }

  /**
   * List devices
   * GET /api/device
   */
  async list(req: Request, res: Response) {
    try {
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const { status, deviceType, locationId, isOnline } = req.query

      const filters: any = {}
      if (status) filters.status = status
      if (deviceType) filters.deviceType = deviceType
      if (locationId) filters.locationId = locationId as string
      if (isOnline !== undefined) filters.isOnline = isOnline === 'true'

      const devices = await DeviceService.list(effectiveProjectCityId, filters)

      res.json({
        success: true,
        data: devices
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch devices'
      })
    }
  }

  /**
   * Get device by ID
   * GET /api/device/:id
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      const device = await DeviceService.getById(id, effectiveProjectCityId)

      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        })
      }

      res.json({
        success: true,
        data: device
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch device'
      })
    }
  }

  /**
   * Update device
   * PUT /api/device/:id
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const data: UpdateDeviceRequest = req.body
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      const device = await DeviceService.update(id, data, effectiveProjectCityId)

      // Log audit
      await AuditService.log({ 
        req, 
        action: AuditAction.UPDATE, 
        entityType: 'Device', 
        entityId: device.id, 
        newValues: data 
      })

      // Emit WebSocket event
      if (effectiveProjectCityId) {
        emitToProjectCity(effectiveProjectCityId, 'device:updated', {
          device: {
            id: device.id,
            name: device.name,
            status: device.status,
            isOnline: device.isOnline
          }
        })
      }

      res.json({
        success: true,
        data: device,
        message: 'Device updated successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update device'
      })
    }
  }

  /**
   * Device ping/heartbeat
   * POST /api/device/:deviceId/ping
   */
  async ping(req: Request, res: Response) {
    try {
      const { deviceId } = req.params
      const pingData: DevicePingRequest = req.body

      const device = await DeviceService.ping(deviceId, pingData)

      // Emit WebSocket event for device status updates
      if (device.projectCityId) {
        emitToProjectCity(device.projectCityId, 'device:ping', {
          device: {
            id: device.id,
            deviceId: device.deviceId,
            isOnline: device.isOnline,
            batteryLevel: device.batteryLevel,
            signalStrength: device.signalStrength,
            lastSeen: device.lastSeen
          }
        })
      }

      res.json({
        success: true,
        data: {
          deviceId: device.deviceId,
          isOnline: device.isOnline,
          lastSeen: device.lastSeen
        },
        message: 'Device ping received'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process ping'
      })
    }
  }

  /**
   * Send command to device
   * POST /api/device/:deviceId/command
   */
  async sendCommand(req: Request, res: Response) {
    try {
      const { deviceId } = req.params
      const { command, parameters } = req.body

      const commandData: CreateDeviceCommandRequest = {
        deviceId,
        command,
        parameters
      }

      const deviceCommand = await DeviceCommandService.sendCommand(commandData)

      // Log audit
      await AuditService.log({ 
        req, 
        action: AuditAction.CREATE, 
        entityType: 'DeviceCommand', 
        entityId: deviceCommand.id, 
        newValues: { command, deviceId } 
      })

      res.status(201).json({
        success: true,
        data: deviceCommand,
        message: 'Command sent to device'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send command'
      })
    }
  }

  /**
   * Get pending commands for device
   * GET /api/device/:deviceId/commands/pending
   */
  async getPendingCommands(req: Request, res: Response) {
    try {
      const { deviceId } = req.params

      const commands = await DeviceCommandService.getPendingCommands(deviceId)

      res.json({
        success: true,
        data: commands
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pending commands'
      })
    }
  }

  /**
   * Update command response
   * POST /api/device/command/:commandId/response
   */
  async updateCommandResponse(req: Request, res: Response) {
    try {
      const { commandId } = req.params
      const responseData = req.body

      const command = await DeviceCommandService.updateCommandResponse(commandId, responseData)

      res.json({
        success: true,
        data: command,
        message: 'Command response updated'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update command response'
      })
    }
  }

  /**
   * Get device health metrics
   * GET /api/device/:deviceId/health
   */
  async getHealthMetrics(req: Request, res: Response) {
    try {
      const { deviceId } = req.params
      const { metricType, hours = '24' } = req.query

      const device = await DeviceService.getByDeviceId(deviceId)
      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        })
      }

      const metrics = await DeviceService.getHealthMetrics(
        device.id, 
        metricType as string, 
        parseInt(hours as string)
      )

      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch health metrics'
      })
    }
  }

  /**
   * Regenerate device secret key
   * POST /api/device/:id/regenerate-key
   */
  async regenerateSecretKey(req: Request, res: Response) {
    try {
      const { id } = req.params
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      const newSecretKey = await DeviceService.regenerateSecretKey(id, effectiveProjectCityId)

      // Log audit
      await AuditService.log({ 
        req, 
        action: AuditAction.UPDATE, 
        entityType: 'Device', 
        entityId: id, 
        newValues: { action: 'regenerate_secret_key' } 
      })

      res.json({
        success: true,
        data: { secretKey: newSecretKey },
        message: 'Secret key regenerated successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate secret key'
      })
    }
  }

  /**
   * Delete device
   * DELETE /api/device/:id
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Get device info for logging
      const device = await DeviceService.getById(id, effectiveProjectCityId)
      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        })
      }

      await DeviceService.delete(id, effectiveProjectCityId)

      // Log audit
      await AuditService.log({ 
        req, 
        action: AuditAction.DELETE, 
        entityType: 'Device', 
        entityId: id, 
        oldValues: { name: device.name, deviceId: device.deviceId } 
      })

      // Emit WebSocket event
      if (effectiveProjectCityId) {
        emitToProjectCity(effectiveProjectCityId, 'device:deleted', {
          deviceId: id
        })
      }

      res.json({
        success: true,
        message: 'Device deleted successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete device'
      })
    }
  }
}

export default new DeviceController()