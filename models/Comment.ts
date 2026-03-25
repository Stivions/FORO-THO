import { Schema, model, models } from 'mongoose'

export interface IComment {
  _id: string
  content: string
  author: any   // ObjectId when stored, populated object when returned
  post: any
  parentComment?: any
  likers: any[]
  createdAt: Date
}

const CommentSchema = new Schema(
  {
    content:       { type: String, required: true, maxlength: 2000 },
    author:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post:          { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    likers:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

CommentSchema.index({ post: 1, createdAt: 1 })

if (process.env.NODE_ENV === 'development' && models.Comment) delete (models as any).Comment
export const Comment = models.Comment || model('Comment', CommentSchema)
