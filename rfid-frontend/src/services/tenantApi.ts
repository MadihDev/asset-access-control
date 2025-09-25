import api from './api'

export type Project = { id: string; name: string; slug: string; isActive: boolean }
export type City = { id: string; name: string; country: string; isActive: boolean }

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get('/api/project')
  return data.data as Project[]
}

export async function fetchCitiesByProject(project: string): Promise<City[]> {
  const { data } = await api.get(`/api/project/${project}/cities`)
  return data.data as City[]
}
