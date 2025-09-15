import { UserRole } from '../types'

const roleRank: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPERVISOR]: 2,
  [UserRole.USER]: 1
}

export function isRoleAtLeast(role: UserRole, required: UserRole): boolean {
  return roleRank[role] >= roleRank[required]
}

export function canManage(targetRole: UserRole, actorRole: UserRole): boolean {
  // Actor can manage users with lower rank; only SUPER_ADMIN can manage SUPER_ADMIN
  if (targetRole === UserRole.SUPER_ADMIN) return actorRole === UserRole.SUPER_ADMIN
  return roleRank[actorRole] > roleRank[targetRole]
}
