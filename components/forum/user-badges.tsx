import { BADGES, type BadgeId } from '@/lib/badges'
import { cn } from '@/lib/utils'

interface UserBadgesProps {
  badges?: string[]
  size?: 'sm' | 'md'
  className?: string
}

export function UserBadges({ badges, size = 'sm', className }: UserBadgesProps) {
  if (!badges || badges.length === 0) return null

  // Show verified first, then bot, then others
  const sorted = [...badges].sort((a, b) => {
    const order = ['verified', 'bot', 'staff', 'moderator', 'premium', 'top_contributor', 'first_user']
    return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
  })

  return (
    <span className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
      {sorted.map(b => {
        const badge = BADGES[b as BadgeId]
        if (!badge) return null

        // Verified gets special Twitter-style treatment
        if (b === 'verified') {
          return (
            <span
              key={b}
              title="Cuenta verificada"
              className={cn(
                'inline-flex items-center justify-center rounded-full font-bold bg-sky-500 text-white',
                size === 'sm' ? 'h-3.5 w-3.5 text-[9px]' : 'h-4.5 w-4.5 text-[10px]'
              )}
            >
              ✓
            </span>
          )
        }

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
