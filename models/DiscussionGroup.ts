import { Schema, model, models } from 'mongoose'

export interface IDiscussionGroup {
  _id: string
  name: string
  description: string
  requestMessage: string
  owner: any
  members: any[]
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const DiscussionGroupSchema = new Schema<IDiscussionGroup>(
  {
    name:            { type: String, required: true, trim: true, maxlength: 60 },
    description:     { type: String, required: true, maxlength: 300 },
    requestMessage:  { type: String, default: '' },
    owner:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
)

DiscussionGroupSchema.index({ status: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.DiscussionGroup) delete (models as any).DiscussionGroup
export const DiscussionGroup = models.DiscussionGroup || model<IDiscussionGroup>('DiscussionGroup', DiscussionGroupSchema)
