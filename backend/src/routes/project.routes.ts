import { Router } from 'express'
import projectController from '../controllers/project.controller'

const router = Router()

// GET /api/project - list active projects
router.get('/', (req, res) => projectController.list(req, res))

// GET /api/project/:projectId/cities - list cities for a project
router.get('/:projectId/cities', (req, res) => projectController.getCities(req, res))

export default router
