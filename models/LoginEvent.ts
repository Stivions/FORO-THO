import { Schema, model, models } from 'mongoose'

export interface ILoginEvent {
  user: any
  ip: string
  userAgent: string
  browser: string
  os: string
  device: string
  country: string
  city: string
  authMethod: 'password' | 'email_code'
  createdAt: Date
  updatedAt: Date
}

const LoginEventSchema = new Schema<ILoginEvent>(
  {
    user:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ip:         { type: String, default: '' },
    userAgent:  { type: String, default: '' },
    browser:    { type: String, default: '' },
    os:         { type: String, default: '' },
    device:     { type: String, default: '' },
    country:    { type: String, default: '' },
    city:       { type: String, default: '' },
    authMethod: { type: String, enum: ['password', 'email_code'], required: true },
  },
  { timestamps: true }
)

LoginEventSchema.index({ user: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.LoginEvent) {
  delete (models as any).LoginEvent
}

export const LoginEvent = models.LoginEvent || model<ILoginEvent>('LoginEvent', LoginEventSchema)
