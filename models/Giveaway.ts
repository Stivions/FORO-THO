import mongoose, { Schema, model, models } from 'mongoose'

export interface IGiveaway {
  _id: string
  title: string
  description: string
  prize: 'vip_1month' | 'custom'
  prizeDescription: string
  participants: mongoose.Types.ObjectId[]
  winner?: mongoose.Types.ObjectId
  winnerPickedAt?: Date
  status: 'active' | 'ended'
  endsAt: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const GiveawaySchema = new Schema<IGiveaway>(
  {
    title:           { type: String, required: true },
    description:     { type: String, default: '' },
    prize:           { type: String, enum: ['vip_1month', 'custom'], default: 'vip_1month' },
    prizeDescription:{ type: String, default: 'Membresía VIP 1 mes' },
    participants:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
    winner:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    winnerPickedAt:  { type: Date, default: null },
    status:          { type: String, enum: ['active', 'ended'], default: 'active' },
    endsAt:          { type: Date, required: true },
    createdBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

if (process.env.NODE_ENV === 'development' && models.Giveaway) delete (models as any).Giveaway
export const Giveaway = models.Giveaway || model<IGiveaway>('Giveaway', GiveawaySchema)
