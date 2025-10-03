import express from 'express'
import TenantController from '../controllers/tenant.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = express.Router()

/**
 * @route GET /api/tenant/projects
 * @desc Get user's accessible projects (tenant-scoped)
 * @access Private (requires authentication)
 */
router.get('/projects', authenticateToken, TenantController.getProjects)

/**
 * @route GET /api/tenant/cities
 * @desc Get user's accessible cities (tenant-scoped)
 * @access Private (requires authentication)
 */
router.get('/cities', authenticateToken, TenantController.getCities)

/**
 * @route GET /api/tenant/projects/:projectId/cities
 * @desc Get cities available for user's accessible projects (tenant-scoped)
 * @access Private (requires authentication)
 */
router.get('/projects/:projectId/cities', authenticateToken, TenantController.getCitiesForProject)

/**
 * @route GET /api/tenant/cities/:cityName/projects
 * @desc Get projects available in user's accessible cities (tenant-scoped)
 * @access Private (requires authentication)
 */
router.get('/cities/:cityName/projects', authenticateToken, TenantController.getProjectsForCity)

/**
 * @route GET /api/tenant/validate
 * @desc Validate project-city combination (user-scoped)
 * @query projectId, cityName
 * @access Private (requires authentication)
 */
router.get('/validate', authenticateToken, TenantController.validateProjectCity)

/**
 * @route GET /api/tenant/context
 * @desc Get user's tenant context
 * @query projectId, cityName
 * @access Private (requires authentication)
 */
router.get('/context', authenticateToken, TenantController.getTenantContext)

export default router