import { Schema, model, models } from 'mongoose'

const GroupMessageSchema = new Schema(
  {
    group:   { type: Schema.Types.ObjectId, ref: 'DiscussionGroup', required: true },
    author:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

GroupMessageSchema.index({ group: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.GroupMessage) delete (models as any).GroupMessage
export const GroupMessage = models.GroupMessage || model('GroupMessage', GroupMessageSchema)
