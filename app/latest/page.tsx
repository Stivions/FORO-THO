import { ForumLayout } from '@/components/forum/forum-layout'

export const metadata = { title: 'Últimos posts — Forum' }

export default function LatestPage() {
  return <ForumLayout sort="latest" />
}
