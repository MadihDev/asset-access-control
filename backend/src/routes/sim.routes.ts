import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware'
import { emitToCity } from '../lib/ws'
import { AccessResult, AccessType } from '../types'

const router = Router()

// All routes require authentication and admin-level rights
router.use(authenticateToken, requireAdmin)

// POST /api/sim/access - simulate a card read/access attempt
router.post('/access', async (req, res) => {
  try {
    const { lockId, userId, rfidKeyId, result, accessType, timestamp } = req.body as {
      lockId: string
      userId?: string
      rfidKeyId?: string
      result: AccessResult
      accessType?: AccessType
      timestamp?: string
    }

    if (!lockId || !result) {
      return res.status(400).json({ success: false, error: 'lockId and result are required' })
    }

    const lock = await prisma.lock.findUnique({
      where: { id: lockId },
      select: { id: true, address: { select: { cityId: true } } },
    })
    if (!lock) return res.status(404).json({ success: false, error: 'Lock not found' })
    const cityId = lock.address?.cityId

    const ts = timestamp ? new Date(timestamp) : new Date()
    if (isNaN(ts.getTime())) return res.status(400).json({ success: false, error: 'Invalid timestamp' })

    const log = await prisma.accessLog.create({
      data: {
        lockId,
        userId: userId ?? null,
        rfidKeyId: rfidKeyId ?? null,
        result,
        accessType: accessType ?? 'RFID_CARD',
        timestamp: ts,
        cityId: cityId ?? null,
      },
      select: { id: true, lockId: true, userId: true, rfidKeyId: true, result: true, accessType: true, timestamp: true, cityId: true },
    })

    if (cityId) {
      emitToCity(cityId, 'access:attempt', { ...log })
    }

    return res.status(200).json({ success: true, data: log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to simulate access attempt' })
  }
})

// POST /api/sim/lock-status - simulate lock going online/offline
router.post('/lock-status', async (req, res) => {
  try {
    const { lockId, isOnline } = req.body as { lockId: string; isOnline: boolean }
    if (!lockId || typeof isOnline !== 'boolean') {
      return res.status(400).json({ success: false, error: 'lockId and isOnline (boolean) are required' })
    }
    const lock = await prisma.lock.update({
      where: { id: lockId },
      data: { isOnline, lastSeen: new Date() },
      select: { id: true, isOnline: true, lastSeen: true, address: { select: { cityId: true } } },
    })
    const cityId = lock.address?.cityId
    if (cityId) emitToCity(cityId, 'lock:status', { lockId: lock.id, isOnline: lock.isOnline, lastSeen: lock.lastSeen })
    return res.status(200).json({ success: true, data: { lockId: lock.id, isOnline: lock.isOnline, lastSeen: lock.lastSeen } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to update lock status' })
  }
})

export default router
