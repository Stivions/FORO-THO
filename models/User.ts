import mongoose, { Schema, model, models } from 'mongoose'

export interface IUser {
  _id: string
  username: string
  email: string
  password: string
  displayName?: string
  avatar?: string
  bannerUrl?: string
  bio?: string
  location?: string
  website?: string
  socialLinks?: {
    twitter?: string
    github?: string
    instagram?: string
    discord?: string
  }
  role: 'user' | 'admin' | 'moderator'
  badges: string[]
  emailVerified: boolean
  postsCount: number
  commentsCount: number
  likesCount: number
  followersCount: number
  followingCount: number
  banned: boolean
  bannedReason?: string
  bannedAt?: Date
  lastKnownIp?: string
  loginCount: number
  lastLoginAt?: Date
  lastLogin?: {
    ip?: string
    userAgent?: string
    browser?: string
    os?: string
    device?: string
    country?: string
    city?: string
    authMethod?: 'password' | 'email_code'
  }
  sellerVerified: boolean
  suspicious: boolean
  suspiciousReason?: string
  vip: boolean
  vipExpiresAt?: Date | null
  vipAutoRenew: boolean
  vipExpiryNoticeSentAt?: Date | null
  points: number
  reputationScore: number
  reputationVotes: number
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username:      { type: String, required: true, unique: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    password:      { type: String, required: true, minlength: 6 },
    displayName:   { type: String, default: '' },
    avatar:        { type: String, default: '' },
    bannerUrl:     { type: String, default: '' },
    bio:           { type: String, default: '' },
    location:      { type: String, default: '' },
    website:       { type: String, default: '' },
    socialLinks: {
      twitter:   { type: String, default: '' },
      github:    { type: String, default: '' },
      instagram: { type: String, default: '' },
      discord:   { type: String, default: '' },
    },
    role:           { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
    badges:         [{ type: String }],
    emailVerified:  { type: Boolean, default: false },
    postsCount:     { type: Number, default: 0 },
    commentsCount:  { type: Number, default: 0 },
    likesCount:     { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    banned:         { type: Boolean, default: false },
    bannedReason:   { type: String, default: '' },
    bannedAt:       { type: Date, default: null },
    lastKnownIp:    { type: String, default: '' },
    loginCount:     { type: Number, default: 0 },
    lastLoginAt:    { type: Date, default: null },
    lastLogin: {
      ip:         { type: String, default: '' },
      userAgent:  { type: String, default: '' },
      browser:    { type: String, default: '' },
      os:         { type: String, default: '' },
      device:     { type: String, default: '' },
      country:    { type: String, default: '' },
      city:       { type: String, default: '' },
      authMethod: { type: String, enum: ['password', 'email_code'], default: 'password' },
    },
    sellerVerified: { type: Boolean, default: false },
    suspicious:     { type: Boolean, default: false },
    suspiciousReason: { type: String, default: '' },
    vip:            { type: Boolean, default: false },
    vipExpiresAt:   { type: Date, default: null },
    vipAutoRenew:   { type: Boolean, default: false },
    vipExpiryNoticeSentAt: { type: Date, default: null },
    points:         { type: Number, default: 0 },
    reputationScore:{ type: Number, default: 0 },
    reputationVotes:{ type: Number, default: 0 },
  },
  { timestamps: true }
)

// Indexes for search and lookup
UserSchema.index({ username: 1 })
UserSchema.index({ email: 1 })
UserSchema.index({ username: 'text', displayName: 'text' })
UserSchema.index({ createdAt: -1 })
UserSchema.index({ lastLoginAt: -1 })
UserSchema.index({ lastKnownIp: 1 })
UserSchema.index({ suspicious: 1 })
UserSchema.index({ sellerVerified: 1 })

// En desarrollo forzar recreación para que los campos nuevos se reflejen
if (process.env.NODE_ENV === 'development' && models.User) {
  delete (models as any).User
}
export const User = models.User || model<IUser>('User', UserSchema)
