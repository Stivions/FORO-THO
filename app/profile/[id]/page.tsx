import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { UserProfile } from '@/components/forum/user-profile'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return { title: 'Usuario no encontrado' }
  await connectDB()
  const user = await User.findById(id).select('username displayName bio').lean()
  if (!user) return { title: 'Usuario no encontrado' }
  const name = (user as any).displayName || (user as any).username
  return {
    title: `${name} - Foro`,
    description: (user as any).bio || `Perfil de ${name}`,
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!mongoose.Types.ObjectId.isValid(id)) notFound()

  await connectDB()
  const user = await User.findById(id).select('-password').lean()
  if (!user) notFound()

  const isCurrentUser = (session?.user as any)?.id === id

  // Serialize to plain object
  const serialized = JSON.parse(JSON.stringify(user))

  return <UserProfile user={serialized} isCurrentUser={isCurrentUser} />
}
