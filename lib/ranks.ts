export interface Rank {
  name: string
  min: number
  max: number
  color: string
  glow: string
  icon: string
  next: number | null
  progress: number
}

const RANK_DEFS = [
  { name: 'NOVATO',    min: 0,     max: 499,      color: '#888888', glow: '#88888840', icon: '◈' },
  { name: 'BRONCE',    min: 500,   max: 999,      color: '#cd7f32', glow: '#cd7f3240', icon: '⬡' },
  { name: 'PLATA',     min: 1000,  max: 1499,     color: '#c0c0c0', glow: '#c0c0c040', icon: '◆' },
  { name: 'ORO',       min: 1500,  max: 1999,     color: '#ffd700', glow: '#ffd70040', icon: '★' },
  { name: 'DIAMANTE',  min: 2000,  max: 2999,     color: '#00d4ff', glow: '#00d4ff40', icon: '◈' },
  { name: 'LEYENDA',   min: 3000,  max: 4999,     color: '#c77dff', glow: '#c77dff40', icon: '⬟' },
  { name: 'HISTÓRICO', min: 5000,  max: 9999,     color: '#ff6a00', glow: '#ff6a0040', icon: '⬢' },
  { name: 'SUPREMO',   min: 10000, max: Infinity, color: '#ff003c', glow: '#ff003c40', icon: '✦' },
]

export function getRank(points: number): Rank {
  const pts = Math.max(0, points)
  const def = RANK_DEFS.find(r => pts >= r.min && pts <= r.max) ?? RANK_DEFS[0]
  const next = def.max === Infinity ? null : def.max + 1
  const progress = next
    ? Math.min(100, Math.round(((pts - def.min) / (next - def.min)) * 100))
    : 100

  return { ...def, next, progress }
}

export function getNextRank(points: number): { name: string; needed: number } | null {
  const pts = Math.max(0, points)
  const idx = RANK_DEFS.findIndex(r => pts >= r.min && pts <= r.max)
  if (idx === -1 || idx === RANK_DEFS.length - 1) return null
  const next = RANK_DEFS[idx + 1]
  return { name: next.name, needed: next.min - pts }
}
