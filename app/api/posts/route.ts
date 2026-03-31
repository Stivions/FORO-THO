import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/Notification'
import { extractMentions, triggerBotReply, notifyMentions } from '@/lib/thobot'
import { analyzePost } from '@/lib/ai-analysis'
import { VIP_CATEGORIES } from '@/lib/categories'
import { Category } from '@/models/Category'
import { canPostInCategory, canReadCategory, getCategoryConfigByName } from '@/lib/access-control'

const VIP_CATEGORY_SET = new Set(VIP_CATEGORIES as readonly string[])

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page     = parseInt(searchParams.get('page') ?? '1')
    const limit    = parseInt(searchParams.get('limit') ?? '20')
    const category = searchParams.get('category') ?? ''
    const search   = searchParams.get('q') ?? ''
    const author   = searchParams.get('author') ?? ''
    const sort     = searchParams.get('sort') ?? ''
    const skip     = (page - 1) * limit

    await connectDB()

    // Check session for VIP status
    const session = await getServerSession(authOptions)
    const uid = (session?.user as any)?.id ?? null
    let isVip = false
    let viewer: any = null
    if (uid) {
      viewer = await User.findById(uid).select('vip vipExpiresAt role').lean()
      if (viewer) {
        isVip = (viewer as any).vip === true &&
          (!((viewer as any).vipExpiresAt) || new Date((viewer as any).vipExpiresAt) > new Date())
      }
    }

    const restrictedCategories = await Category.find({ visibility: { $ne: 'public' } })
      .select('name visibility')
      .lean()

    const deniedCategories = new Set<string>()
    for (const cat of restrictedCategories as any[]) {
      if (!canReadCategory(cat, viewer as any)) deniedCategories.add(cat.name)
    }
    for (const vipCategory of VIP_CATEGORIES) {
      if (!canReadCategory({ name: vipCategory }, viewer as any)) deniedCategories.add(vipCategory)
    }

    // Only show published posts (or legacy posts without status field)
    const filter: any = { status: { $nin: ['pending', 'rejected'] } }
    if (category) {
      if (deniedCategories.has(category)) {
        return NextResponse.json({
          posts: [],
          pagination: { page, limit, total: 0, pages: 0 },
        }, {
          headers: { 'Cache-Control': 'no-store' },
        })
      }
      filter.category = category
    } else if (deniedCategories.size > 0) {
      filter.category = { $nin: Array.from(deniedCategories) }
    }
    if (author)   filter.author = author
    if (search)   filter.$or = [
      { title:   { $regex: search, $options: 'i' } },
      { tags:    { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ]

    const [posts, total] = await Promise.all([
      sort === 'popular'
        ? Post.aggregate([
            { $match: filter },
            { $addFields: {
                score: {
                  $add: [
                    { $subtract: [{ $size: '$upvoters' }, { $size: '$downvoters' }] },
                    { $multiply: [{ $size: { $ifNull: ['$likers', []] } }, 2] },
                  ]
                }
            }},
            { $sort: { isPinned: -1, score: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author',
                pipeline: [{ $project: { username: 1, avatar: 1, displayName: 1, badges: 1 } }] } },
            { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
          ])
        : Post.find(filter)
            .populate('author', 'username avatar displayName badges')
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
      Post.countDocuments(filter),
    ])

    const isAdmin = (session?.user as any)?.role === 'admin'

    // Apply VIP locking (skip for admins and post authors)
    const processedPosts = posts.map((post: any) => {
      const authorId = String(post.author?._id ?? post.author ?? '')
      const isAuthor = uid && authorId === uid
      if (post.vipOnly && !isVip && !isAdmin && !isAuthor) {
        return {
          ...post,
          content: (post.content ?? '').slice(0, 120) + '...',
          preview: (post.content ?? '').slice(0, 120),
          locked: true,
          mediaUrl: '',
          mediaType: '',
        }
      }
      return post
    })

    return NextResponse.json({
      posts: processedPosts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** Detect if post has media, files or external links — requires moderation */
function needsModeration(mediaUrl: string, mediaType: string, content: string, title: string): boolean {
  if (mediaUrl) return true
  const urlPattern = /https?:\/\//i
  return urlPattern.test(content) || urlPattern.test(title)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { title, content, category, tags, mediaUrl, mediaType, vtAnalysis, vipOnly } = await req.json()
    if (!title?.trim() || !content?.trim() || !category) {
      return NextResponse.json({ error: 'Título, contenido y categoría son requeridos' }, { status: 400 })
    }

    await connectDB()
    const uid = (session.user as any).id
    const viewer = await User.findById(uid).select('role vip vipExpiresAt').lean()
    const userRole  = (viewer as any)?.role || (session.user as any).role
    const isAdmin   = userRole === 'admin'
    const categoryConfig = await getCategoryConfigByName(category)

    if (categoryConfig && !canPostInCategory(categoryConfig as any, viewer as any)) {
      return NextResponse.json({ error: 'No tienes permiso para publicar en esta categoria' }, { status: 403 })
    }

    const pending   = isAdmin ? false : needsModeration(mediaUrl || '', mediaType || '', content.trim(), title.trim())
    const status    = pending ? 'pending' : 'published'

    // Auto-lock posts in VIP categories
    const isVipCategory = VIP_CATEGORY_SET.has(category)
    const post = await Post.create({
      title:    title.trim(),
      content:  content.trim(),
      category,
      tags:     (tags ?? []).slice(0, 5),
      mediaUrl:  mediaUrl  || '',
      mediaType: mediaType || '',
      author: uid,
      status,
      vipOnly: isVipCategory ? true : (isAdmin ? (vipOnly === true) : false),
      ...(vtAnalysis ? { vtAnalysis } : {}),
    })

    if (!pending) {
      await User.findByIdAndUpdate(uid, { $inc: { postsCount: 1, points: 2 } })
    }

    // Notify all admins about the pending post
    if (pending) {
      const admins = await User.find({ role: 'admin' }, '_id').lean()
      if (admins.length > 0) {
        await Notification.insertMany(
          admins.map(a => ({
            user: a._id,
            type: 'post_pending',
            from: uid,
            post: post._id,
            text: `"${title.trim().slice(0, 60)}"`,
          }))
        )
      }
    }

    // Run AI analysis async (don't block response)
    analyzePost(title.trim(), content.trim()).then(async (analysis) => {
      await Post.findByIdAndUpdate(post._id, { $set: { aiAnalysis: analysis } })
    }).catch(() => {})

    // Bot + mentions (only for published posts)
    if (!pending) {
      const postContext = `${title.trim()} — ${content.trim()}`
      const allText     = `${title} ${content}`
      const mentions    = extractMentions(allText)
      if (mentions.includes('thobot')) {
        triggerBotReply(post._id.toString(), postContext, allText, null).catch(() => {})
      }
      notifyMentions(allText, uid, post._id.toString(), content.trim()).catch(() => {})
    }

    const populated = await post.populate('author', 'username avatar displayName badges')
    return NextResponse.json(
      { ...populated.toObject(), pending },
      { status: 201 }
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al crear post' }, { status: 500 })
  }
}
