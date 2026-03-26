import mongoose, { Schema, model, models } from 'mongoose'

export interface IVoiceChannel {
  _id: string
  name: string
  description: string
  owner: { _id: string; username: string; displayName?: string; avatar?: string }
  roomId: string
  maxParticipants: number
  createdAt: Date
}

const VoiceChannelSchema = new Schema<IVoiceChannel>(
  {
    name:            { type: String, required: true, trim: true, maxlength: 40 },
    description:     { type: String, default: '', maxlength: 120 },
    owner:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId:          { type: String, unique: true },
    maxParticipants: { type: Number, default: 20, min: 2, max: 50 },
  },
  { timestamps: true }
)

VoiceChannelSchema.index({ createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.VoiceChannel) {
  delete (models as any).VoiceChannel
}
export const VoiceChannel = models.VoiceChannel || model<IVoiceChannel>('VoiceChannel', VoiceChannelSchema)
