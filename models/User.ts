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
  }
  role: 'user' | 'admin' | 'moderator'
  badges: string[]
  postsCount: number
  commentsCount: number
  likesCount: number
  followersCount: number
  followingCount: number
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
    },
    role:           { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
    badges:         [{ type: String }],
    postsCount:     { type: Number, default: 0 },
    commentsCount:  { type: Number, default: 0 },
    likesCount:     { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Indexes for search and lookup
UserSchema.index({ username: 1 })
UserSchema.index({ email: 1 })
UserSchema.index({ username: 'text', displayName: 'text' })
UserSchema.index({ createdAt: -1 })

// En desarrollo forzar recreación para que los campos nuevos se reflejen
if (process.env.NODE_ENV === 'development' && models.User) {
  delete (models as any).User
}
export const User = models.User || model<IUser>('User', UserSchema)
