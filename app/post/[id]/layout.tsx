import { ForumLayout } from '@/components/forum/forum-layout'

export default function PostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ForumLayout>{children}</ForumLayout>
}
