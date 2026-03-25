// Mock data for the forum application
// TODO: Replace with real API calls to backend

export interface User {
  id: string
  username: string
  avatar: string
  bio?: string
  postsCount: number
  commentsCount: number
  likesCount: number
  joinedAt: string
}

export interface Post {
  id: string
  author: User
  title: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  category: string
  tags: string[]
  upvotes: number
  downvotes: number
  commentsCount: number
  createdAt: string
  isPinned?: boolean
}

export interface Comment {
  id: string
  author: User
  content: string
  likes: number
  createdAt: string
  replies?: Comment[]
}

export interface Notification {
  id: string
  type: 'comment' | 'like' | 'mention'
  message: string
  fromUser: User
  postId?: string
  read: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  icon: string
  postCount: number
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'alex_dev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    bio: 'Full-stack developer passionate about open source',
    postsCount: 42,
    commentsCount: 156,
    likesCount: 892,
    joinedAt: '2024-01-15',
  },
  {
    id: '2',
    username: 'sarah_codes',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    bio: 'UI/UX designer & frontend enthusiast',
    postsCount: 28,
    commentsCount: 89,
    likesCount: 445,
    joinedAt: '2024-02-20',
  },
  {
    id: '3',
    username: 'tech_mike',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
    bio: 'DevOps engineer | Cloud architecture',
    postsCount: 35,
    commentsCount: 234,
    likesCount: 678,
    joinedAt: '2023-11-10',
  },
  {
    id: '4',
    username: 'emma_gaming',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    bio: 'Game developer & streamer',
    postsCount: 67,
    commentsCount: 312,
    likesCount: 1203,
    joinedAt: '2023-09-05',
  },
  {
    id: '5',
    username: 'david_ai',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
    bio: 'Machine learning researcher',
    postsCount: 19,
    commentsCount: 78,
    likesCount: 356,
    joinedAt: '2024-03-01',
  },
]

// Current logged in user (mock)
export const currentUser: User = mockUsers[0]

// Mock Posts
export const mockPosts: Post[] = [
  {
    id: '1',
    author: mockUsers[0],
    title: 'Just released my new open-source project!',
    content: 'After months of work, I\'m excited to share my latest project - a modern component library built with React and Tailwind CSS. Check out the GitHub repo and let me know what you think! Looking for contributors who are passionate about building great developer tools.',
    mediaUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    mediaType: 'image',
    category: 'Tech',
    tags: ['opensource', 'react', 'typescript'],
    upvotes: 234,
    downvotes: 12,
    commentsCount: 45,
    createdAt: '2024-03-20T10:30:00Z',
    isPinned: true,
  },
  {
    id: '2',
    author: mockUsers[1],
    title: 'Design tips for dark mode interfaces',
    content: 'Here are some key principles I follow when designing dark mode UIs: 1) Use slightly desaturated colors 2) Maintain proper contrast ratios 3) Consider depth and elevation through subtle shadows. What are your favorite dark mode designs?',
    category: 'Tech',
    tags: ['design', 'ui', 'darkmode'],
    upvotes: 189,
    downvotes: 5,
    commentsCount: 32,
    createdAt: '2024-03-19T15:45:00Z',
  },
  {
    id: '3',
    author: mockUsers[3],
    title: 'New gaming setup reveal!',
    content: 'Finally completed my dream setup after saving up for a year. RTX 4090, 4K 144Hz monitor, mechanical keyboard with custom keycaps. The lighting sync is perfect! Drop your setup pics in the comments.',
    mediaUrl: 'https://images.unsplash.com/photo-1593152167544-085d3b9c4938?w=800',
    mediaType: 'image',
    category: 'Gaming',
    tags: ['setup', 'pcgaming', 'battlestation'],
    upvotes: 567,
    downvotes: 23,
    commentsCount: 89,
    createdAt: '2024-03-18T20:15:00Z',
  },
  {
    id: '4',
    author: mockUsers[2],
    title: 'Kubernetes best practices in 2024',
    content: 'After managing clusters at scale for 3 years, here are my top recommendations: Use namespaces effectively, implement proper resource limits, leverage GitOps workflows, and always have a solid monitoring strategy. Happy to answer questions!',
    category: 'Tech',
    tags: ['kubernetes', 'devops', 'cloud'],
    upvotes: 312,
    downvotes: 8,
    commentsCount: 67,
    createdAt: '2024-03-17T09:00:00Z',
  },
  {
    id: '5',
    author: mockUsers[4],
    title: 'GPT-5 predictions and what it means for developers',
    content: 'With the rapid advancement in AI, I believe we\'ll see major shifts in how we approach software development. Code generation will become more sophisticated, but understanding fundamentals will become even more crucial. What are your predictions?',
    category: 'Tech',
    tags: ['ai', 'machinelearning', 'future'],
    upvotes: 445,
    downvotes: 34,
    commentsCount: 123,
    createdAt: '2024-03-16T14:30:00Z',
  },
  {
    id: '6',
    author: mockUsers[0],
    title: 'Looking for collaborators on a new project',
    content: 'Starting a new side project - a community-driven learning platform for developers. Need help with backend development (Node.js/PostgreSQL) and content creation. DM if interested!',
    category: 'General',
    tags: ['collaboration', 'project', 'learning'],
    upvotes: 78,
    downvotes: 2,
    commentsCount: 15,
    createdAt: '2024-03-15T11:20:00Z',
  },
]

