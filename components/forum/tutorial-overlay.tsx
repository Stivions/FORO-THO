'use client'

import { useState, useEffect } from 'react'
import {
  X, ChevronRight, ChevronLeft, Zap, MessageSquare, Upload,
  Heart, Bell, Users, Shield, Award, SkipForward,
} from 'lucide-react'

const STORAGE_KEY = 'dedsec_tutorial_seen'

interface Step {
  icon: React.ReactNode
  title: string
  description: string
  extra?: string
}

const STEPS: Step[] = [
  {
    icon: <Zap className="h-8 w-8" style={{ color: '#00fff5' }} />,
    title: 'BIENVENIDO A SKILL ALL SHOW',
    description:
      'Este es el foro de la comunidad DedSec. Un espacio libre donde puedes compartir conocimiento, proyectos, recursos y conectarte con otros miembros.',
    extra: 'Aquí cada voz importa — sin filtros, sin censura innecesaria.',
  },
  {
    icon: <MessageSquare className="h-8 w-8" style={{ color: '#00fff5' }} />,
    title: 'POSTS Y COMENTARIOS',
    description:
      'Crea posts con título, contenido y categoría. Los posts de solo texto se publican al instante. Puedes comentar, responder y votar (↑↓) para destacar el mejor contenido.',
    extra: 'Usa #tags para organizar tu contenido y facilitar la búsqueda.',
  },
  {
    icon: <Upload className="h-8 w-8" style={{ color: '#00fff5' }} />,
    title: 'COMPARTE LO QUE QUIERAS',
    description:
      'Puedes subir imágenes, PDFs, videos, ZIPs, ejecutables, código, herramientas y cualquier archivo hasta 500 MB. También puedes incrustar videos de Google Drive.',
    extra:
      'Solo una regla: que aporte a la comunidad. Posts con archivos o links pasan por revisión rápida de moderadores antes de publicarse.',
  },
  {
    icon: <Heart className="h-8 w-8" style={{ color: '#ff4d7d' }} />,
    title: 'LIKES Y VOTOS',
    description:
      'Dale like ♥ a los posts que te gusten. Vota ↑ o ↓ para subir o bajar el score de un post en el ranking. Los más votados aparecen en "Popular".',
    extra: 'Tu perfil acumula reputación según los votos que recibas.',
  },
  {
    icon: <Bell className="h-8 w-8" style={{ color: '#ffaa00' }} />,
    title: 'NOTIFICACIONES EN TIEMPO REAL',
    description:
      'Recibe notificaciones cuando alguien te mencione con @usuario, comente en tu post, te siga, te envíe un mensaje directo, o cuando tu post sea aprobado/rechazado.',
    extra: 'El icono 🔔 en la barra superior muestra cuántas tienes sin leer.',
  },
  {
    icon: <Users className="h-8 w-8" style={{ color: '#aa44ff' }} />,
    title: 'COMUNIDAD Y SALAS DE VOZ',
    description:
      'Sigue a otros miembros, envía mensajes directos y únete a salas de voz en tiempo real para hablar con la comunidad mientras navegas el foro.',
    extra: 'Los grupos y canales te permiten organizar conversaciones por tema.',
  },
  {
    icon: <Award className="h-8 w-8" style={{ color: '#ffcc00' }} />,
    title: 'BADGES Y REPUTACIÓN',
    description:
      'Gana badges especiales por ser de los primeros en unirte, por tu actividad y por contribuciones destacadas. Aparecen en tu perfil y junto a tu nombre.',
    extra: '¿Eres de los primeros 10 usuarios? Tienes el badge "FIRST_USER" de fundador.',
  },
  {
    icon: <Shield className="h-8 w-8" style={{ color: '#ff4444' }} />,
    title: 'MODERACIÓN CON IA',
    description:
      'Todos los posts pasan por un análisis de IA (GROQ) que clasifica el contenido como bueno, sospechoso o con posibles amenazas. Los admins ven el veredicto en cada post.',
    extra:
      'Si tu post tiene archivos o links, un admin lo revisa antes de publicarlo. Generalmente tarda menos de unos minutos.',
  },
]

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false)
  const [step, setStep]       = useState(0)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) setVisible(true)
  }, [])

  const dismiss = () => {
    setClosing(true)
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1')
      setVisible(false)
      setClosing(false)
    }, 400)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.4s ease',
        fontFamily: 'monospace',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%', maxWidth: '480px',
          background: '#08080f',
          border: '1px solid #00fff540',
          position: 'relative',
          padding: '2rem',
        }}
      >
        {/* Corner brackets */}
        <div style={{ position:'absolute', top:0, left:0,   width:12, height:12, borderTop:'2px solid #00fff5', borderLeft:'2px solid #00fff5' }} />
        <div style={{ position:'absolute', top:0, right:0,  width:12, height:12, borderTop:'2px solid #00fff5', borderRight:'2px solid #00fff5' }} />
        <div style={{ position:'absolute', bottom:0, left:0, width:12, height:12, borderBottom:'2px solid #00fff5', borderLeft:'2px solid #00fff5' }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderBottom:'2px solid #00fff5', borderRight:'2px solid #00fff5' }} />

        {/* Skip button */}
        <button
          onClick={dismiss}
          title="Saltar tutorial"
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'transparent', border: '1px solid #ffffff20',
            color: '#ffffff40', fontFamily: 'monospace', fontSize: '10px',
            letterSpacing: '0.08em', padding: '4px 8px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ff003c'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#ff003c40'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ffffff40'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#ffffff20'
          }}
        >
          <SkipForward className="h-3 w-3" />
          SALTAR
        </button>

        {/* Step counter */}
        <div style={{ color: '#00fff550', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>
          PASO {step + 1} / {STEPS.length}
        </div>

        {/* Progress bar */}
        <div style={{ height: '2px', background: '#00fff510', marginBottom: '1.75rem', position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              background: '#00fff5',
              boxShadow: '0 0 8px #00fff5',
              width: `${((step + 1) / STEPS.length) * 100}%`,
              transition: 'width 0.35s ease',
            }}
          />
        </div>

        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            flexShrink: 0,
            width: 48, height: 48,
            background: '#00fff508',
            border: '1px solid #00fff530',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {current.icon}
          </div>
          <h2 style={{
            color: '#00fff5',
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            lineHeight: 1.3,
            textShadow: '0 0 12px #00fff540',
            margin: 0,
            paddingTop: '4px',
          }}>
            {current.title}
          </h2>
        </div>

        {/* Description */}
        <p style={{
          color: '#cccccc',
          fontSize: '13px',
          lineHeight: 1.65,
          marginBottom: current.extra ? '1rem' : '1.75rem',
        }}>
          {current.description}
        </p>

        {/* Extra note */}
        {current.extra && (
          <div style={{
            background: '#00fff508',
            border: '1px solid #00fff520',
            padding: '0.6rem 0.8rem',
            marginBottom: '1.75rem',
            fontSize: '11px',
            color: '#00fff5b0',
            letterSpacing: '0.04em',
            lineHeight: 1.6,
          }}>
            {'> '}{current.extra}
          </div>
        )}

        {/* Dots */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 6, height: 6,
                background: i === step ? '#00fff5' : '#00fff530',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s',
                boxShadow: i === step ? '0 0 6px #00fff5' : 'none',
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {step > 0 && (
            <button
              onClick={prev}
              style={{
                flex: '0 0 auto',
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'transparent', border: '1px solid #00fff530',
                color: '#00fff5', fontFamily: 'monospace', fontSize: '11px',
                letterSpacing: '0.1em', padding: '8px 14px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#00fff510'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              ATRÁS
            </button>
          )}
          <button
            onClick={next}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: isLast ? '#00fff5' : '#00fff510',
              border: `1px solid ${isLast ? '#00fff5' : '#00fff560'}`,
              color: isLast ? '#000000' : '#00fff5',
              fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.12em', padding: '10px 20px', cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLast ? '0 0 20px #00fff540' : 'none',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = isLast ? '#00fff5' : '#00fff520'
              el.style.boxShadow = '0 0 20px #00fff540'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = isLast ? '#00fff5' : '#00fff510'
              el.style.boxShadow = isLast ? '0 0 20px #00fff540' : 'none'
            }}
          >
            {isLast ? (
              <>ENTRAR AL FORO <Zap className="h-3.5 w-3.5" /></>
            ) : (
              <>SIGUIENTE <ChevronRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
