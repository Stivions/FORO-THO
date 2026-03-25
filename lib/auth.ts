import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from './mongodb'
import { User } from '@/models/User'
import { BannedIP } from '@/models/BannedIP'

function getIP(req: any): string {
  return (
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.headers?.['x-real-ip'] ||
    ''
  )
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:        { label: 'Email',    type: 'email' },
        password:     { label: 'Password', type: 'password' },
        captchaToken: { label: 'Captcha',  type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()

        // Check IP ban before even looking up the user
        const ip = getIP(req)
        if (ip) {
          const ipBanned = await BannedIP.findOne({ ip }).lean()
          if (ipBanned) throw new Error('IP_BANNED')
        }

        const user = await User.findOne({ email: credentials.email })
        if (!user) return null

        // Check account ban
        if (user.banned) throw new Error('ACCOUNT_BANNED')

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        // Store last known IP for admin reference
        if (ip) await User.updateOne({ _id: user._id }, { $set: { lastKnownIp: ip } })

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          image: user.avatar || null,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
