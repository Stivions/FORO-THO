import { Schema, model, models } from 'mongoose'

export interface IReputationVote {
  from: any
  to: any
  value: -1 | 1
  note?: string
  createdAt: Date
  updatedAt: Date
}

const ReputationVoteSchema = new Schema<IReputationVote>(
  {
    from:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, enum: [-1, 1], required: true },
    note:  { type: String, default: '', maxlength: 160 },
  },
  { timestamps: true }
)

ReputationVoteSchema.index({ from: 1, to: 1 }, { unique: true })
ReputationVoteSchema.index({ to: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.ReputationVote) {
  delete (models as any).ReputationVote
}

export const ReputationVote = models.ReputationVote || model<IReputationVote>('ReputationVote', ReputationVoteSchema)
