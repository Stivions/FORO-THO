import { Schema, model, models } from 'mongoose'
import type { AuthCodePurpose } from '@/lib/auth-code'

export interface IAuthCode {
  email: string
  purpose: AuthCodePurpose
  codeHash: string
  username?: string
  attempts: number
  expiresAt: Date
  consumedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const AuthCodeSchema = new Schema<IAuthCode>(
  {
    email:      { type: String, required: true, lowercase: true, trim: true },
    purpose:    { type: String, enum: ['login', 'register'], required: true },
    codeHash:   { type: String, required: true },
    username:   { type: String, default: '' },
    attempts:   { type: Number, default: 0 },
    expiresAt:  { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

AuthCodeSchema.index({ email: 1, purpose: 1, createdAt: -1 })
AuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

if (process.env.NODE_ENV === 'development' && models.AuthCode) {
  delete (models as any).AuthCode
}

export const AuthCode = models.AuthCode || model<IAuthCode>('AuthCode', AuthCodeSchema)
