import { Request } from 'express'
import { UserRole } from '../types'

/**
 * Determines the effective city scope for a request.
 * - If a `cityId` query param is present and the user is Manager or above, use it (cross-city allowed).
 * - If the user is below Manager, fall back to their own `user.cityId`.
 * - If no authenticated user (shouldn't happen on protected routes), returns undefined.
 */
export function getEffectiveCityId(req: Request): string | undefined {
  const user = (req as any).user as { role: UserRole; cityId?: string } | undefined
  const cityIdFromQuery = (req.query?.cityId as string) || undefined
  const isSuperAdmin = !!user && user.role === UserRole.SUPER_ADMIN

  if (isSuperAdmin) {
    return cityIdFromQuery || undefined
  }

  return user?.cityId || undefined
}
