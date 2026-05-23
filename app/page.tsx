const CURRENT_SITE = 'https://forosas.dev'

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(0,255,245,0.16), transparent 34%), linear-gradient(135deg, #020405 0%, #050813 100%)',
        fontFamily: 'monospace',
      }}
    >
      <section
        className="w-full max-w-xl text-center relative"
        style={{
          border: '1px solid rgba(0,255,245,0.32)',
          background: 'rgba(0,0,0,0.68)',
          boxShadow: '0 0 44px rgba(0,255,245,0.13)',
          padding: '3rem 1.5rem',
        }}
      >
        <div className="absolute top-0 left-0 w-5 h-5 border-t border-l" style={{ borderColor: '#00fff5' }} />
        <div className="absolute top-0 right-0 w-5 h-5 border-t border-r" style={{ borderColor: '#00fff5' }} />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l" style={{ borderColor: '#00fff5' }} />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r" style={{ borderColor: '#00fff5' }} />

        <p
          className="uppercase mb-4"
          style={{
            color: 'rgba(0,255,245,0.62)',
            fontSize: '0.78rem',
            letterSpacing: '0.18em',
          }}
        >
          FOROSAS
        </p>

        <h1
          className="uppercase font-bold mb-5"
          style={{
            color: '#00fff5',
            fontSize: 'clamp(2rem, 8vw, 4.25rem)',
            letterSpacing: '0.08em',
            textShadow: '0 0 12px rgba(0,255,245,0.76), 0 0 34px rgba(0,255,245,0.28)',
            lineHeight: 1,
          }}
        >
          Nos movimos
        </h1>

        <p
          className="mx-auto mb-8"
          style={{
            maxWidth: '28rem',
            color: 'rgba(218,255,253,0.78)',
            fontSize: '1rem',
            lineHeight: 1.7,
          }}
        >
          La pagina actual de FOROSAS ahora esta en forosas.dev.
        </p>

        <a
          href={CURRENT_SITE}
          className="inline-flex items-center justify-center uppercase"
          style={{
            minHeight: '3.35rem',
            width: 'min(100%, 22rem)',
            border: '1px solid #00fff5',
            color: '#00fff5',
            background: 'rgba(0,255,245,0.08)',
            boxShadow: '0 0 22px rgba(0,255,245,0.20)',
            letterSpacing: '0.14em',
            fontWeight: 700,
          }}
        >
          Ir a forosas.dev
        </a>
      </section>
    </main>
  )
}
