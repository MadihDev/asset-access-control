import { Request, Response } from 'express'
import TenantService from '../services/tenant.service'

/**
 * Tenant Controller - User-Scoped Multi-Tenant Operations
 * ALL METHODS REQUIRE AUTHENTICATION AND FILTER BY USER'S TENANT SCOPE
 */
class TenantController {
  /**
   * Get user's accessible projects (tenant-scoped)
   * @route GET /api/tenant/projects
   * @access Private
   */
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      // Extract user context from JWT token (added by authenticateToken middleware)
      const user = req.user
      if (!user || !user.projectCityId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or no tenant scope'
        })
        return
      }

      const projects = await TenantService.getProjectsForUser(user.projectCityId)
      
      res.status(200).json({
        success: true,
        data: projects,
        message: 'User projects retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user projects'
      })
    }
  }

  /**
   * Get user's accessible cities (tenant-scoped)
   * @route GET /api/tenant/cities
   * @access Private
   */
  async getCities(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user
      if (!user || !user.projectCityId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or no tenant scope'
        })
        return
      }

      const cities = await TenantService.getCitiesForUser(user.projectCityId)
      
      res.status(200).json({
        success: true,
        data: cities,
        message: 'User cities retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user cities'
      })
    }
  }

  /**
   * Get cities available for user's accessible projects (tenant-scoped)
   * @route GET /api/tenant/projects/:projectId/cities
   * @access Private
   */
  async getCitiesForProject(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user
      if (!user || !user.projectCityId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or no tenant scope'
        })
        return
      }

      const { projectId } = req.params
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project identifier is required'
        })
        return
      }

      // Validate user has access to this project
      const userProjects = await TenantService.getProjectsForUser(user.projectCityId)
      const hasProjectAccess = userProjects.some(p => p.slug === projectId || p.id === projectId)
      
      if (!hasProjectAccess) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Project not in user tenant scope'
        })
        return
      }

      const cities = await TenantService.getCitiesForUser(user.projectCityId)
      
      res.status(200).json({
        success: true,
        data: cities,
        message: 'Cities for project retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cities for project'
      })
    }
  }

  /**
   * Get projects available in user's accessible cities (tenant-scoped)
   * @route GET /api/tenant/cities/:cityName/projects
   * @access Private
   */
  async getProjectsForCity(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user
      if (!user || !user.projectCityId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or no tenant scope'
        })
        return
      }

      const { cityName } = req.params
      
      if (!cityName) {
        res.status(400).json({
          success: false,
          error: 'City name is required'
        })
        return
      }

      // Validate user has access to this city
      const userCities = await TenantService.getCitiesForUser(user.projectCityId)
      const hasCityAccess = userCities.some(c => c.name.toLowerCase() === decodeURIComponent(cityName).toLowerCase())
      
      if (!hasCityAccess) {
        res.status(403).json({
          success: false,
          error: 'Access denied: City not in user tenant scope'
        })
        return
      }

      const projects = await TenantService.getProjectsForUser(user.projectCityId)
      
      res.status(200).json({
        success: true,
        data: projects,
        message: 'User projects for city retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user projects for city'
      })
    }
  }

  /**
   * Validate project-city combination (user-scoped)
   * @route GET /api/tenant/validate
   * @access Private
   */
  async validateProjectCity(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user
      if (!user || !user.projectCityId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or no tenant scope'
        })
        return
      }

      const { projectId, cityName } = req.query

      if (!projectId || !cityName) {
        res.status(400).json({
          success: false,
          error: 'Both projectId and cityName are required'
        })
        return
      }

      // Validate user has access to this combination
      const hasAccess = await TenantService.validateUserTenantAccess(
        user.projectCityId,
        projectId as string,
        cityName as string
      )
      
      res.status(200).json({
        success: true,
        data: { isValid: hasAccess },
        message: hasAccess ? 'Valid combination for user' : 'Access denied or invalid combination'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate project-city combination'
      })
    }
  }

  /**
   * Get user's tenant context
   * @route GET /api/tenant/context
   * @access Private
   */
  async getTenantContext(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user
      if (!user || !user.projectCityId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or no tenant scope'
        })
        return
      }

      // Option 1: Get user's own tenant context (no parameters needed)
      if (!req.query.projectId && !req.query.cityName) {
        const tenantContext = await TenantService.getUserTenantContext(user.projectCityId)
        
        if (!tenantContext) {
          res.status(404).json({
            success: false,
            error: 'User tenant context not found'
          })
          return
        }
        
        res.status(200).json({
          success: true,
          data: tenantContext,
          message: 'User tenant context retrieved successfully'
        })
        return
      }

      // Option 2: Validate specific project-city against user's access
      const { projectId, cityName } = req.query

      if (!projectId || !cityName) {
        res.status(400).json({
          success: false,
          error: 'Both projectId and cityName are required for validation'
        })
        return
      }

      // Validate user has access to requested combination
      const hasAccess = await TenantService.validateUserTenantAccess(
        user.projectCityId,
        projectId as string,
        cityName as string
      )
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Requested combination not in user tenant scope'
        })
        return
      }

      const tenantContext = await TenantService.getUserTenantContext(user.projectCityId)

      if (!tenantContext) {
        res.status(404).json({
          success: false,
          error: 'Tenant context not found'
        })
        return
      }
      
      res.status(200).json({
        success: true,
        data: tenantContext,
        message: 'Tenant context retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tenant context'
      })
    }
  }
}

export default new TenantController()