'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Plus, MessageSquare, Loader2, Lock } from 'lucide-react'

interface Group {
  _id: string
  name: string
  description: string
  owner: { _id: string; username: string; displayName?: string; avatar?: string }
  members: any[]
  createdAt: string
}

export default function GroupsPage() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(d => setGroups(d.groups ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Grupos de Discusión
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chats en tiempo real con indicador de escritura. Los grupos requieren aprobación del admin.
          </p>
        </div>
        {session && (
          <Button asChild>
            <Link href="/groups/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Solicitar grupo
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Aún no hay grupos aprobados</p>
          <p className="text-sm mt-1">Sé el primero en solicitar uno</p>
          {session && (
            <Button asChild className="mt-4">
              <Link href="/groups/new">Solicitar un grupo</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map(g => (
            <Link key={g._id} href={`/groups/${g._id}`}>
              <Card className="bg-card border-border hover:border-primary/40 transition-all hover:shadow-md cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{g.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{g.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {g.members.length} miembro{g.members.length !== 1 ? 's' : ''}
                        </span>
                        <span>por @{g.owner?.username}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!session && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <span><Link href="/login" className="text-primary hover:underline font-medium">Inicia sesión</Link> para unirte o solicitar un grupo</span>
        </div>
      )}
    </div>
  )
}
