import { ForumLayout } from '@/components/forum/forum-layout'

export const metadata = { title: 'Mensajes — Forum' }

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <ForumLayout showRightSidebar={false}>{children}</ForumLayout>
}
