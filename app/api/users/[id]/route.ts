import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()
    const user = await User.findById(id).select([
      'username',
      'displayName',
      'avatar',
      'bannerUrl',
      'bio',
      'location',
      'website',
      'socialLinks',
      'badges',
      'postsCount',
      'commentsCount',
      'likesCount',
      'followersCount',
      'followingCount',
      'createdAt',
      'points',
      'sellerVerified',
      'suspicious',
      'reputationScore',
      'reputationVotes',
    ].join(' '))
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
