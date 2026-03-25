'use client'

import Link from 'next/link'

interface RenderContentProps {
  text: string
  className?: string
  /** Pass true when rendering inside a primary-coloured bubble so @mention links stay visible */
  inverted?: boolean
}

/**
 * Renders post/comment text turning @username into clickable profile links.
 * Uses /u/[username] which server-redirects to /profile/[id].
 */
export function RenderContent({ text, className, inverted }: RenderContentProps) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]+$/.test(part)) {
          const username = part.slice(1)
          return (
            <Link
              key={i}
              href={`/u/${username}`}
              className={inverted
                ? 'text-white/90 font-semibold underline underline-offset-2 hover:text-white'
                : 'text-primary font-medium hover:underline'
              }
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
