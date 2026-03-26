'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'

interface Donation {
  _id: string
  displayName: string
  amount: number
  message: string
  createdAt: string
}

const PRESETS = [5, 10, 25, 50]

const CRYPTO_WALLETS = {
  BTC:  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ETH:  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  USDT: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
}

function DonateContent() {
  const searchParams = useSearchParams()
  const success  = searchParams.get('success') === '1'
  const cancelled = searchParams.get('cancelled') === '1'

  const { user, sessionId } = useCurrentUser()
  const [donations, setDonations] = useState<Donation[]>([])
  const [totalRaised, setTotalRaised] = useState(0)
  const [loading, setLoading]         = useState(true)

  const [amount, setAmount]         = useState<number>(10)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom]   = useState(false)
  const [message, setMessage]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Crypto donation state
  const [tab, setTab]               = useState<'paypal' | 'crypto'>('paypal')
  const [cryptoCoin, setCryptoCoin] = useState<'BTC' | 'ETH' | 'USDT'>('BTC')
  const [cryptoTxHash, setCryptoTxHash] = useState('')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [cryptoMsg, setCryptoMsg]   = useState('')
  const [cryptoName, setCryptoName] = useState('')
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false)
  const [cryptoSuccess, setCryptoSuccess] = useState(false)
  const [cryptoError, setCryptoError] = useState('')
  const [copied, setCopied]         = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      const name = (user as any).displayName || (user as any).username || ''
      setDisplayName(name)
      setCryptoName(name)
    }
  }, [user])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const handleCryptoDonate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCryptoError('')
    const amt = Number(cryptoAmount)
    if (!amt || amt < 1) { setCryptoError('Monto mínimo: $1'); return }
    if (!cryptoTxHash.trim()) { setCryptoError('Ingresa el hash de la transacción'); return }
    setCryptoSubmitting(true)
    try {
      const res = await fetch('/api/donations/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          cryptoTxHash: cryptoTxHash.trim(),
          cryptoCurrency: cryptoCoin,
          message: cryptoMsg.trim(),
          displayName: cryptoName.trim() || 'Anónimo',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCryptoSuccess(true)
        setCryptoTxHash('')
        setCryptoAmount('')
        setCryptoMsg('')
      } else {
        setCryptoError(data.error ?? 'Error al enviar')
      }
    } finally {
      setCryptoSubmitting(false)
    }
  }

  useEffect(() => {
    fetch('/api/donations')
      .then(r => r.json())
      .then(d => {
        setDonations((d.donations ?? []).slice(0, 10))
        setTotalRaised(d.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [success])

  const finalAmount = useCustom ? Number(customAmount) : amount

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!finalAmount || finalAmount < 5) {
      setError('El monto mínimo es $5')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/donations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          message: message.trim(),
          displayName: displayName.trim() || 'Anónimo',
        }),
      })
      const data = await res.json()
      if (res.ok && data.approvalUrl) {
        window.location.href = data.approvalUrl
      } else {
        setError(data.error ?? 'Error al procesar donación')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="font-mono text-xs transition-colors" style={{ color: '#00fff560' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
          >
            ← VOLVER
          </Link>
          <span style={{ color: '#00fff520' }}>|</span>
          <h1 className="font-mono font-bold tracking-widest" style={{ color: '#ffaa00', letterSpacing: '0.2em' }}>
            {'// APOYA LA COMUNIDAD'}
          </h1>
        </div>

        {/* Success/Cancel banners */}
        {success && (
          <div className="mb-6 p-4 rounded font-mono text-sm" style={{ background: '#00ff8815', border: '1px solid #00ff8840', color: '#00ff88' }}>
            ✓ ¡GRACIAS POR TU DONACIÓN! Tu apoyo ayuda a mantener Skill All Show activo y creciendo.
          </div>
        )}
        {cancelled && (
          <div className="mb-6 p-4 rounded font-mono text-sm" style={{ background: '#ff003c15', border: '1px solid #ff003c40', color: '#ff003c' }}>
            ✕ Donación cancelada. Puedes intentarlo de nuevo cuando quieras.
          </div>
        )}

        {/* Total raised */}
        <div className="relative mb-8 p-5 rounded text-center" style={{ background: '#ffaa0008', border: '1px solid #ffaa0030' }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#ffaa00' }} />

          <p className="font-mono text-xs mb-1 tracking-widest" style={{ color: '#ffaa0060' }}>TOTAL RECAUDADO</p>
          <div className="font-mono font-black" style={{ fontSize: '2.5rem', color: '#ffaa00', textShadow: '0 0 20px #ffaa0050', lineHeight: 1 }}>
            ${totalRaised.toFixed(2)}
          </div>
          <p className="font-mono text-xs mt-1" style={{ color: '#ffaa0060' }}>
            USD · Skill All Show
          </p>
        </div>

        {/* Subtitle */}
        <p className="font-mono text-sm text-center mb-8 leading-relaxed" style={{ color: '#c8fff870' }}>
          Tu donación ayuda a mantener el servidor, mejorar la plataforma<br />
          y crear más contenido para la comunidad de Skill All Show.
        </p>

        {/* Donation Form */}
        <div className="relative p-6 rounded mb-8" style={{ background: '#ffaa0006', border: '1px solid #ffaa0025' }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#ffaa00' }} />

          {/* Tab selector */}
          <div className="flex gap-2 mb-5">
            {(['paypal', 'crypto'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded font-mono text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? '#ffaa0025' : 'transparent',
                  border: `1px solid ${tab === t ? '#ffaa00' : '#ffaa0030'}`,
                  color: tab === t ? '#ffaa00' : '#ffaa0060',
                  letterSpacing: '0.1em',
                }}
              >
                {t === 'paypal' ? '💳 PAYPAL' : '₿ CRIPTO'}
              </button>
            ))}
          </div>

          {tab === 'crypto' ? (
            <div className="space-y-4">
              {/* Coin selector */}
              <div className="flex gap-2">
                {(['BTC', 'ETH', 'USDT'] as const).map(coin => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setCryptoCoin(coin)}
                    className="flex-1 py-2 rounded font-mono text-xs font-bold transition-all"
                    style={{
                      background: cryptoCoin === coin ? '#ffaa0020' : 'transparent',
                      border: `1px solid ${cryptoCoin === coin ? '#ffaa00' : '#ffaa0030'}`,
                      color: cryptoCoin === coin ? '#ffaa00' : '#ffaa0060',
                    }}
                  >
                    {coin}
                  </button>
                ))}
              </div>

              {/* Wallet address */}
              <div>
                <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#ffaa0080' }}>
                  DIRECCIÓN {cryptoCoin}
                </label>
                <div
                  className="flex items-center gap-2 p-3 rounded cursor-pointer transition-all"
                  style={{ background: '#ffaa0010', border: '1px solid #ffaa0030' }}
                  onClick={() => copyToClipboard(CRYPTO_WALLETS[cryptoCoin], cryptoCoin)}
                >
                  <span className="font-mono text-xs flex-1 break-all" style={{ color: '#ffaa00' }}>
                    {CRYPTO_WALLETS[cryptoCoin]}
                  </span>
                  <span className="font-mono text-xs shrink-0" style={{ color: copied === cryptoCoin ? '#00ff88' : '#ffaa0060' }}>
                    {copied === cryptoCoin ? '✓ COPIADO' : '📋 COPIAR'}
                  </span>
                </div>
              </div>

              {cryptoSuccess ? (
                <div className="p-4 rounded font-mono text-sm text-center" style={{ background: '#00ff8815', border: '1px solid #00ff8840', color: '#00ff88' }}>
                  ✓ ¡Donación registrada! El admin confirmará tu pago pronto.
                </div>
              ) : (
                <form onSubmit={handleCryptoDonate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-xs mb-1" style={{ color: '#ffaa0080' }}>MONTO (USD equiv.)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={cryptoAmount}
                        onChange={e => setCryptoAmount(e.target.value)}
                        placeholder="Ej: 10"
                        className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-xs mb-1" style={{ color: '#ffaa0080' }}>NOMBRE</label>
                      <input
                        value={cryptoName}
                        onChange={e => setCryptoName(e.target.value)}
                        placeholder="Anónimo"
                        className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-mono text-xs mb-1" style={{ color: '#ffaa0080' }}>HASH DE LA TRANSACCIÓN</label>
                    <input
                      value={cryptoTxHash}
                      onChange={e => setCryptoTxHash(e.target.value)}
                      placeholder="Pega el TX hash de tu envío..."
                      className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                      required
                    />
                  </div>
                  <textarea
                    value={cryptoMsg}
                    onChange={e => setCryptoMsg(e.target.value)}
                    maxLength={200}
                    rows={2}
                    placeholder="Mensaje opcional..."
                    className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-none"
                  />
                  {cryptoError && <p className="font-mono text-xs" style={{ color: '#ff003c' }}>{cryptoError}</p>}
                  <button
                    type="submit"
                    disabled={cryptoSubmitting}
                    className="w-full py-3 rounded font-mono text-sm font-bold transition-all"
                    style={{
                      background: '#ffaa0025',
                      border: '1px solid #ffaa00',
                      color: '#ffaa00',
                      letterSpacing: '0.1em',
                      boxShadow: '0 0 20px #ffaa0015',
                    }}
                  >
                    {cryptoSubmitting ? '> ENVIANDO...' : `> CONFIRMAR DONACIÓN ${cryptoCoin}`}
                  </button>
                  <p className="text-center font-mono text-xs" style={{ color: '#ffaa0040' }}>
                    Envía primero a la wallet · luego pega el TX hash aquí
                  </p>
                </form>
              )}
            </div>
          ) : (
          <form onSubmit={handleDonate} className="space-y-4">
            {/* Amount presets */}
            <div>
              <label className="block font-mono text-xs mb-2 tracking-widest" style={{ color: '#ffaa0080' }}>MONTO (USD)</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setAmount(p); setUseCustom(false) }}
                    className="py-2 rounded font-mono text-sm transition-all"
                    style={{
                      background: !useCustom && amount === p ? '#ffaa0025' : 'transparent',
                      border: `1px solid ${!useCustom && amount === p ? '#ffaa00' : '#ffaa0030'}`,
                      color: !useCustom && amount === p ? '#ffaa00' : '#ffaa0060',
                    }}
                  >
                    ${p}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  step="1"
                  placeholder="Otro monto (mín. $5)"
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setUseCustom(true) }}
                  onFocus={() => setUseCustom(true)}
                  className="dedsec-input flex-1 px-3 py-2 text-sm outline-none font-mono"
                  style={{ borderColor: useCustom ? '#ffaa00' : undefined }}
                />
                {useCustom && customAmount && (
                  <span className="font-mono text-lg font-bold" style={{ color: '#ffaa00' }}>
                    ${Number(customAmount).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#ffaa0080' }}>
                NOMBRE PARA MOSTRAR
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Anónimo"
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#ffaa0080' }}>
                MENSAJE (opcional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Deja un mensaje para la comunidad..."
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-none"
              />
              <p className="font-mono text-xs text-right" style={{ color: '#ffaa0040' }}>{message.length}/200</p>
            </div>

            {error && (
              <p className="font-mono text-xs" style={{ color: '#ff003c' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || finalAmount < 5}
              className="w-full py-3 rounded font-mono text-sm font-bold transition-all"
              style={{
                background: submitting ? '#ffaa0020' : '#ffaa0025',
                border: '1px solid #ffaa00',
                color: '#ffaa00',
                cursor: submitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.1em',
                textShadow: '0 0 12px #ffaa0050',
                boxShadow: '0 0 20px #ffaa0015',
              }}
            >
              {submitting
                ? '> REDIRIGIENDO A PAYPAL...'
                : `> DONAR $${finalAmount >= 5 ? (useCustom && customAmount ? Number(customAmount).toFixed(2) : amount.toFixed(2)) : '?'} USD`}
            </button>

            <p className="text-center font-mono text-xs" style={{ color: '#ffaa0040' }}>
              Pago seguro con PayPal · Sin cuenta requerida
            </p>
          </form>
          )}
        </div>

        {/* Recent Donors */}
        <div>
          <h2 className="font-mono text-sm font-semibold tracking-widest mb-4" style={{ color: '#ffaa00' }}>
            {'// DONADORES RECIENTES'}
          </h2>
          {loading ? (
            <p className="font-mono text-xs" style={{ color: '#ffaa0040' }}>{'> cargando...'}</p>
          ) : donations.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: '#ffaa0040' }}>{'> sé el primero en donar!'}</p>
          ) : (
            <div className="space-y-2">
              {donations.map(d => (
                <div
                  key={d._id}
                  className="flex items-start justify-between gap-3 p-3 rounded"
                  style={{ background: '#ffaa0008', border: '1px solid #ffaa0015' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold" style={{ color: '#ffaa00' }}>{d.displayName}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: '#00ff88' }}>${d.amount.toFixed(2)}</span>
                    </div>
                    {d.message && (
                      <p className="font-mono text-xs mt-0.5 truncate" style={{ color: '#c8fff870' }}>"{d.message}"</p>
                    )}
                    <p className="font-mono text-xs mt-0.5" style={{ color: '#ffaa0040' }}>
                      {new Date(d.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DonatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <p className="font-mono text-sm" style={{ color: '#ffaa0040' }}>{'> cargando...'}</p>
      </div>
    }>
      <DonateContent />
    </Suspense>
  )
}
