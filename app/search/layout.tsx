import { ForumLayout } from '@/components/forum/forum-layout'

export const metadata = { title: 'Buscar — Forum' }

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <ForumLayout>{children}</ForumLayout>
}
