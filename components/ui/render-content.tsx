'use client'

import Link from 'next/link'

interface RenderContentProps {
  text: string
  className?: string
  userMap?: Record<string, string> // username → userId (for linking)
}

/**
 * Renders post/comment text, turning @username into clickable profile links.
 * userMap is optional — if not provided, link goes to /search?q=@username
 */
export function RenderContent({ text, className, userMap }: RenderContentProps) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]+$/.test(part)) {
          const username = part.slice(1)
          const href = userMap?.[username.toLowerCase()]
            ? `/profile/${userMap[username.toLowerCase()]}`
            : `/search?q=${encodeURIComponent(part)}`
          return (
            <Link
              key={i}
              href={href}
              className="text-primary font-medium hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
