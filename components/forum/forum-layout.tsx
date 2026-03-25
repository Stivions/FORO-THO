'use client'

import { useState, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Navbar } from './navbar'
import { LeftSidebar } from './left-sidebar'
import { RightSidebar } from './right-sidebar'
import { CreatePostModal } from './create-post-modal'
import { PostFeed } from './post-feed'

interface ForumLayoutProps {
  children?: React.ReactNode
  sort?: 'latest' | 'popular'
  showRightSidebar?: boolean
}

export function ForumLayout({ children, sort, showRightSidebar = true }: ForumLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      <div className="flex">
        {/* Left Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-sidebar transform transition-transform duration-200 ease-in-out',
          'lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:shrink-0',
          isMobileMenuOpen ? 'translate-x-0 top-14' : '-translate-x-full'
        )}>
          <LeftSidebar 
            onCreatePost={() => {
              setIsCreatePostOpen(true)
              setIsMobileMenuOpen(false)
            }}
          />
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex gap-6">
              {/* Content */}
              <div key={feedKey} className="flex-1 min-w-0">
                {children ?? (
                  <Suspense fallback={null}>
                    <PostFeed sort={sort} />
                  </Suspense>
                )}
              </div>

              {/* Right Sidebar */}
              {showRightSidebar && (
                <div className="hidden xl:block w-80 flex-shrink-0">
                  <div className="sticky top-20">
                    <RightSidebar />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => setFeedKey(k => k + 1)}
      />
    </div>
  )
}
