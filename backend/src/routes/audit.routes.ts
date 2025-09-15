import { Router, Request, Response } from 'express'
import AuditController from '../controllers/audit.controller'
import { authenticateToken, requireManagerOrAbove } from '../middleware/auth.middleware'
import { validateAuditQuery } from '../middleware/validation.middleware'

const router = Router()

router.use(authenticateToken, requireManagerOrAbove)

router.get('/', validateAuditQuery, (req: Request, res: Response) => AuditController.list(req, res))

export default router
