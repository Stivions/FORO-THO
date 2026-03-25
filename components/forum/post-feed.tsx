'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { PostCard } from './post-card'
import { ImageLightbox } from './image-lightbox'
import { PostSkeleton } from './post-skeleton'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, MessageSquare, X } from 'lucide-react'

export interface PostData {
  _id: string
  title: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  author: { _id: string; username: string; avatar?: string; displayName?: string; badges?: string[] }
  category: string
  tags: string[]
  upvoters: string[]
  downvoters: string[]
  likers: string[]
  commentsCount: number
  isPinned: boolean
  createdAt: string
}

interface PostFeedProps {
  sort?: 'latest' | 'popular'
}

export function PostFeed({ sort }: PostFeedProps = {}) {
  const searchParams   = useSearchParams()
  const category       = searchParams.get('category') ?? ''
  const query          = searchParams.get('q') ?? ''

  const [posts, setPosts]               = useState<PostData[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage]                 = useState(1)
  const [hasMore, setHasMore]           = useState(true)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const loadingRef  = useRef(false)   // guard against concurrent loads
  const pageRef     = useRef(1)       // shadow page in a ref to avoid stale closure

  const buildUrl = (p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' })
    if (category) params.set('category', category)
    if (query)    params.set('q', query)
    if (sort)     params.set('sort', sort)
    return `/api/posts?${params}`
  }

  const loadPosts = useCallback(async (reset = false) => {
    // Prevent duplicate concurrent requests
    if (!reset && loadingRef.current) return
    loadingRef.current = true

    const p = reset ? 1 : pageRef.current
    if (reset) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const res  = await fetch(buildUrl(p))
      const data = await res.json()
      const newPosts: PostData[] = data.posts ?? []

      setPosts(prev => {
        if (reset) return newPosts
        // Deduplicate by _id to prevent doubles on fast scroll
        const seen = new Set(prev.map(p => p._id))
        return [...prev, ...newPosts.filter(p => !seen.has(p._id))]
      })
      setHasMore(p < (data.pagination?.pages ?? 1))
      const nextPage = reset ? 2 : p + 1
      setPage(nextPage)
      pageRef.current = nextPage
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, sort])

  // Reset when filters change
  useEffect(() => {
    setPosts([])
    setPage(1)
    pageRef.current = 1
    setHasMore(true)
    loadingRef.current = false
    loadPosts(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, sort])

  // Infinite scroll
  useEffect(() => {
    const handle = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 600 &&
        hasMore && !isLoadingMore
      ) loadPosts()
    }
    window.addEventListener('scroll', handle)
    return () => window.removeEventListener('scroll', handle)
  }, [hasMore, isLoadingMore, loadPosts])

  const handleDelete = (id: string) => setPosts(prev => prev.filter(p => p._id !== id))

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
    </div>
  )

  return (
    <>
      {/* Active filter badges */}
      {(category || query) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {category && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Categoría: {category}
              <a href="/" className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></a>
            </span>
          )}
          {query && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Búsqueda: "{query}"
              <a href="/" className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></a>
            </span>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {category || query ? 'Sin resultados' : 'Sin posts todavía'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {category || query ? 'Prueba con otros filtros.' : '¡Sé el primero en compartir algo!'}
          </p>
          <Button onClick={() => loadPosts(true)} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />Actualizar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              onImageClick={setLightboxImage}
              onDelete={handleDelete}
            />
          ))}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Has llegado al final</p>
          )}
        </div>
      )}

      <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </>
  )
}
