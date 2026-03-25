import mongoose, { Schema, model, models } from 'mongoose'

const FollowSchema = new Schema(
  {
    follower:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

FollowSchema.index({ follower: 1, following: 1 }, { unique: true })
FollowSchema.index({ following: 1 })

if (process.env.NODE_ENV === 'development' && models.Follow) delete (models as any).Follow
export const Follow = models.Follow || model('Follow', FollowSchema)
