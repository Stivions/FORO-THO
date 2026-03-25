import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import { google } from 'googleapis'
import { Readable } from 'stream'

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

    const bytes  = await req.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `Archivo muy grande (${(buffer.length / 1024 / 1024).toFixed(1)} MB, máx 500 MB)`,
      }, { status: 400 })
    }

    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')

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

    // Videos + any other file → Google Drive
    const drive = google.drive({ version: 'v3', auth: driveAuth })

    const created = await drive.files.create({
      requestBody: { name: filename, mimeType: contentType },
      media:       { mimeType: contentType, body: Readable.from(buffer) },
      fields:      'id',
    })

    const fileId = created.data.id!

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    // Videos get embedded player URL; other files get download URL
    const url = isVideo
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : `https://drive.google.com/uc?export=download&id=${fileId}`

    return NextResponse.json({ url, type: isVideo ? 'video' : 'file', filename, mimeType: contentType })

  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: `Error al subir: ${err?.message ?? 'desconocido'}` }, { status: 500 })
  }
}
