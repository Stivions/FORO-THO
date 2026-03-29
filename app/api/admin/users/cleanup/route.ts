import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Post } from '@/models/Post'
import { Comment } from '@/models/Comment'
import { Message } from '@/models/Message'
import { Notification } from '@/models/Notification'
import { GroupMessage } from '@/models/GroupMessage'
import { DiscussionGroup } from '@/models/DiscussionGroup'
import { GroupTyping } from '@/models/GroupTyping'
import { Review } from '@/models/Review'
import { Product } from '@/models/Product'
import { Ticket } from '@/models/Ticket'
import { TicketMessage } from '@/models/TicketMessage'
import { Follow } from '@/models/Follow'
import { Payment } from '@/models/Payment'
import { Donation } from '@/models/Donation'
import { AuthCode } from '@/models/AuthCode'
import { LoginEvent } from '@/models/LoginEvent'
import { UserSession } from '@/models/UserSession'
import { UserBlock } from '@/models/UserBlock'
import { Report } from '@/models/Report'
import { ProductRequest } from '@/models/ProductRequest'
import { ReputationVote } from '@/models/ReputationVote'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN = process.env.SUPER_ADMIN_EMAIL

export async function DELETE() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email

  if (!session || (session.user as any).role !== 'admin' || email !== SUPER_ADMIN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await connectDB()

  const usersToDelete = await User.find({ role: { $ne: 'admin' } }).select('_id').lean() as Array<{ _id: string }>
  const userIds = usersToDelete.map(u => u._id)

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, deletedUsers: 0 })
  }

  const posts = await Post.find({ author: { $in: userIds } }).select('_id').lean() as Array<{ _id: string }>
  const ownedGroups = await DiscussionGroup.find({ owner: { $in: userIds } }).select('_id').lean() as Array<{ _id: string }>
  const postIds = posts.map(p => p._id)
  const groupIds = ownedGroups.map(g => g._id)

  await Promise.all([
    Comment.deleteMany({
      $or: [
        { author: { $in: userIds } },
        { post: { $in: postIds } },
      ],
    }),
    Post.deleteMany({ author: { $in: userIds } }),
    Message.deleteMany({
      $or: [
        { from: { $in: userIds } },
        { to: { $in: userIds } },
      ],
    }),
    Notification.deleteMany({
      $or: [
        { user: { $in: userIds } },
        { from: { $in: userIds } },
        { post: { $in: postIds } },
      ],
    }),
    GroupMessage.deleteMany({
      $or: [
        { author: { $in: userIds } },
        { group: { $in: groupIds } },
      ],
    }),
    GroupTyping.deleteMany({
      $or: [
        { user: { $in: userIds } },
        { group: { $in: groupIds } },
      ],
    }),
    DiscussionGroup.updateMany({}, { $pull: { members: { $in: userIds } } }),
    DiscussionGroup.deleteMany({ owner: { $in: userIds } }),
    Review.deleteMany({ user: { $in: userIds } }),
    Product.deleteMany({ uploadedBy: { $in: userIds } }),
    TicketMessage.deleteMany({ sender: { $in: userIds } }),
    Ticket.deleteMany({
      $or: [
        { user: { $in: userIds } },
        { assignedTo: { $in: userIds } },
      ],
    }),
    Follow.deleteMany({
      $or: [
        { follower: { $in: userIds } },
        { following: { $in: userIds } },
      ],
    }),
    Payment.deleteMany({ user: { $in: userIds } }),
    Donation.deleteMany({ user: { $in: userIds } }),
    LoginEvent.deleteMany({ user: { $in: userIds } }),
    UserSession.deleteMany({ user: { $in: userIds } }),
    UserBlock.deleteMany({
      $or: [
        { blocker: { $in: userIds } },
        { blocked: { $in: userIds } },
      ],
    }),
    Report.deleteMany({
      $or: [
        { reporter: { $in: userIds } },
        { reportedUser: { $in: userIds } },
      ],
    }),
    ProductRequest.deleteMany({ user: { $in: userIds } }),
    ReputationVote.deleteMany({
      $or: [
        { from: { $in: userIds } },
        { to: { $in: userIds } },
      ],
    }),
    AuthCode.deleteMany({}),
    Post.updateMany({}, {
      $pull: {
        upvoters: { $in: userIds },
        downvoters: { $in: userIds },
        likers: { $in: userIds },
      },
    }),
    Comment.updateMany({}, { $pull: { likers: { $in: userIds } } }),
    Product.updateMany({}, { $pull: { likers: { $in: userIds } } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ])

  return NextResponse.json({ ok: true, deletedUsers: userIds.length, deletedPosts: postIds.length, deletedGroups: groupIds.length })
}
