'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Bell, Menu, X, User, Settings, LogOut, Mail } from 'lucide-react'
import { NotificationDropdown } from './notification-dropdown'

interface NavbarProps {
  onMenuToggle: () => void
  isMobileMenuOpen: boolean
}

export function Navbar({ onMenuToggle, isMobileMenuOpen }: NavbarProps) {
  const { data: session, status } = useSession()
  const { user: dbUser, sessionId } = useCurrentUser()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
    else router.push('/')
  }

  const sessionUser = session?.user as any
  const user = sessionId ? {
    id:    sessionId,
    name:  dbUser?.displayName || dbUser?.username || sessionUser?.name,
    image: dbUser?.avatar || sessionUser?.image,
    role:  dbUser?.role || sessionUser?.role,
  } : null

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: '#050810ee',
        borderBottom: '1px solid #00fff520',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 1px 30px #00fff508',
      }}
    >
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Mobile Toggle */}
        <button
          className="lg:hidden p-1.5 rounded transition-colors"
          style={{ color: '#00fff580', border: '1px solid #00fff520' }}
          onClick={onMenuToggle}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#00fff5'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#00fff550'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#00fff580'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#00fff520'
          }}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {/* Mobile Logo */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="2,7 2,2 7,2" stroke="#00fff5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="25,2 30,2 30,7" stroke="#00fff5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="2,25 2,30 7,30" stroke="#00fff5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="25,30 30,30 30,25" stroke="#00fff5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="16,7 25,16 16,25 7,16" stroke="#00fff5" strokeWidth="1.4" fill="none" opacity="0.8"/>
            <circle cx="16" cy="16" r="4.5" stroke="#00fff5" strokeWidth="1.2" fill="#00fff510"/>
            <circle cx="16" cy="16" r="1.8" fill="#00fff5"/>
          </svg>
          <span className="ds-logo-text text-xs">SAS</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: '#00fff550' }}
            />
            <input
              type="search"
              placeholder="> buscar posts, usuarios, tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ds-search-input w-full pl-9 pr-4 py-2 rounded text-xs"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        </form>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          <NotificationDropdown />

          {status === 'loading' ? (
            <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: '#00fff510' }} />
          ) : user ? (
            <>
              <Link
                href="/messages"
                title="Mensajes directos"
                className="p-1.5 rounded transition-colors"
                style={{ color: '#00fff560' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
              >
                <Mail className="h-4 w-4" />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full p-0.5 transition-all"
                    style={{ border: '1px solid #00fff530' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#00fff5'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px #00fff540'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#00fff530'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                    }}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.image ?? ''} alt={user.name ?? ''} />
                      <AvatarFallback style={{ background: '#00fff510', color: '#00fff5', fontFamily: 'monospace', fontSize: '10px' }}>
                        {(user.name ?? 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-52"
                  align="end"
                  style={{ background: '#0a0a14', border: '1px solid #00fff530', boxShadow: '0 4px 30px #00fff510' }}
                >
                  <div className="flex items-center gap-2 p-2" style={{ borderBottom: '1px solid #00fff510' }}>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.image ?? ''} />
                      <AvatarFallback style={{ background: '#00fff510', color: '#00fff5', fontFamily: 'monospace', fontSize: '10px' }}>
                        {(user.name ?? 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-xs font-medium" style={{ color: '#00fff5' }}>{user.name}</p>
                      <p className="text-xs font-mono capitalize" style={{ color: '#00fff540' }}>{user.role ?? 'agent'}</p>
                    </div>
                  </div>
                  <DropdownMenuItem asChild className="cursor-pointer text-xs font-mono">
                    <Link href={`/profile/${user.id}`}>
                      <User className="mr-2 h-3.5 w-3.5" />MI PERFIL
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer text-xs font-mono">
                    <Link href="/settings">
                      <Settings className="mr-2 h-3.5 w-3.5" />AJUSTES
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: '#00fff510' }} />
                  <DropdownMenuItem
                    className="cursor-pointer text-xs font-mono"
                    style={{ color: '#ff003c' }}
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />CERRAR SESIÓN
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login" className="dedsec-btn px-4 py-1.5 text-xs">
              {'> ENTRAR'}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
