'use client'

import { useState, useRef } from 'react'
import { Camera, X, Globe, MapPin, Twitter, Github, Instagram, Loader2 } from 'lucide-react'
import { invalidateCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ProfileData {
  _id: string
  username: string
  displayName?: string
  avatar?: string
  bannerUrl?: string
  bio?: string
  location?: string
  website?: string
  socialLinks?: { twitter?: string; github?: string; instagram?: string }
}

interface EditProfileModalProps {
  open: boolean
  onClose: () => void
  profile: ProfileData
  onSaved: (updated: ProfileData) => void
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.url
}

export function EditProfileModal({ open, onClose, profile, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState({
    displayName:  profile.displayName  ?? '',
    bio:          profile.bio          ?? '',
    location:     profile.location     ?? '',
    website:      profile.website      ?? '',
    twitter:      profile.socialLinks?.twitter   ?? '',
    github:       profile.socialLinks?.github    ?? '',
    instagram:    profile.socialLinks?.instagram ?? '',
    avatar:       profile.avatar    ?? '',
    bannerUrl:    profile.bannerUrl ?? '',
  })

  const [saving, setSaving]         = useState(false)
  const [uploadingAvatar, setUploadingAvatar]   = useState(false)
  const [uploadingBanner, setUploadingBanner]   = useState(false)
  const [error, setError]           = useState('')

  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, avatar: url }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, bannerUrl: url }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingBanner(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          bio:         form.bio,
          location:    form.location,
          website:     form.website,
          avatar:      form.avatar,
          bannerUrl:   form.bannerUrl,
          socialLinks: {
            twitter:   form.twitter,
            github:    form.github,
            instagram: form.instagram,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      invalidateCurrentUser()
      onSaved(data)
      onClose()
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5 mt-4">
          {/* Banner */}
          <div className="space-y-1">
            <Label>Banner</Label>
            <div
              className="relative h-28 rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 cursor-pointer group"
              onClick={() => bannerRef.current?.click()}
            >
              {form.bannerUrl && (
                <img src={form.bannerUrl} alt="banner" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingBanner
                  ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                  : <Camera className="h-6 w-6 text-white" />
                }
              </div>
              {form.bannerUrl && (
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black/80"
                  onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, bannerUrl: '' })) }}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />
          </div>

          {/* Avatar */}
          <div className="space-y-1">
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              <div
                className="relative cursor-pointer group"
                onClick={() => avatarRef.current?.click()}
              >
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={form.avatar} />
                  <AvatarFallback className="text-xl">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar
                    ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                    : <Camera className="h-5 w-5 text-white" />
                  }
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Haz click en la imagen</p>
                <p>JPG, PNG, GIF · max 5MB</p>
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <Label htmlFor="displayName">Nombre a mostrar</Label>
            <Input id="displayName" value={form.displayName} onChange={set('displayName')} placeholder={profile.username} maxLength={50} />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={set('bio')} placeholder="Cuéntanos algo sobre ti..." maxLength={200} rows={3} />
            <p className="text-xs text-muted-foreground text-right">{form.bio.length}/200</p>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label htmlFor="location">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Ubicación</span>
            </Label>
            <Input id="location" value={form.location} onChange={set('location')} placeholder="Ciudad, País" maxLength={60} />
          </div>

          {/* Website */}
          <div className="space-y-1">
            <Label htmlFor="website">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Sitio web</span>
            </Label>
            <Input id="website" value={form.website} onChange={set('website')} placeholder="https://tusitio.com" maxLength={100} />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <Label>Redes sociales</Label>
            <div className="flex items-center gap-2">
              <Twitter className="h-4 w-4 text-sky-400 flex-shrink-0" />
              <Input value={form.twitter} onChange={set('twitter')} placeholder="@usuario" maxLength={50} />
            </div>
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 flex-shrink-0" />
              <Input value={form.github} onChange={set('github')} placeholder="usuario de GitHub" maxLength={50} />
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-400 flex-shrink-0" />
              <Input value={form.instagram} onChange={set('instagram')} placeholder="@usuario" maxLength={50} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || uploadingAvatar || uploadingBanner}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
