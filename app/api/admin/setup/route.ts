import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function POST() {
  await connectDB()

  const updated = await User.findOneAndUpdate(
    { email: 'stevensanchezdev@gmail.com' },
    {
      $set:      { role: 'admin' },
      $addToSet: { badges: { $each: ['verified', 'first_user'] } },
    },
    { new: true }
  ).select('_id username email role badges')

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ message: 'User promoted to admin', user: updated })
}
