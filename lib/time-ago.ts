export function timeAgo(date: string | Date): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}
