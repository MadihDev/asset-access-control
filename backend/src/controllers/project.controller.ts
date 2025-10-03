import prisma from '../lib/prisma'
import { Request, Response } from 'express'
import { getEffectiveProjectCityId } from '../lib/scope'

class ProjectController {
  async list(req: Request, res: Response) {
    try {
      // Check if user is authenticated
      const actor = (req as any).enhancedAuth?.user || (req as any).user
      
      if (actor) {
        // AUTHENTICATED USER: Return projects based on tenant isolation
        const effectiveProjectCityId = getEffectiveProjectCityId(req)
        
        if (!effectiveProjectCityId) {
          return res.status(403).json({ success: false, error: 'Access restricted to project context' })
        }

        // Get the user's project through their project-city relationship
        const userProjectCity = await prisma.projectCity.findUnique({
          where: { id: effectiveProjectCityId },
          include: { 
            project: { 
              where: { isActive: true } 
            } 
          }
        })

        if (!userProjectCity || !userProjectCity.project) {
          return res.status(404).json({ success: false, error: 'No accessible projects found' })
        }

        // Return only the user's project to enforce tenant isolation
        const projects = [userProjectCity.project]
        res.json({ success: true, data: projects })
      } else {
        // UNAUTHENTICATED USER: Return all active projects for tenant selection
        // This allows the frontend TenantContext to load projects for initial selection
        const projects = await prisma.project.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        })
        
        res.json({ success: true, data: projects })
      }
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Failed to load projects' })
    }
  }

  async getCities(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      
      // Find project by ID or slug
      const project = await prisma.project.findFirst({
        where: { 
          OR: [{ id: projectId }, { slug: projectId }], 
          isActive: true 
        },
        select: { id: true }
      })

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' })
      }

      // Get cities linked to this project
      const projectCities = await prisma.projectCity.findMany({
        where: { projectId: project.id },
        include: { city: true }
      })

      const cities = projectCities
        .filter((pc: any) => pc.city.isActive)
        .map((pc: any) => pc.city)
        .sort((a: any, b: any) => a.name.localeCompare(b.name))

      res.json({ success: true, data: cities })
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Failed to load cities' })
    }
  }
}

export default new ProjectController()
