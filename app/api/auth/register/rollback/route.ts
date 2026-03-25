import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

// Called by the client if auto-login fails right after registration,
// so we don't leave orphaned non-admin accounts.
export async function DELETE(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    await connectDB()

    // Only delete if: user exists, is not admin/moderator, and was created within the last 2 minutes
    const cutoff = new Date(Date.now() - 2 * 60 * 1000)
    const result = await User.deleteOne({
      _id: userId,
      role: 'user',
      createdAt: { $gte: cutoff },
    })

    return NextResponse.json({ deleted: result.deletedCount === 1 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
