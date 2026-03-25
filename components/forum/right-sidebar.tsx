'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, ArrowUp, Info } from 'lucide-react'

interface TrendingPost { _id: string; title: string; upvoters: string[]; downvoters: string[] }

export function RightSidebar({ className }: { className?: string }) {
  const [trending, setTrending] = useState<TrendingPost[]>([])

  useEffect(() => {
    fetch('/api/posts?limit=5&page=1')
      .then(r => r.json())
      .then(data => {
        const sorted = [...(data.posts ?? [])].sort(
          (a: TrendingPost, b: TrendingPost) =>
            (b.upvoters.length - b.downvoters.length) - (a.upvoters.length - a.downvoters.length)
        )
        setTrending(sorted.slice(0, 5))
      })
      .catch(() => {})
  }, [])

  return (
    <aside className={cn('space-y-4', className)}>
      {/* Trending */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="w-4 h-4 text-primary" />
            Tendencias
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin posts aún</p>
          ) : (
            <div className="space-y-3">
              {trending.map((post, i) => (
                <Link key={post._id} href={`/post/${post._id}`} className="flex items-start gap-3 group">
                  <span className="text-lg font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm group-hover:text-primary transition-colors line-clamp-2">{post.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <ArrowUp className="w-3 h-3" />
                      {post.upvoters.length - post.downvoters.length}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Info className="w-4 h-4 text-primary" />
            Bienvenido
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <p className="text-xs text-muted-foreground">
            Un lugar para compartir, discutir y conectar. Sé respetuoso y constructivo.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>· Sé respetuoso</li>
            <li>· No spam</li>
            <li>· Contenido relevante</li>
          </ul>
        </CardContent>
      </Card>
    </aside>
  )
}
