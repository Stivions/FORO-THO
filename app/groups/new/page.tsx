'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react'

export default function NewGroupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [name,    setName]    = useState('')
  const [desc,    setDesc]    = useState('')
  const [reason,  setReason]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Necesitas iniciar sesión</p>
        <Button asChild><Link href="/login">Iniciar sesión</Link></Button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, requestMessage: reason }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      setSuccess(true)
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <MessageSquare className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold">¡Solicitud enviada!</h2>
        <p className="text-muted-foreground text-sm">Tu solicitud fue enviada al admin. Te notificaremos cuando sea revisada.</p>
        <Button asChild variant="outline"><Link href="/groups"><ArrowLeft className="mr-2 h-4 w-4" />Volver a grupos</Link></Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/groups"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Solicitar nuevo grupo</h1>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre del grupo *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Club de Programación"
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descripción *</label>
              <Textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="¿De qué trata el grupo?"
                maxLength={300}
                rows={3}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">¿Por qué quieres crear este grupo?</label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explica brevemente al admin el propósito del grupo..."
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving || !name.trim() || !desc.trim()}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar solicitud'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
