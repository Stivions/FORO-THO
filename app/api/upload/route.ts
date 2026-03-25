import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { scanBuffer, type VTResult } from '@/lib/virustotal'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const driveAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
})

const MAX_IMAGE_SIZE = 20  * 1024 * 1024  // 20 MB
const MAX_FILE_SIZE  = 500 * 1024 * 1024  // 500 MB

// Block executables and scripts
const BLOCKED_TYPES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'application/x-msdos-program',
  'text/x-shellscript',
  'application/x-php',
])

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const contentType = req.headers.get('content-type') ?? 'application/octet-stream'
    const rawFilename = req.headers.get('x-filename') ?? 'archivo'
    const filename    = decodeURIComponent(rawFilename)

    if (BLOCKED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido.' }, { status: 400 })
    }

    // Reject oversized uploads before reading the body (saves RAM + bandwidth)
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo muy grande (máx 500 MB)' }, { status: 413 })
    }

    const bytes  = await req.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `Archivo muy grande (${(buffer.length / 1024 / 1024).toFixed(1)} MB, máx 500 MB)`,
      }, { status: 400 })
    }

    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')

    // ── VirusTotal scan (runs concurrently with storage upload) ──
    // Only scan non-image files (images are lower risk and quota is limited)
    const vtPromise: Promise<VTResult | null> = (!isImage && process.env.VIRUSTOTAL_API_KEY)
      ? scanBuffer(buffer, filename)
      : Promise.resolve(null)

    // Images → Cloudinary
    if (isImage) {
      if (buffer.length > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Imagen muy grande (máx 20 MB)' }, { status: 400 })
      }
      const b64     = buffer.toString('base64')
      const dataUri = `data:${contentType};base64,${b64}`
      const result  = await cloudinary.uploader.upload(dataUri, { folder: 'foro', resource_type: 'image' })
      return NextResponse.json({ url: result.secure_url, type: 'image' })
    }

    // Videos + any other file → Google Drive (runs in parallel with VT scan)
    const drive = google.drive({ version: 'v3', auth: driveAuth })

    const [created, vtResult] = await Promise.all([
      drive.files.create({
        requestBody: { name: filename, mimeType: contentType },
        media:       { mimeType: contentType, body: Readable.from(buffer) },
        fields:      'id',
      }),
      vtPromise,
    ])

    const fileId = created.data.id!

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    // Block clearly malicious files (≥3 engines flagged it)
    if (vtResult && vtResult.status === 'malicious' && vtResult.malicious >= 3) {
      // Delete from Drive immediately
      await drive.files.delete({ fileId }).catch(() => {})
      return NextResponse.json({
        error: `⚠ Archivo bloqueado por VirusTotal: ${vtResult.malicious}/${vtResult.total} motores lo detectaron como malicioso.`,
        vtResult,
      }, { status: 400 })
    }

    // Videos get embedded player URL; other files get download URL
    const url = isVideo
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : `https://drive.google.com/uc?export=download&id=${fileId}`

    return NextResponse.json({ url, type: isVideo ? 'video' : 'file', filename, mimeType: contentType, vtResult })

  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: `Error al subir: ${err?.message ?? 'desconocido'}` }, { status: 500 })
  }
}
