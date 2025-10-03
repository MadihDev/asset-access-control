import prisma from '../lib/prisma'
import logger from '../lib/logger'

export interface Project {
  id: string
  name: string
  slug: string
  isActive: boolean
}

export interface City {
  id: string
  name: string
  country: string
  isActive: boolean
}

export interface ProjectCity {
  id: string
  projectId: string
  cityId: string
  project: Project
  city: City
}

export interface TenantContext {
  projectCityId: string
  project: Project
  city: City
}

class TenantService {
  /**
   * Resolve tenant context from project name/slug and city name
   */
  async resolveProjectCity(
    projectIdentifier: string, 
    cityName: string
  ): Promise<TenantContext | null> {
    try {
      const projectCity = await prisma.projectCity.findFirst({
        where: {
          project: {
            OR: [
              { name: { equals: projectIdentifier, mode: 'insensitive' } },
              { slug: { equals: projectIdentifier, mode: 'insensitive' } }
            ],
            isActive: true
          },
          city: {
            name: { equals: cityName, mode: 'insensitive' },
            isActive: true
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          },
          city: {
            select: {
              id: true,
              name: true,
              country: true,
              isActive: true
            }
          }
        }
      })

      if (!projectCity) {
        return null
      }

      return {
        projectCityId: projectCity.id,
        project: projectCity.project,
        city: projectCity.city
      }
    } catch (error) {
      logger.error('Error resolving project-city context:', error)
      throw new Error('Failed to resolve tenant context')
    }
  }

  /**
   * Get all projects available in a specific city
   */
  async getProjectsForCity(cityName: string): Promise<Project[]> {
    try {
      const projectCities = await prisma.projectCity.findMany({
        where: {
          city: {
            name: { equals: cityName, mode: 'insensitive' },
            isActive: true
          },
          project: {
            isActive: true
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          }
        },
        orderBy: {
          project: {
            name: 'asc'
          }
        }
      })

      return projectCities.map((pc: any) => pc.project)
    } catch (error) {
      logger.error('Error getting projects for city:', error)
      throw new Error('Failed to get projects for city')
    }
  }

