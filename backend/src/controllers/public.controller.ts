import { Request, Response } from 'express'
import TenantService from '../services/tenant.service'

/**
 * Public Controller - Minimal data exposure for login form only
 * NO AUTHENTICATION REQUIRED - Use carefully and expose minimal data only
 */
class PublicController {
  /**
   * Get minimal project list for login form dropdown
   * @route GET /api/public/projects
   */
  async getProjectsForLogin(req: Request, res: Response): Promise<void> {
    try {
      const projects = await TenantService.getProjectsForLogin()
      
      res.status(200).json({
        success: true,
        data: projects,
        message: 'Projects retrieved for login form'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve projects'
      })
    }
  }

  /**
   * Get minimal city list for login form dropdown
   * @route GET /api/public/cities
   */
  async getCitiesForLogin(req: Request, res: Response): Promise<void> {
    try {
      const cities = await TenantService.getCitiesForLogin()
      
      res.status(200).json({
        success: true,
        data: cities,
        message: 'Cities retrieved for login form'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve cities'
      })
    }
  }

  /**
   * Get cities available for a specific project (login form)
   * @route GET /api/public/projects/:projectId/cities
   */
  async getCitiesForProjectLogin(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        })
        return
      }

      const cities = await TenantService.getCitiesForProjectLogin(projectId)
      
      res.status(200).json({
        success: true,
        data: cities,
        message: `Cities retrieved for project ${projectId}`
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve cities for project'
      })
    }
  }

  /**
   * Validate if project-city combination exists (login form validation)
   * @route GET /api/public/validate-combo
   */
  async validateProjectCityCombo(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, cityName } = req.query

      if (!projectId || !cityName) {
        res.status(400).json({
          success: false,
          error: 'Both projectId and cityName are required'
        })
        return
      }

      const isValid = await TenantService.validateProjectCityComboPublic(
        projectId as string, 
        cityName as string
      )
      
      res.status(200).json({
        success: true,
        data: { 
          isValid,
          projectId,
          cityName
        },
        message: isValid ? 'Valid combination' : 'Invalid combination'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate combination'
      })
    }
  }
}

export default new PublicController()