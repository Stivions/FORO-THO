import crypto from 'crypto'

export type AuthCodePurpose = 'login' | 'register'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeUsername(username: string): string {
  return username.trim()
}

export function generateAuthCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashAuthCode(email: string, code: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-auth-code-secret'
  return crypto
    .createHmac('sha256', secret)
    .update(`${normalizeEmail(email)}:${code}`)
    .digest('hex')
}

export function maskEmail(email: string): string {
  const [name, domain] = normalizeEmail(email).split('@')
  if (!name || !domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`
}
