import { Schema, model, models } from 'mongoose'

const GroupTypingSchema = new Schema({
  group:       { type: Schema.Types.ObjectId, ref: 'DiscussionGroup', required: true },
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username:    { type: String },
  displayName: { type: String },
  avatar:      { type: String },
  updatedAt:   { type: Date, default: Date.now },
})

GroupTypingSchema.index({ group: 1, user: 1 }, { unique: true })
// Auto-delete stale typing indicators after 30s
GroupTypingSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 })

if (process.env.NODE_ENV === 'development' && models.GroupTyping) delete (models as any).GroupTyping
export const GroupTyping = models.GroupTyping || model('GroupTyping', GroupTypingSchema)