  /**
   * Get all cities available for a specific project
   */
  async getCitiesForProject(projectIdentifier: string): Promise<City[]> {
    try {
      const projectCities = await prisma.projectCity.findMany({
        where: {
          project: {
            OR: [
              { name: { equals: projectIdentifier, mode: 'insensitive' } },
              { slug: { equals: projectIdentifier, mode: 'insensitive' } }
            ],
            isActive: true
          },
          city: {
            isActive: true
          }
        },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              country: true,
              isActive: true
            }
          }
        },
        orderBy: {
          city: {
            name: 'asc'
          }
        }
      })

      return projectCities.map((pc: any) => pc.city)
    } catch (error) {
      logger.error('Error getting cities for project:', error)
      throw new Error('Failed to get cities for project')
    }
  }

  /**
   * Get all available projects
   */
  async getAllProjects(): Promise<Project[]> {
    try {
      const projects = await prisma.project.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      })

      return projects
    } catch (error) {
      logger.error('Error getting all projects:', error)
      throw new Error('Failed to get all projects')
    }
  }

  /**
   * Get all available cities
   */
  async getAllCities(): Promise<City[]> {
    try {
      const cities = await prisma.city.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          country: true,
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      })

      return cities
    } catch (error) {
      logger.error('Error getting all cities:', error)
      throw new Error('Failed to get all cities')
    }
  }

  /**
   * Validate if a project-city combination exists and is active
   */
  async validateProjectCityCombo(
    projectIdentifier: string, 
    cityName: string
  ): Promise<boolean> {
    try {
      const tenantContext = await this.resolveProjectCity(projectIdentifier, cityName)
      return tenantContext !== null
    } catch (error) {
      logger.error('Error validating project-city combination:', error)
      return false
    }
  }

  /**
   * Get tenant context by projectCityId
   */
  async getTenantContext(projectCityId: string): Promise<TenantContext | null> {
    try {
      const projectCity = await prisma.projectCity.findUnique({
        where: { id: projectCityId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          },
          city: {
            select: {
              id: true,
              name: true,
              country: true,
              isActive: true
            }
          }
        }
      })

      if (!projectCity || !projectCity.project.isActive || !projectCity.city.isActive) {
        return null
      }

      return {
        projectCityId: projectCity.id,
        project: projectCity.project,
        city: projectCity.city
      }
    } catch (error) {
      logger.error('Error getting tenant context:', error)
      throw new Error('Failed to get tenant context')
    }
  }

  // ========================================
  // PUBLIC METHODS (For Login Form Only - Minimal Data Exposure)
  // ========================================

  /**
   * Get minimal project list for login form dropdown
   * PUBLIC ACCESS - Returns only essential data for login form
   */
  async getProjectsForLogin(): Promise<{ id: string; name: string; slug: string }[]> {
    try {
      const projects = await prisma.project.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true
        },
        orderBy: { name: 'asc' }
      })

      logger.info(`Retrieved ${projects.length} projects for login form`)
      return projects
    } catch (error) {
      logger.error('Error retrieving projects for login:', error)
      throw new Error('Failed to retrieve projects')
    }
  }

  /**
   * Get minimal city list for login form dropdown
   * PUBLIC ACCESS - Returns only essential data for login form
   */
  async getCitiesForLogin(): Promise<{ id: string; name: string; country: string }[]> {
    try {
      const cities = await prisma.city.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          country: true
        },
        orderBy: { name: 'asc' }
      })

      logger.info(`Retrieved ${cities.length} cities for login form`)
      return cities
    } catch (error) {
      logger.error('Error retrieving cities for login:', error)
      throw new Error('Failed to retrieve cities')
    }
  }

  /**
   * Get cities available for a specific project (login form)
   * PUBLIC ACCESS - Returns only cities that have project combinations
   */
  async getCitiesForProjectLogin(projectIdentifier: string): Promise<{ id: string; name: string; country: string }[]> {
    try {
      const cities = await prisma.city.findMany({
        where: {
          isActive: true,
          projectCities: {
            some: {
              project: {
                OR: [
                  { name: { equals: projectIdentifier, mode: 'insensitive' } },
                  { slug: { equals: projectIdentifier, mode: 'insensitive' } }
                ],
                isActive: true
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          country: true
        },
        orderBy: { name: 'asc' }
      })

      logger.info(`Retrieved ${cities.length} cities for project ${projectIdentifier} (login form)`)
      return cities
    } catch (error) {
      logger.error(`Error retrieving cities for project ${projectIdentifier}:`, error)
      throw new Error('Failed to retrieve cities for project')
    }
  }

  /**
   * Validate if project-city combination exists (login form validation)
   * PUBLIC ACCESS - Returns only boolean validation result
   */
  async validateProjectCityComboPublic(projectIdentifier: string, cityName: string): Promise<boolean> {
    try {
      const projectCity = await prisma.projectCity.findFirst({
        where: {
          project: {
            OR: [
              { name: { equals: projectIdentifier, mode: 'insensitive' } },
              { slug: { equals: projectIdentifier, mode: 'insensitive' } }
            ],
            isActive: true
          },
          city: {
            name: { equals: cityName, mode: 'insensitive' },
            isActive: true
          }
        }
      })

      const isValid = !!projectCity
      logger.info(`Project-city validation for ${projectIdentifier}/${cityName}: ${isValid}`)
      return isValid
    } catch (error) {
      logger.error(`Error validating project-city combo ${projectIdentifier}/${cityName}:`, error)
      return false
    }
  }

  // ========================================
  // USER-SCOPED METHODS (For Authenticated Business Logic)
  // ========================================

  /**
   * Get projects accessible by user's tenant scope
   * PRIVATE ACCESS - Requires authentication and filters by user's projectCityId
   */
  async getProjectsForUser(userProjectCityId: string): Promise<Project[]> {
    try {
      const projectCities = await prisma.projectCity.findMany({
        where: { 
          id: userProjectCityId
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          }
        }
      })

      const projects = projectCities.map(pc => pc.project)
      logger.info(`Retrieved ${projects.length} projects for user tenant ${userProjectCityId}`)
      return projects
    } catch (error) {
      logger.error(`Error retrieving projects for user tenant ${userProjectCityId}:`, error)
      throw new Error('Failed to retrieve user projects')
    }
  }

  /**
   * Get cities accessible by user's tenant scope
   * PRIVATE ACCESS - Requires authentication and filters by user's projectCityId
   */
  async getCitiesForUser(userProjectCityId: string): Promise<City[]> {
    try {
      const projectCities = await prisma.projectCity.findMany({
        where: { 
          id: userProjectCityId
        },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              country: true,
              isActive: true
            }
          }
        }
      })

      const cities = projectCities.map(pc => pc.city)
      logger.info(`Retrieved ${cities.length} cities for user tenant ${userProjectCityId}`)
      return cities
    } catch (error) {
      logger.error(`Error retrieving cities for user tenant ${userProjectCityId}:`, error)
      throw new Error('Failed to retrieve user cities')
    }
  }

  /**
   * Get user's tenant context (only their own)
   * PRIVATE ACCESS - Returns only the user's own tenant context
   */
  async getUserTenantContext(userProjectCityId: string): Promise<TenantContext | null> {
    try {
      const projectCity = await prisma.projectCity.findUnique({
        where: { id: userProjectCityId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          },
          city: {
            select: {
              id: true,
              name: true,
              country: true,
              isActive: true
            }
          }
        }
      })

      if (!projectCity) {
        logger.warn(`No tenant context found for user projectCityId: ${userProjectCityId}`)
        return null
      }

      const context: TenantContext = {
        projectCityId: projectCity.id,
        project: projectCity.project,
        city: projectCity.city
      }

      logger.info(`Retrieved tenant context for user: ${projectCity.project.name}/${projectCity.city.name}`)
      return context
    } catch (error) {
      logger.error(`Error retrieving user tenant context ${userProjectCityId}:`, error)
      return null
    }
  }

  /**
   * Validate if user has access to specific project-city combination
   * PRIVATE ACCESS - Only validates against user's own tenant scope
   */
  async validateUserTenantAccess(
    userProjectCityId: string, 
    projectIdentifier: string, 
    cityName: string
  ): Promise<boolean> {
    try {
      const userContext = await this.getUserTenantContext(userProjectCityId)
      if (!userContext) {
        return false
      }

      const requestedContext = await this.resolveProjectCity(projectIdentifier, cityName)
      if (!requestedContext) {
        return false
      }

      // User can only access their own tenant
      const hasAccess = userContext.projectCityId === requestedContext.projectCityId
      
      logger.info(`User tenant access validation: ${hasAccess} for ${projectIdentifier}/${cityName}`)
      return hasAccess
    } catch (error) {
      logger.error(`Error validating user tenant access:`, error)
      return false
    }
  }
}

export default new TenantService()