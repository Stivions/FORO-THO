import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function addSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  return res
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/') {
    return addSecurityHeaders(NextResponse.next())
  }

  const url = req.nextUrl.clone()
  url.pathname = '/'
  url.search = ''
  return addSecurityHeaders(NextResponse.redirect(url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:gif|png|jpg|jpeg|svg|webp|ico|mp4|webm|mp3|ogg|wav|woff|woff2|ttf|otf)).*)'],
}
