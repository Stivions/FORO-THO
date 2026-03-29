import { Category } from '@/models/Category'
import { VIP_CATEGORIES } from './categories'

export type Role = 'user' | 'moderator' | 'admin'
export type CategoryVisibility = 'public' | 'vip' | 'staff' | 'admin'
export type CategoryPostAccess = 'all' | 'vip' | 'staff' | 'admin'

export interface AccessUserLike {
  role?: string
  vip?: boolean
  vipExpiresAt?: Date | string | null
}

const VIP_CATEGORY_SET = new Set<string>(VIP_CATEGORIES as readonly string[])

export function isVipActive(user?: AccessUserLike | null) {
  if (!user?.vip) return false
  if (!user.vipExpiresAt) return true
  return new Date(user.vipExpiresAt) > new Date()
}

export function normalizeRole(role?: string): Role {
  if (role === 'admin' || role === 'moderator') return role
  return 'user'
}

function hasLevel(role: Role, required: 'staff' | 'admin') {
  if (required === 'admin') return role === 'admin'
  return role === 'admin' || role === 'moderator'
}

export function canReadCategory(
  category: { visibility?: CategoryVisibility; name?: string } | null | undefined,
  user?: AccessUserLike | null
) {
  const role = normalizeRole(user?.role)
  const isVip = isVipActive(user)
  const visibility = category?.visibility || (category?.name && VIP_CATEGORY_SET.has(category.name) ? 'vip' : 'public')

  if (visibility === 'public') return true
  if (visibility === 'vip') return isVip || role === 'admin' || role === 'moderator'
  if (visibility === 'staff') return hasLevel(role, 'staff')
  return hasLevel(role, 'admin')
}

export function canPostInCategory(
  category: { visibility?: CategoryVisibility; postAccess?: CategoryPostAccess; name?: string } | null | undefined,
  user?: AccessUserLike | null
) {
  if (!canReadCategory(category, user)) return false

  const role = normalizeRole(user?.role)
  const isVip = isVipActive(user)
  const postAccess = category?.postAccess || (category?.name && VIP_CATEGORY_SET.has(category.name) ? 'vip' : 'all')

  if (postAccess === 'all') return true
  if (postAccess === 'vip') return isVip || role === 'admin' || role === 'moderator'
  if (postAccess === 'staff') return hasLevel(role, 'staff')
  return hasLevel(role, 'admin')
}

export async function getCategoryConfigByName(name: string) {
  const category = await Category.findOne({ name }).select('name visibility postAccess').lean()
  if (category) return category as any

  if (VIP_CATEGORY_SET.has(name)) {
    return { name, visibility: 'vip' as const, postAccess: 'vip' as const }
  }

  return null
}
