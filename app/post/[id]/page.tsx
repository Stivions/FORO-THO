'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PostCard } from '@/components/forum/post-card'
import { CommentSection } from '@/components/forum/comment-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import type { PostData } from '@/components/forum/post-feed'

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<PostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/posts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return }
        setPost(data.post)
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (notFound || !post) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-bold mb-2">Post no encontrado</h2>
      <p className="text-muted-foreground mb-4">Este post no existe o fue eliminado.</p>
      <Button asChild variant="outline">
        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Volver al inicio</Link>
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="gap-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <PostCard post={post} onDelete={() => window.history.back()} />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentarios ({post.commentsCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CommentSection postId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
