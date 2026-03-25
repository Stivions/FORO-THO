import { redirect, notFound } from 'next/navigation'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  await connectDB()
  const user = await User.findOne({ username }).select('_id').lean()
  if (!user) notFound()
  redirect(`/profile/${(user as any)._id}`)
}
