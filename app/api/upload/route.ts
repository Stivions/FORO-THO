import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import { scanBuffer, type VTResult } from '@/lib/virustotal'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_IMAGE_SIZE = 20  * 1024 * 1024  // 20 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024  // 200 MB
const MAX_FILE_SIZE  = 50  * 1024 * 1024  // 50 MB

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
    let buffer: Buffer
    let contentType: string
    let filename: string

    const reqContentType = req.headers.get('content-type') ?? ''

    if (reqContentType.startsWith('multipart/form-data')) {
      // FormData format (tickets, products, settings)
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
      contentType = file.type || 'application/octet-stream'
      filename    = file.name || 'archivo'
      buffer      = Buffer.from(await file.arrayBuffer())
    } else {
      // Raw body format (create-post, edit-profile, groups)
      contentType = reqContentType || 'application/octet-stream'
      filename    = decodeURIComponent(req.headers.get('x-filename') ?? 'archivo')
      buffer      = Buffer.from(await req.arrayBuffer())
    }

    if (BLOCKED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido.' }, { status: 400 })
    }

    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')

    if (isImage && buffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Imagen muy grande (máx 20 MB)' }, { status: 400 })
    }
    if (isVideo && buffer.length > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: 'Video muy grande (máx 200 MB)' }, { status: 400 })
    }
    if (!isImage && !isVideo && buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo muy grande (máx 50 MB)' }, { status: 400 })
    }

    // VirusTotal scan for non-images
    const vtPromise: Promise<VTResult | null> = (!isImage && process.env.VIRUSTOTAL_API_KEY)
      ? scanBuffer(buffer, filename)
      : Promise.resolve(null)

    // Upload everything to Cloudinary
    const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw'
    const b64     = buffer.toString('base64')
    const dataUri = `data:${contentType};base64,${b64}`

    const [result, vtResult] = await Promise.all([
      cloudinary.uploader.upload(dataUri, {
        folder:        'foro',
        resource_type: resourceType,
        public_id:     `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}`,
      }),
      vtPromise,
    ])

    // Block malicious files
    if (vtResult && vtResult.status === 'malicious' && vtResult.malicious >= 3) {
      await cloudinary.uploader.destroy(result.public_id, { resource_type: resourceType }).catch(() => {})
      return NextResponse.json({
        error: `⚠ Archivo bloqueado: ${vtResult.malicious}/${vtResult.total} motores lo detectaron como malicioso.`,
        vtResult,
      }, { status: 400 })
    }

    return NextResponse.json({
      url:      result.secure_url,
      mediaUrl: result.secure_url,
      type:     isImage ? 'image' : isVideo ? 'video' : 'file',
      filename,
      mimeType: contentType,
      vtResult,
    })

  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: `Error al subir: ${err?.message ?? 'desconocido'}` }, { status: 500 })
  }
}
