import { ForumLayout } from '@/components/forum/forum-layout'

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <ForumLayout showRightSidebar={false} fullHeight>{children}</ForumLayout>
}
