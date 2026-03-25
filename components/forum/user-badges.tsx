import { BADGES, type BadgeId } from '@/lib/badges'
import { cn } from '@/lib/utils'

interface UserBadgesProps {
  badges?: string[]
  size?: 'sm' | 'md'
  className?: string
}

export function UserBadges({ badges, size = 'sm', className }: UserBadgesProps) {
  if (!badges || badges.length === 0) return null

  return (
    <span className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
      {badges.map(b => {
        const badge = BADGES[b as BadgeId]
        if (!badge) return null
        return (
          <span
            key={b}
            title={badge.description}
            className={cn(
              'inline-flex items-center gap-0.5 border rounded-full font-medium',
              badge.color,
              size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
            )}
          >
            <span>{badge.emoji}</span>
            {size === 'md' && <span>{badge.label}</span>}
          </span>
        )
      })}
    </span>
  )
}
