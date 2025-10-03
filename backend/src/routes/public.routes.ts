import express from 'express'
import PublicController from '../controllers/public.controller'

const router = express.Router()

/**
 * @route GET /api/public/projects
 * @desc Get minimal project list for login form dropdown
 * @access Public (login form only)
 */
router.get('/projects', PublicController.getProjectsForLogin)

/**
 * @route GET /api/public/cities
 * @desc Get minimal city list for login form dropdown
 * @access Public (login form only)
 */
router.get('/cities', PublicController.getCitiesForLogin)

/**
 * @route GET /api/public/projects/:projectId/cities
 * @desc Get cities available for a specific project (login form)
 * @access Public (login form validation)
 */
router.get('/projects/:projectId/cities', PublicController.getCitiesForProjectLogin)

/**
 * @route GET /api/public/validate-combo
 * @desc Validate if project-city combination exists (login form)
 * @query projectId, cityName
 * @access Public (login form validation only)
 */
router.get('/validate-combo', PublicController.validateProjectCityCombo)

export default router