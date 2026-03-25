import { ForumLayout } from '@/components/forum/forum-layout'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ForumLayout showRightSidebar={false}>{children}</ForumLayout>
}
