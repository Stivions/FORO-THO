import mongoose, { Schema, model, models } from 'mongoose'

export type PostStatus = 'published' | 'pending' | 'rejected'
export type AIVerdict  = 'good' | 'bad' | 'suspicious'

export interface IPost {
  _id: string
  title: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  author: { _id: string; username: string; avatar?: string; displayName?: string }
  category: string
  tags: string[]
  upvoters: string[]
  downvoters: string[]
  likers: string[]
  commentsCount: number
  isPinned: boolean
  status: PostStatus
  aiAnalysis?: {
    verdict: AIVerdict
    reason: string
    flags: string[]
    analyzedAt: Date
  }
  createdAt: Date
}

const PostSchema = new Schema<IPost>(
  {
    title:        { type: String, required: true, maxlength: 200 },
    content:      { type: String, required: true },
    mediaUrl:     { type: String, default: '' },
    mediaType:    { type: String, enum: ['image', 'video', 'file', ''], default: '' },
    author:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category:     { type: String, required: true },
    tags:         [{ type: String }],
    upvoters:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvoters:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likers:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    isPinned:      { type: Boolean, default: false },
    status:        { type: String, enum: ['published', 'pending', 'rejected'], default: 'published' },
    aiAnalysis: {
      verdict:    { type: String, enum: ['good', 'bad', 'suspicious'] },
      reason:     { type: String, default: '' },
      flags:      [{ type: String }],
      analyzedAt: { type: Date },
    },
  },
  { timestamps: true }
)

PostSchema.index({ createdAt: -1 })
PostSchema.index({ category: 1, createdAt: -1 })
PostSchema.index({ tags: 1 })
PostSchema.index({ author: 1, createdAt: -1 })
PostSchema.index({ isPinned: 1, createdAt: -1 })
PostSchema.index({ status: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.Post) delete (models as any).Post
export const Post = models.Post || model<IPost>('Post', PostSchema)
