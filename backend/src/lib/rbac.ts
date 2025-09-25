import { UserRole } from '../types'

const roleRank: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.SUPERVISOR]: 2,
  [UserRole.USER]: 1
}

export function isRoleAtLeast(role: UserRole, required: UserRole): boolean {
  return roleRank[role] >= roleRank[required]
}

export function canManage(targetRole: UserRole, actorRole: UserRole): boolean {
  // Actor can manage users with lower rank; only ADMIN can manage ADMIN
  if (targetRole === UserRole.ADMIN) return actorRole === UserRole.ADMIN
  return roleRank[actorRole] > roleRank[targetRole]
}
