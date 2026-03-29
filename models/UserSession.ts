import { Schema, model, models } from 'mongoose'

export interface IUserSession {
  user: any
  sessionId: string
  ip: string
  userAgent: string
  browser: string
  os: string
  device: string
  country: string
  city: string
  authMethod: 'password' | 'email_code'
  lastSeenAt: Date
  revokedAt?: Date | null
  revokedReason?: string
  createdAt: Date
  updatedAt: Date
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    user:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId:    { type: String, required: true, unique: true, index: true },
    ip:           { type: String, default: '' },
    userAgent:    { type: String, default: '' },
    browser:      { type: String, default: '' },
    os:           { type: String, default: '' },
    device:       { type: String, default: '' },
    country:      { type: String, default: '' },
    city:         { type: String, default: '' },
    authMethod:   { type: String, enum: ['password', 'email_code'], required: true },
    lastSeenAt:   { type: Date, default: Date.now },
    revokedAt:    { type: Date, default: null },
    revokedReason:{ type: String, default: '' },
  },
  { timestamps: true }
)

UserSessionSchema.index({ user: 1, lastSeenAt: -1 })
UserSessionSchema.index({ user: 1, revokedAt: 1 })

if (process.env.NODE_ENV === 'development' && models.UserSession) {
  delete (models as any).UserSession
}

export const UserSession = models.UserSession || model<IUserSession>('UserSession', UserSessionSchema)
