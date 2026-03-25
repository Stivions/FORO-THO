import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Define MONGODB_URI in .env.local')
}

let cached = (global as any).mongoose ?? { conn: null, promise: null }
;(global as any).mongoose = cached

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize:              50,
      minPoolSize:              5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         10000,
    }).then((m) => m)
  }

  cached.conn = await cached.promise
  return cached.conn
}
