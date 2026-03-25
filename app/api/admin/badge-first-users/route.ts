import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

// POST /api/admin/badge-first-users — asigna badge first_user a los primeros 10 registrados
export async function POST() {
  await connectDB()

  const firstUsers = await User.find({})
    .sort({ createdAt: 1 })
    .limit(10)
    .select('_id username badges')

  const ops = firstUsers.map(u =>
    User.findByIdAndUpdate(u._id, { $addToSet: { badges: 'first_user' } })
  )
  await Promise.all(ops)

  return NextResponse.json({
    message: `Badge first_user asignado a ${firstUsers.length} usuarios`,
    users: firstUsers.map(u => u.username),
  })
}
