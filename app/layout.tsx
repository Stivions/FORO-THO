import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SessionProvider } from '@/components/session-provider'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Skill All Show',
  description: 'Comunidad de aprendizaje y discusión. Comparte, conecta y crece.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1625',
  colorScheme: 'dark',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Pre-load session on the server so the client never flashes "logged out"
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <SessionProvider session={session}>
          <Providers>
            {children}
          </Providers>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
