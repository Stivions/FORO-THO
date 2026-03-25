'use client'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface VipLockProps {
  title: string
  preview?: string
}

export function VipLock({ title, preview }: VipLockProps) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '4px', border: '1px solid #ffaa0040', background: '#ffaa0008' }}>
      {/* blurred preview text */}
      {preview && (
        <p style={{ filter: 'blur(4px)', userSelect: 'none', color: 'var(--muted-foreground)', fontSize: '13px', padding: '0.75rem 1rem', lineHeight: 1.6 }}>
          {preview}
        </p>
      )}
      {/* lock overlay */}
      <div style={{
        position: preview ? 'absolute' : 'relative',
        inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: preview ? 'linear-gradient(to top, #0a0a14ee 60%, transparent)' : 'transparent',
        padding: '1.5rem 1rem', gap: '0.5rem',
        minHeight: preview ? undefined : '80px',
      }}>
        <Lock style={{ color: '#ffaa00', width: 20, height: 20 }} />
        <span style={{ color: '#ffaa00', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700 }}>
          CONTENIDO VIP
        </span>
        <Link href="/vip" style={{
          marginTop: '0.25rem',
          background: '#ffaa0015', border: '1px solid #ffaa0050',
          color: '#ffaa00', fontFamily: 'monospace', fontSize: '11px',
          letterSpacing: '0.1em', padding: '5px 16px', cursor: 'pointer',
          textDecoration: 'none', display: 'inline-block',
          transition: 'all 0.2s',
        }}>
          DESBLOQUEAR · $8/MES
        </Link>
      </div>
    </div>
  )
}
