'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Heart, MessageCircle, UserPlus, Mail } from 'lucide-react'
import { useGlobalNotifications } from '@/components/providers'
import type { AppNotification } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const typeIcon: Record<string, React.ReactNode> = {
  post_like: <Heart className="h-3.5 w-3.5 text-red-400" />,
  comment:   <MessageCircle className="h-3.5 w-3.5 text-blue-400" />,
  follow:    <UserPlus className="h-3.5 w-3.5 text-green-400" />,
  dm:        <Mail className="h-3.5 w-3.5 text-purple-400" />,
}

const typeLabel: Record<string, string> = {
  post_like: 'le dio like a tu post',
  comment:   'comentó en tu post',
  follow:    'te comenzó a seguir',
  dm:        'te envió un mensaje',
}

function NotifItem({ n }: { n: AppNotification }) {
  const who = n.from?.displayName ?? n.from?.username ?? 'Alguien'
  const ago = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })

  return (
    <div className={cn(
      'flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors',
      !n.read && 'bg-primary/5'
    )}>
      <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 overflow-hidden">
        {n.from?.avatar
          ? <img src={n.from.avatar} alt={who} className="h-full w-full object-cover" />
          : who.slice(0, 2).toUpperCase()
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug">
          <span className="font-semibold">{who}</span>
          {' '}{typeLabel[n.type] ?? 'hizo algo'}
          {n.text ? <span className="text-muted-foreground"> · "{n.text}"</span> : null}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{ago}</p>
      </div>
      <div className="shrink-0 mt-0.5">{typeIcon[n.type]}</div>
      {!n.read && (
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </div>
  )
}

export function NotificationDropdown() {
  const { notifications, unread, markAllRead } = useGlobalNotifications()

  return (
    <DropdownMenu onOpenChange={open => { if (open && unread > 0) markAllRead() }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unread > 0 && (
            <span className="text-xs text-muted-foreground">{unread} sin leer</span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Sin notificaciones
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {notifications.map(n => (
              <NotifItem key={String(n._id)} n={n} />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
