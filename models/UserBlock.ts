import { Schema, model, models } from 'mongoose'

export interface IUserBlock {
  blocker: any
  blocked: any
  createdAt: Date
  updatedAt: Date
}

const UserBlockSchema = new Schema<IUserBlock>(
  {
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

UserBlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true })
UserBlockSchema.index({ blocked: 1, blocker: 1 })

if (process.env.NODE_ENV === 'development' && models.UserBlock) {
  delete (models as any).UserBlock
}

export const UserBlock = models.UserBlock || model<IUserBlock>('UserBlock', UserBlockSchema)