// Mock Comments
export const mockComments: Comment[] = [
  {
    id: '1',
    author: mockUsers[1],
    content: 'This is amazing! I\'ve been looking for something exactly like this. The component API looks really clean.',
    likes: 23,
    createdAt: '2024-03-20T11:00:00Z',
    replies: [
      {
        id: '1-1',
        author: mockUsers[0],
        content: 'Thanks! Feel free to open issues if you find any bugs.',
        likes: 8,
        createdAt: '2024-03-20T11:15:00Z',
      },
      {
        id: '1-2',
        author: mockUsers[2],
        content: 'Just starred the repo. Looking forward to contributing!',
        likes: 5,
        createdAt: '2024-03-20T11:30:00Z',
      },
    ],
  },
  {
    id: '2',
    author: mockUsers[3],
    content: 'Great work! How does this compare to existing solutions like Radix or Headless UI?',
    likes: 15,
    createdAt: '2024-03-20T12:00:00Z',
    replies: [
      {
        id: '2-1',
        author: mockUsers[0],
        content: 'It\'s built on top of Radix actually! The main difference is the pre-styled components and theming system.',
        likes: 12,
        createdAt: '2024-03-20T12:20:00Z',
      },
    ],
  },
  {
    id: '3',
    author: mockUsers[4],
    content: 'The documentation looks really well done. Did you use any specific tools for generating it?',
    likes: 9,
    createdAt: '2024-03-20T13:00:00Z',
  },
]

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'comment',
    message: 'commented on your post',
    fromUser: mockUsers[1],
    postId: '1',
    read: false,
    createdAt: '2024-03-20T11:00:00Z',
  },
  {
    id: '2',
    type: 'like',
    message: 'liked your post',
    fromUser: mockUsers[2],
    postId: '1',
    read: false,
    createdAt: '2024-03-20T10:45:00Z',
  },
  {
    id: '3',
    type: 'mention',
    message: 'mentioned you in a comment',
    fromUser: mockUsers[3],
    postId: '3',
    read: true,
    createdAt: '2024-03-19T16:30:00Z',
  },
  {
    id: '4',
    type: 'like',
    message: 'liked your comment',
    fromUser: mockUsers[4],
    postId: '1',
    read: true,
    createdAt: '2024-03-19T14:00:00Z',
  },
]

// Mock Categories
export const mockCategories: Category[] = [
  { id: '1', name: 'General', icon: 'MessageSquare', postCount: 234 },
  { id: '2', name: 'Tech', icon: 'Code', postCount: 567 },
  { id: '3', name: 'Gaming', icon: 'Gamepad2', postCount: 389 },
  { id: '4', name: 'Resources', icon: 'BookOpen', postCount: 145 },
]

// Mock trending posts
export const trendingPosts = mockPosts.slice(0, 3).map(post => ({
  id: post.id,
  title: post.title,
  upvotes: post.upvotes,
}))

// Mock active users
export const activeUsers = mockUsers.slice(0, 5)

// Mock announcements
export const announcements = [
  {
    id: '1',
    title: 'Community Guidelines Update',
    content: 'We\'ve updated our community guidelines. Please review them.',
    createdAt: '2024-03-18',
  },
  {
    id: '2',
    title: 'New Features Coming Soon',
    content: 'Exciting new features are on the way! Stay tuned.',
    createdAt: '2024-03-15',
  },
]

// API placeholder functions
// TODO: GET /api/posts
export async function fetchPosts(): Promise<Post[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockPosts
}

// TODO: GET /api/posts/:id
export async function fetchPost(id: string): Promise<Post | undefined> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockPosts.find(post => post.id === id)
}

// TODO: POST /api/posts
export async function createPost(data: Partial<Post>): Promise<Post> {
  await new Promise(resolve => setTimeout(resolve, 500))
  const newPost: Post = {
    id: String(Date.now()),
    author: currentUser,
    title: data.title || '',
    content: data.content || '',
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
    category: data.category || 'General',
    tags: data.tags || [],
    upvotes: 0,
    downvotes: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  }
  return newPost
}

// TODO: GET /api/posts/:id/comments
export async function fetchComments(postId: string): Promise<Comment[]> {
  await new Promise(resolve => setTimeout(resolve, 400))
  return mockComments
}

// TODO: POST /api/posts/:id/comments
export async function createComment(postId: string, content: string): Promise<Comment> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return {
    id: String(Date.now()),
    author: currentUser,
    content,
    likes: 0,
    createdAt: new Date().toISOString(),
  }
}

// TODO: POST /api/upload
export async function uploadFile(file: File): Promise<string> {
  // TODO: connect to backend upload (Cloudinary)
  await new Promise(resolve => setTimeout(resolve, 1000))
  return URL.createObjectURL(file)
}

// TODO: GET /api/notifications
export async function fetchNotifications(): Promise<Notification[]> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockNotifications
}

// TODO: GET /api/users/:id
export async function fetchUser(id: string): Promise<User | undefined> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockUsers.find(user => user.id === id)
}

// TODO: POST /api/posts/:id/vote
export async function votePost(postId: string, direction: 'up' | 'down'): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200))
  // In real app, this would update the vote in the database
}
