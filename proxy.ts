import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Rate limiting ─────────────────────────────────────────────────────────────
const store = new Map<string, { count: number; resetAt: number }>()

const LIMITS: [string, { max: number; windowMs: number }][] = [
  ['/api/upload',                    { max: 15,  windowMs: 60_000 }],
  ['/api/auth/callback/credentials', { max: 8,   windowMs: 60_000 }],
  ['/api/auth',                      { max: 20,  windowMs: 60_000 }],
  ['/api/posts',                     { max: 10,  windowMs: 60_000 }],
  ['/api/comments',                  { max: 20,  windowMs: 60_000 }],
  ['/api/groups',                    { max: 60,  windowMs: 60_000 }],
  ['/api/',                          { max: 120, windowMs: 60_000 }],
]

function getLimit(pathname: string) {
  for (const [prefix, limit] of LIMITS) {
    if (pathname.startsWith(prefix)) return limit
  }
  return { max: 120, windowMs: 60_000 }
}

function getIP(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anon'
  )
}

let pruneCounter = 0
function maybePrune() {
  if (++pruneCounter % 500 !== 0) return
  const now = Date.now()
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key)
  }
}

function checkRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/api/')) return null

  const ip     = getIP(req)
  const limit  = getLimit(pathname)
  const bucket = pathname.split('/').slice(0, 4).join('/')
  const key    = `${ip}|${bucket}`
  const now    = Date.now()

  maybePrune()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + limit.windowMs })
    return null
  }

  if (entry.count >= limit.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(retryAfter),
          'X-RateLimit-Limit':     String(limit.max),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  entry.count++
  return null
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  return res
}

// ── Main proxy ────────────────────────────────────────────────────────────────
export default async function proxy(req: NextRequest) {
  // 1. Rate limit check
  const limited = checkRateLimit(req)
  if (limited) return limited

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // 2. Public routes — pass through
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/uploads')
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  // 3. Auth guard — redirect to login if no session
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|public).*)'],
}
