import prisma from '../lib/prisma'
import { Request, Response } from 'express'

class ProjectController {
  async list(_req: Request, res: Response) {
    try {
      const projects = await prisma.project.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      res.json({ success: true, data: projects })
    } catch {
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
