import crypto from 'crypto'

const VT_KEY  = process.env.VIRUSTOTAL_API_KEY ?? ''
const VT_BASE = 'https://www.virustotal.com/api/v3'

export type VTStatus = 'clean' | 'malicious' | 'suspicious' | 'unknown' | 'scanning'

export interface VTResult {
  status:     VTStatus
  malicious:  number
  suspicious: number
  total:      number
  sha256:     string
  permalink?: string
  analysisId?: string
  scannedAt:  string // ISO string, safe to store in MongoDB
}

export function sha256hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function vtFetch(path: string, init?: RequestInit): Promise<any | null> {
  if (!VT_KEY) return null
  try {
    const res = await fetch(`${VT_BASE}${path}`, {
      ...init,
      headers: { 'x-apikey': VT_KEY, ...((init?.headers as object) ?? {}) },
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function parseReport(data: any, sha256: string): VTResult {
  const stats      = data.attributes?.last_analysis_stats ?? {}
  const malicious  = (stats.malicious  ?? 0) as number
  const suspicious = (stats.suspicious ?? 0) as number
  const total      = Object.values(stats).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number

  const status: VTStatus =
    malicious  > 0  ? 'malicious'  :
    suspicious > 2  ? 'suspicious' :
    'clean'

  return {
    status, malicious, suspicious, total, sha256,
    permalink:  `https://www.virustotal.com/gui/file/${sha256}`,
    scannedAt:  new Date().toISOString(),
  }
}

/** Check if hash is already known to VT (1 API lookup) */
async function checkHash(sha256: string): Promise<VTResult | null> {
  const data = await vtFetch(`/files/${sha256}`)
  if (!data?.data) return null
  return parseReport(data.data, sha256)
}

/** Submit file bytes for scanning — only for files ≤32 MB */
async function submitFile(buffer: Buffer, filename: string, sha256: string): Promise<VTResult | null> {
  if (buffer.length > 32 * 1024 * 1024) return null

  const form = new FormData()
  form.append('file', new Blob([buffer]), filename)

  const data = await vtFetch('/files', { method: 'POST', body: form })
  if (!data?.data?.id) return null

  return {
    status: 'scanning',
    malicious: 0, suspicious: 0, total: 0,
    sha256,
    analysisId: data.data.id,
    scannedAt:  new Date().toISOString(),
  }
}

/**
 * Main entry: check hash first (fast), then submit if unknown.
 * Never throws — returns 'unknown' if VT is unavailable.
 */
export async function scanBuffer(buffer: Buffer, filename: string): Promise<VTResult> {
  if (!VT_KEY) {
    return { status: 'unknown', malicious: 0, suspicious: 0, total: 0,
             sha256: sha256hex(buffer), scannedAt: new Date().toISOString() }
  }

  const sha256 = sha256hex(buffer)

  const known = await checkHash(sha256)
  if (known) return known

  const submitted = await submitFile(buffer, filename, sha256)
  if (submitted) return submitted

  return { status: 'unknown', malicious: 0, suspicious: 0, total: 0,
           sha256, scannedAt: new Date().toISOString() }
}
