'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, X, Upload, Loader2, Link2, Download, Crown } from 'lucide-react'
import { useCategories } from '@/hooks/use-categories'
import { useCurrentUser } from '@/hooks/use-current-user'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: () => void
}

function toDriveEmbed(link: string): string | null {
  const match = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
  if (!match) return null
  return `https://drive.google.com/file/d/${match[1]}/preview`
}

type MediaMode = 'none' | 'image' | 'file' | 'drive'

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { categories } = useCategories()
  const { user } = useCurrentUser()
  const isAdmin = (user as any)?.role === 'admin'
  const isVip = (user as any)?.vip === true && (
    !(user as any)?.vipExpiresAt || new Date((user as any).vipExpiresAt) > new Date()
  )
  const canSeeVip = isVip || isAdmin
  const regularCategories = categories.filter(cat => cat.visibility !== 'vip')
  const vipCategories = categories.filter(cat => cat.visibility === 'vip')
  const [title,        setTitle]        = useState('')
  const [content,      setContent]      = useState('')
  const [category,     setCategory]     = useState('')
  const [tags,         setTags]         = useState<string[]>([])
  const [tagInput,     setTagInput]     = useState('')
  const [mediaMode,    setMediaMode]    = useState<MediaMode>('none')
  const [mediaFile,    setMediaFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [driveLink,    setDriveLink]    = useState('')
  const [isDragging,   setIsDragging]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading,  setIsUploading]  = useState(false)
  const [error,        setError]        = useState('')
  const [vtResult,     setVtResult]     = useState<any>(null)
  const [vipOnly,      setVipOnly]      = useState(false)

  const driveEmbed = mediaMode === 'drive' ? toDriveEmbed(driveLink) : null
  const driveValid  = driveEmbed !== null

  const handleFilePick = useCallback((file: File) => {
    setMediaFile(file)
    if (file.type.startsWith('image/')) {
      setImagePreview(URL.createObjectURL(file))
      setMediaMode('image')
    } else {
      setImagePreview(null)
      setMediaMode('file')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFilePick(file)
  }, [handleFilePick])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFilePick(file)
  }

  const removeMedia = () => {
    setMediaFile(null)
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
    setTags([]); setTagInput(''); setError(''); removeMedia(); setVipOnly(false)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !category) return
    setIsSubmitting(true); setError('')
    try {
      let mediaUrl = ''; let mediaType = ''

      if ((mediaMode === 'image' || mediaMode === 'file') && mediaFile) {
        setIsUploading(true)
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': mediaFile.type || 'application/octet-stream',
            'X-Filename': encodeURIComponent(mediaFile.name),
          },
          body: mediaFile,
        })
        const upData = await upRes.json()
        setIsUploading(false)
        if (!upRes.ok) { setError(upData.error); return }
        mediaUrl  = upData.url
        mediaType = upData.type ?? (mediaMode === 'image' ? 'image' : 'file')
        if (upData.vtResult) setVtResult(upData.vtResult)
      } else if (mediaMode === 'drive' && driveEmbed) {
        mediaUrl  = driveEmbed
        mediaType = 'video'
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, tags, mediaUrl, mediaType, vtAnalysis: vtResult, vipOnly }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      resetForm(); onClose()
      if (data.pending) {
        alert('✅ Tu post fue enviado y está pendiente de aprobación por un administrador. Te notificaremos cuando sea revisado.')
      } else {
        onPostCreated?.()
      }
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

          {/* ── Drop zone ── */}
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
              <p className="text-sm text-foreground mb-1">Arrastra aquí o elige un archivo</p>
              <p className="text-xs text-muted-foreground mb-3">Imágenes, PDFs, videos, ZIPs… hasta 500 MB</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <label>
                  <input type="file" accept="*/*" onChange={handleFileSelect} className="hidden" />
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" />Elegir archivo</span>
                  </Button>
                </label>
                <Button variant="outline" size="sm" onClick={() => setMediaMode('drive')}>
                  <Link2 className="h-4 w-4 mr-2" />Link de Drive
                </Button>
              </div>
            </div>
          )}

          {/* ── Image preview ── */}
          {mediaMode === 'image' && imagePreview && (
            <div className="relative border rounded-lg overflow-hidden">
              <img src={imagePreview} alt="preview" className="w-full max-h-64 object-contain" />
              <Button variant="secondary" size="icon" className="absolute top-2 right-2" onClick={removeMedia}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── File (non-image) preview ── */}
          {mediaMode === 'file' && mediaFile && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{mediaFile.name}</p>
                <p className="text-xs text-muted-foreground">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={removeMedia}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── Drive link ── */}
          {mediaMode === 'drive' && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Pega el link de Google Drive"
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="bg-secondary border-border focus:border-primary"
                />
                <Button variant="ghost" size="icon" onClick={removeMedia}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {driveLink && !driveValid && (
                <p className="text-xs text-destructive">Link inválido. Usa el link de compartir de Drive.</p>
              )}
              {driveValid && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-secondary">
                  <iframe src={driveEmbed!} className="w-full h-full" allow="autoplay" allowFullScreen />
                </div>
              )}
            </div>
          )}

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {regularCategories.map(cat => (
                <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
              ))}
              {canSeeVip && vipCategories.length > 0 && (
                <>
                  <div className="px-2 py-1.5 mt-1 flex items-center gap-1.5" style={{ borderTop: '1px solid #ffaa0030' }}>
                    <Crown style={{ width: 10, height: 10, color: '#ffaa00' }} />
                    <span className="text-[10px] font-mono font-semibold" style={{ color: '#ffaa0070', letterSpacing: '0.15em' }}>ZONA VIP</span>
                  </div>
                  {vipCategories.map(cat => (
                    <SelectItem key={cat._id} value={cat.name}>
                      <span className="flex items-center gap-1.5">
                        <Crown style={{ width: 10, height: 10, color: '#ffaa00', flexShrink: 0 }} />
                        <span style={{ color: '#ffaa00' }}>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
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

          {/* VIP Only toggle (admin only) */}
          {isAdmin && (
            <div
              className="flex items-center gap-3 p-3 rounded cursor-pointer select-none"
              style={{ border: `1px solid ${vipOnly ? '#ffaa0060' : '#ffaa0020'}`, background: vipOnly ? '#ffaa0010' : 'transparent', transition: 'all 0.2s' }}
              onClick={() => setVipOnly(v => !v)}
            >
              <Crown style={{ width: 16, height: 16, color: '#ffaa00', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-xs font-mono font-semibold" style={{ color: '#ffaa00' }}>Contenido VIP</p>
                <p className="text-xs font-mono" style={{ color: '#ffaa0060' }}>Solo miembros VIP podrán ver el contenido completo</p>
              </div>
              <div style={{
                width: 36, height: 20, borderRadius: 10, background: vipOnly ? '#ffaa00' : '#ffaa0030',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: vipOnly ? 18 : 3, transition: 'left 0.2s',
                }} />
              </div>
            </div>
          )}

          {/* Moderation warning */}
          {(mediaMode !== 'none' || /https?:\/\//i.test(content) || /https?:\/\//i.test(title)) && (
            <div className="flex items-start gap-2 p-3 rounded text-xs font-mono" style={{ background: '#ff950010', border: '1px solid #ff950040', color: '#ff9500' }}>
              <span>⚠</span>
              <span>Este post contiene archivos, imágenes o links y <strong>requiere aprobación de un administrador</strong> antes de publicarse. Los posts de solo texto se publican al instante.</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || !category || isSubmitting || (mediaMode === 'drive' && !driveValid)}
            >
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subiendo archivo...</>
               : isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
               : (mediaMode !== 'none' || /https?:\/\//i.test(content) || /https?:\/\//i.test(title))
                 ? '📨 Enviar para revisión'
                 : '🚀 Publicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
