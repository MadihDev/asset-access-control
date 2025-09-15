import { Router } from 'express'
import DashboardController from '../controllers/dashboard.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticateToken, (req, res) => DashboardController.overview(req, res))

export default router
