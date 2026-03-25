export function PostSkeleton() {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderLeft: '2px solid #00fff520',
        borderRadius: '4px',
        padding: '1rem',
      }}
    >
      <div className="flex gap-3 animate-pulse">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 min-w-[32px]">
          <div className="h-7 w-7 rounded" style={{ background: '#00fff510' }} />
          <div className="h-3 w-5 rounded" style={{ background: '#00fff510' }} />
          <div className="h-7 w-7 rounded" style={{ background: '#00fff510' }} />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full" style={{ background: '#00fff510' }} />
            <div className="h-3 w-20 rounded" style={{ background: '#00fff510' }} />
            <div className="h-3 w-10 rounded ml-auto" style={{ background: '#00fff510' }} />
          </div>
          <div className="h-5 w-2/3 rounded" style={{ background: '#00fff510' }} />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded" style={{ background: '#00fff508' }} />
            <div className="h-3 w-5/6 rounded" style={{ background: '#00fff508' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-3 w-12 rounded" style={{ background: '#00fff508' }} />
            <div className="h-3 w-16 rounded" style={{ background: '#00fff508' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
