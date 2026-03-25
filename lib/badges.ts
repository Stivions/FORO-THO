export type BadgeId =
  | 'verified'
  | 'first_user'
  | 'premium'
  | 'staff'
  | 'moderator'
  | 'top_contributor'

export const BADGES: Record<BadgeId, { label: string; emoji: string; color: string; description: string }> = {
  verified:        { label: 'Verificado',         emoji: '✓',  color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',          description: 'Cuenta verificada' },
  first_user:      { label: 'Primer Usuario',     emoji: '★',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',  description: 'Uno de los primeros en unirse' },
  premium:         { label: 'Premium',            emoji: '💎', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',  description: 'Miembro premium' },
  staff:           { label: 'Staff',              emoji: '⚡', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',  description: 'Miembro del equipo' },
  moderator:       { label: 'Moderador',          emoji: '🛡',  color: 'bg-green-500/20 text-green-400 border-green-500/30',    description: 'Modera el foro' },
  top_contributor: { label: 'Top Contribuidor',   emoji: '🔥', color: 'bg-red-500/20 text-red-400 border-red-500/30',          description: 'Contribuidor destacado' },
}

export const ALL_BADGE_IDS = Object.keys(BADGES) as BadgeId[]
