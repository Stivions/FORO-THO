export function getRequestBaseUrl(req: Request): string {
  const origin = req.headers.get('origin')
  if (origin) return origin

  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) return `${proto}://${host}`

  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
}
