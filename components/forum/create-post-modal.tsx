'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageIcon, Video, X, Upload, Loader2, Link2 } from 'lucide-react'
import { useCategories } from '@/hooks/use-categories'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: () => void
}

// Convierte cualquier link de Drive al formato embed /preview
function toDriveEmbed(link: string): string | null {
  const match = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
  if (!match) return null
  return `https://drive.google.com/file/d/${match[1]}/preview`
}

type MediaMode = 'none' | 'image' | 'drive'

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { categories } = useCategories()
  const [title,        setTitle]        = useState('')
  const [content,      setContent]      = useState('')
  const [category,     setCategory]     = useState('')
  const [tags,         setTags]         = useState<string[]>([])
  const [tagInput,     setTagInput]     = useState('')
  const [mediaMode,    setMediaMode]    = useState<MediaMode>('none')
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [driveLink,    setDriveLink]    = useState('')
  const [isDragging,   setIsDragging]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading,  setIsUploading]  = useState(false)
  const [error,        setError]        = useState('')

  const driveEmbed = mediaMode === 'drive' ? toDriveEmbed(driveLink) : null
  const driveValid  = driveEmbed !== null

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setMediaMode('image')
    }
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setMediaMode('image')
    }
  }

  const removeMedia = () => {
    setImageFile(null)
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null) }
    setDriveLink('')
    setMediaMode('none')
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (tag && !tags.includes(tag) && tags.length < 5) { setTags([...tags, tag]); setTagInput('') }
  }

  const resetForm = () => {
    setTitle(''); setContent(''); setCategory('')
    setTags([]); setTagInput(''); setError(''); removeMedia()
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !category) return
    setIsSubmitting(true); setError('')
    try {
      let mediaUrl = ''; let mediaType = ''

      if (mediaMode === 'image' && imageFile) {
        setIsUploading(true)
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': imageFile.type,
            'X-Filename': encodeURIComponent(imageFile.name),
          },
          body: imageFile,
        })
        const upData = await upRes.json()
        setIsUploading(false)
        if (!upRes.ok) { setError(upData.error); return }
        mediaUrl  = upData.url
        mediaType = 'image'
      } else if (mediaMode === 'drive' && driveEmbed) {
        mediaUrl  = driveEmbed
        mediaType = 'video'
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, tags, mediaUrl, mediaType }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      resetForm(); onClose(); onPostCreated?.()
    } catch {
      setError('Error al publicar')
    } finally {
      setIsSubmitting(false); setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Crear Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Input
              placeholder="Título del post"
              value={title} onChange={e => setTitle(e.target.value)}
              className="text-lg font-medium bg-secondary border-border focus:border-primary"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/200</p>
          </div>

          <Textarea
            placeholder="Escribe tu post aquí..."
            value={content} onChange={e => setContent(e.target.value)}
            className="min-h-[150px] bg-secondary border-border focus:border-primary resize-none"
          />

          {/* Media */}
          {mediaMode === 'none' && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 transition-colors text-center',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2 mx-auto" />
              <p className="text-sm text-foreground mb-3">Añadir imagen o video de Drive</p>
              <div className="flex gap-2 justify-center">
                <label>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <Button variant="outline" size="sm" asChild>
                    <span><ImageIcon className="h-4 w-4 mr-2" />Imagen</span>
                  </Button>
                </label>
                <Button variant="outline" size="sm" onClick={() => setMediaMode('drive')}>
                  <Video className="h-4 w-4 mr-2" />Video de Drive
                </Button>
              </div>
            </div>
          )}

          {mediaMode === 'image' && imagePreview && (
            <div className="relative border rounded-lg overflow-hidden">
              <img src={imagePreview} alt="preview" className="w-full max-h-64 object-contain" />
              <Button variant="secondary" size="icon" className="absolute top-2 right-2" onClick={removeMedia}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {mediaMode === 'drive' && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Pega el link de Google Drive (compartir → Cualquiera con el link)"
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="bg-secondary border-border focus:border-primary"
                />
                <Button variant="ghost" size="icon" onClick={removeMedia}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {driveLink && !driveValid && (
                <p className="text-xs text-destructive">Link inválido. Asegúrate de copiar el link de compartir de Drive.</p>
              )}
              {driveValid && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-secondary">
                  <iframe src={driveEmbed!} className="w-full h-full" allow="autoplay" allowFullScreen />
                </div>
              )}
              {!driveLink && (
                <p className="text-xs text-muted-foreground">
                  En Drive: clic derecho en el video → Compartir → "Cualquiera con el link" → Copiar link
                </p>
              )}
            </div>
          )}

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Añadir tags (Enter)"
                value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                className="bg-secondary border-border" maxLength={20}
              />
              <Button variant="outline" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 5}>Añadir</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    #{tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{tags.length}/5 tags</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || !category || isSubmitting || (mediaMode === 'drive' && !driveValid)}
            >
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subiendo imagen...</>
               : isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publicando...</>
               : 'Publicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
