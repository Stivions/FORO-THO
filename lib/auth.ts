import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { connectDB } from './mongodb'
import { User } from '@/models/User'
import { BannedIP } from '@/models/BannedIP'
import { AuthCode } from '@/models/AuthCode'
import { hashAuthCode, normalizeEmail } from './auth-code'

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
        code:         { label: 'Code',     type: 'text' },
        mode:         { label: 'Mode',     type: 'text' },
        captchaToken: { label: 'Captcha',  type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email) return null

        await connectDB()

        // Check IP ban before even looking up the user
        const ip = getIP(req)
        if (ip) {
          const ipBanned = await BannedIP.findOne({ ip }).lean()
          if (ipBanned) throw new Error('IP_BANNED')
        }

        const email = normalizeEmail(credentials.email)

        if (credentials.code) {
          const purpose = credentials.mode === 'register' ? 'register' : 'login'
          const authCode = await AuthCode.findOne({
            email,
            purpose,
            consumedAt: null,
            expiresAt: { $gt: new Date() },
          }).sort({ createdAt: -1 })

          if (!authCode || authCode.attempts >= 5) throw new Error('CODE_INVALID')

          const validCode = authCode.codeHash === hashAuthCode(email, credentials.code)
          if (!validCode) {
            authCode.attempts += 1
            await authCode.save()
            throw new Error('CODE_INVALID')
          }

          authCode.consumedAt = new Date()
          await authCode.save()

          let user = await User.findOne({ email })

          if (!user) {
            if (purpose !== 'register' || !authCode.username) throw new Error('CODE_INVALID')

            const totalUsers = await User.countDocuments()
            const badges: string[] = totalUsers < 10 ? ['first_user'] : []
            const generatedPassword = await bcrypt.hash(crypto.randomUUID(), 12)

            user = await User.create({
              username: authCode.username,
              email,
              password: generatedPassword,
              badges,
              emailVerified: true,
            })
          } else if (!user.emailVerified) {
            user.emailVerified = true as any
            await user.save()
          }

          if (user.banned) throw new Error('ACCOUNT_BANNED')
          if (ip) await User.updateOne({ _id: user._id }, { $set: { lastKnownIp: ip } })

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
            image: user.avatar || null,
            role: user.role,
          }
        }

        if (!credentials.password) return null

        const user = await User.findOne({ email })
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
