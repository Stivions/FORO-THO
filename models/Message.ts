import mongoose, { Schema, model, models } from 'mongoose'

const MessageSchema = new Schema(
  {
    from:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
)

MessageSchema.index({ from: 1, to: 1, createdAt: -1 })
MessageSchema.index({ to: 1, read: 1 })

if (process.env.NODE_ENV === 'development' && models.Message) delete (models as any).Message
export const Message = models.Message || model('Message', MessageSchema)
