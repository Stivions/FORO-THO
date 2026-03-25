import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { Comment } from '@/models/Comment'
import { Message } from '@/models/Message'
import { Notification } from '@/models/Notification'
import { GroupMessage } from '@/models/GroupMessage'
import { DiscussionGroup } from '@/models/DiscussionGroup'
import { GroupTyping } from '@/models/GroupTyping'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN = process.env.SUPER_ADMIN_EMAIL

/** DELETE /api/admin/reset — only accessible by the super admin */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email

  if (!session || (session.user as any).role !== 'admin' || email !== SUPER_ADMIN)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await connectDB()

  await Promise.all([
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    GroupMessage.deleteMany({}),
    DiscussionGroup.deleteMany({}),
    GroupTyping.deleteMany({}),
  ])

  await User.updateMany({}, {
    $set: {
      postsCount:     0,
      commentsCount:  0,
      likesCount:     0,
      followersCount: 0,
      followingCount: 0,
    },
  })

  return NextResponse.json({ ok: true, message: 'Foro limpiado.' })
}
