type AuthMethod = 'password' | 'email_code'

function readHeader(req: any, name: string): string {
  const key = name.toLowerCase()
  const headers = req?.headers
  if (!headers) return ''

  if (typeof headers.get === 'function') {
    return headers.get(name) || headers.get(key) || ''
  }

  if (typeof headers === 'object') {
    return headers[key] || headers[name] || ''
  }

  return ''
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera'
  if (ua.includes('chrome/')) return 'Chrome'
  if (ua.includes('firefox/')) return 'Firefox'
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari'
  return 'Desconocido'
}

function detectOs(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS'
  if (ua.includes('mac os')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  return 'Desconocido'
}

function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'Movil'
  return 'Desktop'
}

export function getLoginContext(req: any, method: AuthMethod) {
  const forwardedFor = readHeader(req, 'x-forwarded-for')
  const ip = (
    forwardedFor.split(',')[0]?.trim() ||
    readHeader(req, 'x-real-ip') ||
    readHeader(req, 'cf-connecting-ip') ||
    readHeader(req, 'x-nf-client-connection-ip') ||
    ''
  )

  const userAgent = readHeader(req, 'user-agent')
  const country =
    readHeader(req, 'x-vercel-ip-country') ||
    readHeader(req, 'cf-ipcountry') ||
    readHeader(req, 'x-nf-geo-country') ||
    readHeader(req, 'x-nf-country') ||
    ''

  const city =
    readHeader(req, 'x-vercel-ip-city') ||
    readHeader(req, 'x-nf-geo-city') ||
    readHeader(req, 'x-nf-city') ||
    ''

  return {
    ip,
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
    device: detectDevice(userAgent),
    country,
    city,
    authMethod: method,
  }
}
