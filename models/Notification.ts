import mongoose, { Schema, model, models } from 'mongoose'

export type NotifType = 'dm' | 'post_like' | 'comment' | 'follow' | 'mention'

const NotificationSchema = new Schema(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: ['dm', 'post_like', 'comment', 'follow', 'mention'], required: true },
    from:    { type: Schema.Types.ObjectId, ref: 'User' },
    post:    { type: Schema.Types.ObjectId, ref: 'Post' },
    text:    { type: String, default: '' },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
)

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.Notification) delete (models as any).Notification
export const Notification = models.Notification || model('Notification', NotificationSchema)
