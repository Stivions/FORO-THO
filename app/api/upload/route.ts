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
const MAX_VIDEO_SIZE = 500 * 1024 * 1024  // 500 MB

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const contentType = req.headers.get('content-type') ?? ''
    const rawFilename = req.headers.get('x-filename') ?? 'upload'
    const filename    = decodeURIComponent(rawFilename)

    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: `Tipo no permitido: ${contentType}` }, { status: 400 })
    }

    const bytes  = await req.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (buffer.length > maxSize) {
      return NextResponse.json({
        error: `Archivo muy grande (${(buffer.length / 1024 / 1024).toFixed(1)} MB, max ${isVideo ? '500' : '20'} MB)`
      }, { status: 400 })
    }

    if (isImage) {
      // Imágenes → Cloudinary
      const b64     = buffer.toString('base64')
      const dataUri = `data:${contentType};base64,${b64}`
      const result  = await cloudinary.uploader.upload(dataUri, { folder: 'foro', resource_type: 'image' })
      return NextResponse.json({ url: result.secure_url })
    }

    // Videos → Google Drive
    const drive = google.drive({ version: 'v3', auth: driveAuth })

    const created = await drive.files.create({
      requestBody: { name: filename, mimeType: contentType },
      media:       { mimeType: contentType, body: Readable.from(buffer) },
      fields:      'id',
    })

    const fileId = created.data.id!

    // Hacer el archivo público
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    // URL de embed para mostrar el player de Drive
    const url = `https://drive.google.com/file/d/${fileId}/preview`
    return NextResponse.json({ url })

  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: `Error al subir: ${err?.message ?? 'desconocido'}` }, { status: 500 })
  }
}
