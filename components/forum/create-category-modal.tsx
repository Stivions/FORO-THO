'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ICON_OPTIONS, getIcon } from '@/lib/icon-map'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateCategoryModal({ isOpen, onClose, onCreated }: CreateCategoryModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Hash')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon, description }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setName(''); setIcon('Hash'); setDescription('')
      onCreated()
    } catch {
      setError('Error al crear categoría')
    } finally {
      setIsSubmitting(false)
    }
  }

  const SelectedIcon = getIcon(icon)

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear categoría</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Input
              placeholder="Nombre de la categoría"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-secondary border-border"
              maxLength={50}
            />
          </div>

          <div>
            <Input
              placeholder="Descripción (opcional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-secondary border-border"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Icono</label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <SelectedIcon className="w-4 h-4" />
                    <span>{icon}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {ICON_OPTIONS.map(iconName => {
                  const Icon = getIcon(iconName)
                  return (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{iconName}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
