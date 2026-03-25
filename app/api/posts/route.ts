import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { extractMentions, triggerBotReply, notifyMentions } from '@/lib/thobot'

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

    const filter: any = {}
    if (category) filter.category = category
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
            { $addFields: { score: { $subtract: [{ $size: '$upvoters' }, { $size: '$downvoters' }] } } },
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

    return NextResponse.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { title, content, category, tags, mediaUrl, mediaType } = await req.json()
    if (!title?.trim() || !content?.trim() || !category) {
      return NextResponse.json({ error: 'Título, contenido y categoría son requeridos' }, { status: 400 })
    }

    await connectDB()
    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: (tags ?? []).slice(0, 5),
      mediaUrl:  mediaUrl  || '',
      mediaType: mediaType || '',
      author: (session.user as any).id,
    })

    await User.findByIdAndUpdate((session.user as any).id, { $inc: { postsCount: 1 } })

    const uid = (session.user as any).id
    const postContext = `${title.trim()} — ${content.trim()}`
    const allText = `${title} ${content}`
    const mentions = extractMentions(allText)

    if (mentions.includes('thobot')) {
      triggerBotReply(post._id.toString(), postContext, allText, null).catch(() => {})
    }
    notifyMentions(allText, uid, post._id.toString(), content.trim()).catch(() => {})

    const populated = await post.populate('author', 'username avatar displayName badges')
    return NextResponse.json(populated, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al crear post' }, { status: 500 })
  }
}
