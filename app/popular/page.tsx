import { ForumLayout } from '@/components/forum/forum-layout'

export const metadata = { title: 'Popular — Forum' }

export default function PopularPage() {
  return <ForumLayout sort="popular" />
}
