'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface MentionUser {
  _id: string
  username: string
  displayName?: string
  avatar?: string
  badges?: string[]
}

interface MentionInputProps {
  value: string
  onChange: (val: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  minHeight?: string
  /** Users to suggest first (e.g. group members) before hitting the search API */
  localUsers?: MentionUser[]
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  style,
  minHeight = '80px',
  localUsers,
}: MentionInputProps) {
  const [suggestions, setSuggestions]   = useState<MentionUser[]>([])
  const [selectedIdx, setSelectedIdx]   = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /** Returns the active @mention being typed at cursor, or null */
  const getActiveMention = (text: string, cursor: number) => {
    const before = text.slice(0, cursor)
    const match  = before.match(/@(\w*)$/)
    if (!match) return null
    return { query: match[1], start: cursor - match[0].length }
  }

  const closeSuggestions = useCallback(() => {
    setSuggestions([])
    setMentionStart(null)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val    = e.target.value
    const cursor = e.target.selectionStart ?? val.length
    onChange(val)

    const active = getActiveMention(val, cursor)
    if (active) {
      setMentionStart(active.start)
      setSelectedIdx(0)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const q = active.query.toLowerCase()
        // Match local users (group members + thobot) first
        const local = (localUsers ?? []).filter(u =>
          u.username.toLowerCase().includes(q) ||
          (u.displayName ?? '').toLowerCase().includes(q)
        )
        if (active.query.length === 0) { setSuggestions(local.slice(0, 6)); return }
        try {
          const res  = await fetch(`/api/users/search?q=${encodeURIComponent(active.query)}`)
          const data = await res.json()
          const remote: MentionUser[] = data.users ?? []
          // Merge: local first, then remote (deduplicated)
          const localIds = new Set(local.map(u => u._id))
          const merged = [...local, ...remote.filter(u => !localIds.has(u._id))]
          setSuggestions(merged.slice(0, 8))
        } catch { setSuggestions(local.slice(0, 6)) }
      }, 180)
    } else {
      closeSuggestions()
    }
  }, [onChange])

  const insertMention = useCallback((username: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const cursor = ta.selectionStart ?? value.length
    const before = value.slice(0, cursor)
    const after  = value.slice(cursor)
    const match  = before.match(/@(\w*)$/)
    if (!match) return
    const newBefore = before.slice(0, before.length - match[0].length) + `@${username} `
    onChange(newBefore + after)
    closeSuggestions()
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = newBefore.length
    }, 0)
  }, [value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(suggestions[selectedIdx].username); return }
      if (e.key === 'Escape') { closeSuggestions(); return }
    }
    onKeyDown?.(e)
  }, [suggestions, selectedIdx, insertMention, onKeyDown])

  // Close on outside click
  useEffect(() => {
    const h = () => closeSuggestions()
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative flex-1 min-w-0" onMouseDown={e => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className,
        )}
        style={{ minHeight, ...style }}
      />

      {suggestions.length > 0 && (
        <div className="absolute z-[300] left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((u, i) => (
            <button
              key={u._id}
              type="button"
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors',
                i === selectedIdx ? 'bg-muted' : 'hover:bg-muted/60'
              )}
              onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}
            >
              <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold shrink-0 overflow-hidden">
                {u.avatar
                  ? <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                  : u.username.slice(0, 2).toUpperCase()
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-medium truncate">{u.displayName ?? u.username}</span>
                  {u.badges?.includes('verified') && (
                    <span className="text-[9px] bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full px-1 leading-4 font-semibold">✓</span>
                  )}
                  {u.badges?.includes('bot') && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded px-1 leading-4">BOT</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
