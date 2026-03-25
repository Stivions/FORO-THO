'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Crown, Star, Lock, Zap, Shield, Users, ArrowLeft, Copy, Check } from 'lucide-react'

const BENEFITS = [
  { icon: Star,   text: 'Acceso a contenido exclusivo VIP' },
  { icon: Crown,  text: 'Badge VIP dorado en tu perfil' },
  { icon: Shield, text: 'Soporte prioritario del equipo' },
  { icon: Zap,    text: 'Acceso a sorteos especiales' },
  { icon: Users,  text: 'Archivos y recursos premium de la comunidad' },
]

function VipPageInner() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loadingPayPal, setLoadingPayPal] = useState(false)
  const [cryptoTxHash, setCryptoTxHash]   = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC')
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false)
  const [cryptoMsg, setCryptoMsg]         = useState('')
  const [copiedAddr, setCopiedAddr]       = useState<string | null>(null)

  const success   = searchParams.get('success') === '1'
  const cancelled = searchParams.get('cancelled') === '1'
  const failed    = searchParams.get('failed') === '1'

  const user = session?.user as any
  const isVip = user?.vip === true

  const BTC_ADDR  = 'bc1q4v4nx95l5dxc7gauh8ep057f2lqxrcqcsag5t6'
  const ETH_ADDR  = '0xf9e6DF80e2834889Fb1384d291448735E8961548'
  const USDT_ADDR = 'Dirección USDT no configurada'

  const handlePayPal = async () => {
    if (!session) { router.push('/login'); return }
    setLoadingPayPal(true)
    try {
      const res = await fetch('/api/vip/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl
      } else {
        alert('Error al crear la orden de PayPal. Intenta de nuevo.')
      }
    } catch {
      alert('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoadingPayPal(false)
    }
  }

  const handleCrypto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) { router.push('/login'); return }
    if (!cryptoTxHash.trim()) { setCryptoMsg('Ingresa el hash de tu transacción'); return }
    setCryptoSubmitting(true)
    setCryptoMsg('')
    try {
      const res = await fetch('/api/vip/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cryptoTxHash, cryptoCurrency }),
      })
      const data = await res.json()
      if (res.ok) {
        setCryptoMsg('✅ ' + data.message)
        setCryptoTxHash('')
      } else {
        setCryptoMsg('❌ ' + (data.error ?? 'Error al enviar'))
      }
    } catch {
      setCryptoMsg('❌ Error de conexión')
    } finally {
      setCryptoSubmitting(false)
    }
  }

  const copyAddr = async (addr: string) => {
    await navigator.clipboard.writeText(addr).catch(() => {})
    setCopiedAddr(addr)
    setTimeout(() => setCopiedAddr(null), 2000)
  }

  const goldGlow = '0 0 20px #ffaa0040, 0 0 40px #ffaa0010'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', padding: '2rem 1rem', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Back */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#00fff560', fontSize: '12px', letterSpacing: '0.1em', textDecoration: 'none', marginBottom: '2rem' }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> VOLVER AL FORO
        </Link>

        {/* Status messages */}
        {success && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ffaa0060', background: '#ffaa0010', borderRadius: '4px', color: '#ffaa00', fontSize: '14px', textAlign: 'center' }}>
            🎉 ¡Pago completado! Tu membresía VIP ya está activa. ¡Bienvenido a la élite!
          </div>
        )}
        {cancelled && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ff9500', background: '#ff950010', borderRadius: '4px', color: '#ff9500', fontSize: '14px', textAlign: 'center' }}>
            ⚠ Pago cancelado. Puedes intentarlo de nuevo cuando quieras.
          </div>
        )}
        {failed && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ff003c', background: '#ff003c10', borderRadius: '4px', color: '#ff003c', fontSize: '14px', textAlign: 'center' }}>
            ❌ El pago no se completó. Contacta al soporte si fue un error.
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#ffaa0015', border: '2px solid #ffaa0040', marginBottom: '1rem', boxShadow: goldGlow }}>
            <Crown style={{ color: '#ffaa00', width: 32, height: 32 }} />
          </div>
          <h1 style={{ color: '#ffaa00', fontSize: '28px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: goldGlow, margin: 0 }}>
            MEMBRESÍA VIP
          </h1>
          <p style={{ color: '#00fff560', fontSize: '12px', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
            SKILL ALL SHOW · ACCESO EXCLUSIVO
          </p>
        </div>

        {/* Current VIP status */}
        {status === 'authenticated' && isVip && (
          <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ffaa0050', background: '#ffaa0008', borderRadius: '4px', textAlign: 'center' }}>
            <Crown style={{ color: '#ffaa00', width: 20, height: 20, display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
            <span style={{ color: '#ffaa00', fontSize: '14px' }}>
              Ya eres miembro VIP
              {user?.vipExpiresAt && (
                <span style={{ color: '#ffaa0080', fontSize: '12px', marginLeft: '8px' }}>
                  · Expira: {new Date(user.vipExpiresAt).toLocaleDateString('es-ES')}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Benefits */}
        <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #ffaa0030', background: '#ffaa0005', borderRadius: '4px' }}>
          <h2 style={{ color: '#ffaa00', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 1rem 0' }}>
            {'// BENEFICIOS VIP'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon style={{ color: '#ffaa00', width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ color: '#c8c8d8', fontSize: '13px' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price card */}
        <div style={{ marginBottom: '2rem', padding: '2rem', border: '2px solid #ffaa0040', background: '#ffaa0008', borderRadius: '4px', textAlign: 'center', boxShadow: goldGlow }}>
          <div style={{ color: '#ffaa00', fontSize: '42px', fontWeight: 900, letterSpacing: '-0.02em', textShadow: goldGlow }}>
            $8 USD
          </div>
          <div style={{ color: '#ffaa0080', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
            POR MES · SIN CONTRATOS
          </div>

          {/* PayPal Button */}
          <button
            onClick={handlePayPal}
            disabled={loadingPayPal}
            style={{
              width: '100%', padding: '14px', background: '#0070ba', border: 'none', borderRadius: '4px',
              color: '#fff', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700,
              letterSpacing: '0.1em', cursor: loadingPayPal ? 'wait' : 'pointer',
              opacity: loadingPayPal ? 0.7 : 1, transition: 'opacity 0.2s', marginBottom: '0.75rem',
            }}
          >
            {loadingPayPal ? '> REDIRIGIENDO...' : '> PAGAR CON PAYPAL'}
          </button>
          <p style={{ color: '#00fff530', fontSize: '11px', margin: 0 }}>
            Pago seguro con PayPal · Activa en minutos
          </p>
        </div>

        {/* Crypto section */}
        <div style={{ padding: '1.5rem', border: '1px solid #00fff520', background: '#00fff505', borderRadius: '4px' }}>
          <h2 style={{ color: '#00fff5', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 1.25rem 0' }}>
            {'// PAGO CON CRIPTO'}
          </h2>
          <p style={{ color: '#00fff560', fontSize: '12px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Envía exactamente $8 USD equivalente a la dirección de la moneda que elijas, luego llena el formulario con el hash de tu transacción.
          </p>

          {/* Addresses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'BTC', addr: BTC_ADDR },
              { label: 'ETH', addr: ETH_ADDR },
              { label: 'USDT (ERC-20 / TRC-20)', addr: USDT_ADDR },
            ].map(({ label, addr }) => (
              <div key={label} style={{ padding: '10px 12px', border: '1px solid #00fff520', background: '#00fff508', borderRadius: '4px' }}>
                <div style={{ color: '#00fff5', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#c8c8d8', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>{addr}</span>
                  <button
                    onClick={() => copyAddr(addr)}
                    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: copiedAddr === addr ? '#00ff88' : '#00fff560', padding: '2px' }}
                    title="Copiar"
                  >
                    {copiedAddr === addr ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Crypto form */}
          <form onSubmit={handleCrypto} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', color: '#00fff560', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '6px' }}>
                MONEDA ENVIADA
              </label>
              <select
                value={cryptoCurrency}
                onChange={e => setCryptoCurrency(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: '#0a0a14',
                  border: '1px solid #00fff530', color: '#c8c8d8', fontFamily: 'monospace',
                  fontSize: '13px', borderRadius: '4px', outline: 'none',
                }}
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#00fff560', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '6px' }}>
                HASH DE LA TRANSACCIÓN
              </label>
              <input
                type="text"
                value={cryptoTxHash}
                onChange={e => setCryptoTxHash(e.target.value)}
                placeholder="0x... o txid..."
                style={{
                  width: '100%', padding: '10px 12px', background: '#0a0a14',
                  border: '1px solid #00fff530', color: '#c8c8d8', fontFamily: 'monospace',
                  fontSize: '13px', borderRadius: '4px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {cryptoMsg && (
              <div style={{ color: cryptoMsg.startsWith('✅') ? '#00ff88' : '#ff003c', fontSize: '13px', padding: '8px 12px', border: `1px solid ${cryptoMsg.startsWith('✅') ? '#00ff8840' : '#ff003c40'}`, borderRadius: '4px', background: cryptoMsg.startsWith('✅') ? '#00ff8808' : '#ff003c08' }}>
                {cryptoMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={cryptoSubmitting}
              style={{
                padding: '12px', background: '#00fff510', border: '1px solid #00fff550',
                color: '#00fff5', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.1em', cursor: cryptoSubmitting ? 'wait' : 'pointer',
                opacity: cryptoSubmitting ? 0.7 : 1, borderRadius: '4px', transition: 'all 0.2s',
              }}
            >
              {cryptoSubmitting ? '> ENVIANDO...' : '> ENVIAR COMPROBANTE'}
            </button>
            <p style={{ color: '#00fff530', fontSize: '11px', margin: 0, textAlign: 'center' }}>
              El admin revisará tu pago y activará tu VIP manualmente (generalmente en menos de 24h).
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function VipPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00fff5', fontFamily: 'monospace' }}>Cargando...</div>}>
      <VipPageInner />
    </Suspense>
  )
}
