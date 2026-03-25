import mongoose, { Schema, model, models } from 'mongoose'

export interface IBannedIP {
  _id: string
  ip: string
  reason?: string
  bannedBy: string
  createdAt: Date
}

const BannedIPSchema = new Schema<IBannedIP>(
  {
    ip:       { type: String, required: true, unique: true },
    reason:   { type: String, default: '' },
    bannedBy: { type: String, required: true },
  },
  { timestamps: true }
)

BannedIPSchema.index({ ip: 1 })

export const BannedIP = models.BannedIP || model<IBannedIP>('BannedIP', BannedIPSchema)
