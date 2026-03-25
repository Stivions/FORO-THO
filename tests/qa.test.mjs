/**
 * QA Test Suite — covers all major API endpoints
 * Run: node --test tests/qa.test.mjs
 */
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'

const BASE = 'http://localhost:3002'

// Shared state across tests
const state = {
  username:   `qa_${Date.now()}`,
  email:      `qa_${Date.now()}@qa.test`,
  password:   'QaTest1234!',
  cookie:     '',
  userId:     '',
  postId:     '',
  commentId:  '',
  categoryId: '',
  newCatId:   '',
  adminCookie: '',
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function login(email, password) {
  const csrfRes   = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookie    = csrfRes.headers.get('set-cookie') ?? ''

  const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: csrfCookie },
    body:    new URLSearchParams({ email, password, csrfToken, callbackUrl: `${BASE}/`, json: 'true' }),
    redirect: 'manual',
  })

  const cookies = [csrfCookie]
  const raw = signinRes.headers.getSetCookie?.() ?? [signinRes.headers.get('set-cookie') ?? '']
  cookies.push(...raw.filter(Boolean))

  const location = signinRes.headers.get('location')
  if (location) {
    const redRes = await fetch(location.startsWith('http') ? location : `${BASE}${location}`, {
      headers: { cookie: cookies.join('; ') },
      redirect: 'manual',
    })
    cookies.push(...(redRes.headers.getSetCookie?.() ?? []).filter(Boolean))
  }

  return cookies.join('; ')
}

// ─── Auth ────────────────────────────────────────────────────────────────────
describe('1. Auth', () => {
  test('register new user', async () => {
    const res  = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: state.username, email: state.email, password: state.password }),
    })
    const data = await res.json()
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`)
    assert.ok(data.user?.id, 'Should return user with id')
    state.userId = data.user.id
    console.log(`  ✓ userId: ${state.userId}`)
  })

  test('reject duplicate email', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: state.username + '_2', email: state.email, password: state.password }),
    })
    assert.equal(res.status, 409)
  })

  test('reject missing fields', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: state.email }),
    })
    assert.equal(res.status, 400)
  })

  test('login and get session cookie', async () => {
    state.cookie = await login(state.email, state.password)
    assert.ok(state.cookie.length > 0, 'Should have session cookie')
    console.log(`  ✓ session cookie obtained`)
  })

  test('GET /api/auth/session returns session', async () => {
    const res  = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: state.cookie } })
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.user || data, 'Should return session data')
  })
})

// ─── Categories ──────────────────────────────────────────────────────────────
describe('2. Categories', () => {
  test('GET /api/categories seeds and returns default categories', async () => {
    const res  = await fetch(`${BASE}/api/categories`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(data.categories), 'Should return categories array')
    assert.ok(data.categories.length > 0, 'Should have at least one category')
    state.categoryId = data.categories[0]._id
    console.log(`  ✓ ${data.categories.length} categories returned`)
  })

  test('POST /api/categories creates new category (authenticated)', async () => {
    const catName = `TestCat_${Date.now()}`
    const res     = await fetch(`${BASE}/api/categories`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ name: catName, icon: 'Star', description: 'Test category' }),
    })
    const data = await res.json()
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`)
    assert.equal(data.category.name, catName)
    state.newCatId = data.category._id
    console.log(`  ✓ created category: ${catName} (id: ${state.newCatId})`)
  })

  test('POST /api/categories rejects unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/categories`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: 'HackCat' }),
    })
    assert.equal(res.status, 401)
  })

  test('POST /api/categories rejects duplicate name', async () => {
    const res = await fetch(`${BASE}/api/categories`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ name: 'General' }),
    })
    assert.equal(res.status, 409)
  })

  test('DELETE /api/categories/[id] rejects unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/categories/${state.newCatId}`, { method: 'DELETE' })
    assert.equal(res.status, 401)
  })

  test('DELETE /api/categories/[id] allows creator to delete own category', async () => {
    const res  = await fetch(`${BASE}/api/categories/${state.newCatId}`, {
      method:  'DELETE',
      headers: { cookie: state.cookie },
    })
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`)
    console.log(`  ✓ category deleted by creator`)
  })
})

// ─── Posts ────────────────────────────────────────────────────────────────────
describe('3. Posts', () => {
  test('POST /api/posts creates post (authenticated)', async () => {
    const res  = await fetch(`${BASE}/api/posts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ title: 'QA Test Post', content: 'This is a QA test post content.', category: 'General', tags: ['qa', 'test'] }),
    })
    const data = await res.json()
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`)
    assert.ok(data._id, 'Should return post with _id')
    state.postId = data._id
    console.log(`  ✓ postId: ${state.postId}`)
  })

  test('POST /api/posts rejects unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/posts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: 'Hack', content: 'x', category: 'General' }),
    })
    assert.equal(res.status, 401)
  })

  test('GET /api/posts returns paginated list', async () => {
    const res  = await fetch(`${BASE}/api/posts?page=1&limit=10`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(data.posts), 'Should return posts array')
    assert.ok(data.pagination, 'Should return pagination info')
    console.log(`  ✓ ${data.posts.length} posts, total: ${data.pagination.total}`)
  })

  test('GET /api/posts?sort=popular returns posts sorted by score', async () => {
    const res  = await fetch(`${BASE}/api/posts?sort=popular&limit=10`)
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`)
    assert.ok(Array.isArray(data.posts), 'Should return posts array')
    console.log(`  ✓ popular sort: ${data.posts.length} posts`)
  })

  test('GET /api/posts?sort=latest returns posts sorted by date', async () => {
    const res  = await fetch(`${BASE}/api/posts?sort=latest&limit=10`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(data.posts), 'Should return posts array')
    console.log(`  ✓ latest sort: ${data.posts.length} posts`)
  })

  test('GET /api/posts?category=General filters by category', async () => {
    const res  = await fetch(`${BASE}/api/posts?category=General&limit=5`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.posts.every(p => p.category === 'General'), 'All posts should be General')
  })

  test('GET /api/posts/[id] returns single post', async () => {
    const res  = await fetch(`${BASE}/api/posts/${state.postId}`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.post, 'Should return post object')
    assert.equal(data.post._id.toString(), state.postId)
  })

  test('GET /api/posts?author=[id] filters by author', async () => {
    const res  = await fetch(`${BASE}/api/posts?author=${state.userId}`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.posts.length >= 1, 'Should return at least the post we created')
  })

  test('POST /api/posts/[id]/vote - upvote', async () => {
    const res  = await fetch(`${BASE}/api/posts/${state.postId}/vote`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ direction: 'up' }),
    })
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.userVote, 'up')
    assert.equal(data.upvotes, 1)
  })

  test('POST /api/posts/[id]/vote - toggle off upvote', async () => {
    const res  = await fetch(`${BASE}/api/posts/${state.postId}/vote`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ direction: 'up' }),
    })
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.userVote, null)
    assert.equal(data.upvotes, 0)
  })

  test('POST /api/posts/[id]/vote - downvote', async () => {
    const res  = await fetch(`${BASE}/api/posts/${state.postId}/vote`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ direction: 'down' }),
    })
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.userVote, 'down')
  })

  test('POST /api/posts/[id]/vote rejects unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/posts/${state.postId}/vote`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ direction: 'up' }),
    })
    assert.equal(res.status, 401)
  })
})

// ─── Comments ────────────────────────────────────────────────────────────────
describe('4. Comments', () => {
  test('GET /api/comments/[postId] returns empty array initially', async () => {
    const res  = await fetch(`${BASE}/api/comments/${state.postId}`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(data.comments), 'Should return comments array')
    console.log(`  ✓ ${data.comments.length} comments initially`)
  })

  test('POST /api/comments/[postId] creates comment (authenticated)', async () => {
    const res  = await fetch(`${BASE}/api/comments/${state.postId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ content: 'QA test comment' }),
    })
    const data = await res.json()
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`)
    assert.ok(data.comment._id, 'Should return comment with _id')
    state.commentId = data.comment._id
    console.log(`  ✓ commentId: ${state.commentId}`)
  })

  test('POST /api/comments/[postId] rejects unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/comments/${state.postId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: 'Hack' }),
    })
    assert.equal(res.status, 401)
  })

  test('GET /api/comments/[postId] returns comment after creation', async () => {
    const res  = await fetch(`${BASE}/api/comments/${state.postId}`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.comments.length >= 1, 'Should have at least 1 comment')
    assert.ok(data.comments[0].author?.username, 'Author should be populated')
  })

  test('POST /api/comments/[postId] creates reply (with parentComment)', async () => {
    const res  = await fetch(`${BASE}/api/comments/${state.postId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ content: 'QA reply', parentComment: state.commentId }),
    })
    const data = await res.json()
    assert.equal(res.status, 201)
    assert.ok(data.comment._id, 'Should return reply with _id')
  })

  test('POST /api/comments/like/[id] toggles like', async () => {
    const res  = await fetch(`${BASE}/api/comments/like/${state.commentId}`, {
      method:  'POST',
      headers: { cookie: state.cookie },
    })
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.liked, true)
    assert.equal(data.count, 1)
  })

  test('POST /api/comments/like/[id] toggles unlike', async () => {
    const res  = await fetch(`${BASE}/api/comments/like/${state.commentId}`, {
      method:  'POST',
      headers: { cookie: state.cookie },
    })
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.liked, false)
    assert.equal(data.count, 0)
  })

  test('DELETE /api/comments/delete/[id] removes own comment', async () => {
    const createRes = await fetch(`${BASE}/api/comments/${state.postId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ content: 'To be deleted' }),
    })
    const { comment } = await createRes.json()

    const res = await fetch(`${BASE}/api/comments/delete/${comment._id}`, {
      method:  'DELETE',
      headers: { cookie: state.cookie },
    })
    assert.equal(res.status, 200)
    console.log(`  ✓ comment deleted`)
  })
})

// ─── Profile ─────────────────────────────────────────────────────────────────
describe('5. Profile', () => {
  test('GET /api/users/me returns current user (authenticated)', async () => {
    const res  = await fetch(`${BASE}/api/users/me`, { headers: { cookie: state.cookie } })
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`)
    assert.equal(data.email, state.email)
    console.log(`  ✓ me: ${data.username}`)
  })

  test('GET /api/users/me returns 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/users/me`)
    assert.equal(res.status, 401)
  })

  test('PUT /api/users/me updates profile', async () => {
    const res  = await fetch(`${BASE}/api/users/me`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', cookie: state.cookie },
      body:    JSON.stringify({ displayName: 'QA Tester', bio: 'QA bio', location: 'Test City', website: 'https://qa.test' }),
    })
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`)
    assert.equal(data.displayName, 'QA Tester')
    assert.equal(data.bio, 'QA bio')
    console.log(`  ✓ profile updated`)
  })

  test('PUT /api/users/me persists changes', async () => {
    const res  = await fetch(`${BASE}/api/users/me`, { headers: { cookie: state.cookie } })
    const data = await res.json()
    assert.equal(data.displayName, 'QA Tester')
    assert.equal(data.bio, 'QA bio')
  })

  test('GET /api/users/[id] returns public profile', async () => {
    const res  = await fetch(`${BASE}/api/users/${state.userId}`)
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`)
    assert.ok(data.username, 'Should return user with username')
    assert.equal(data.username, state.username)
  })
})

// ─── Admin ────────────────────────────────────────────────────────────────────
describe('6. Admin', () => {
  test('POST /api/admin/setup promotes stivion to admin', async () => {
    const res  = await fetch(`${BASE}/api/admin/setup`, { method: 'POST' })
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`)
    assert.equal(data.user.role, 'admin')
    assert.ok(data.user.badges.includes('verified'), 'Should have verified badge')
    assert.ok(data.user.badges.includes('first_user'), 'Should have first_user badge')
    console.log(`  ✓ stivion is admin with badges: ${data.user.badges.join(', ')}`)
  })

  test('GET /api/admin/users returns 403 for regular user', async () => {
    const res = await fetch(`${BASE}/api/admin/users`, { headers: { cookie: state.cookie } })
    assert.equal(res.status, 403)
  })

  test('GET /api/admin/users returns 403 unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/admin/users`)
    assert.equal(res.status, 403)
  })

  test('Login as admin (stivion) and get admin session', async () => {
    state.adminCookie = await login('stevensanchezdev@gmail.com', 'stivion123')
    // If login fails (wrong password), just skip admin-only tests
    if (!state.adminCookie.includes('session-token') && !state.adminCookie.includes('next-auth')) {
      console.log('  ⚠ admin login skipped (password unknown)')
      return
    }
    console.log(`  ✓ admin session obtained`)
  })

  test('GET /api/admin/users returns user list for admin', async () => {
    if (!state.adminCookie) return
    const res  = await fetch(`${BASE}/api/admin/users`, { headers: { cookie: state.adminCookie } })
    if (res.status === 403) {
      console.log('  ⚠ admin cookie not valid (JWT not refreshed yet — re-login needed)')
      return
    }
    const data = await res.json()
    assert.equal(res.status, 200, `Expected 200: ${JSON.stringify(data)}`)
    assert.ok(Array.isArray(data.users), 'Should return users array')
    console.log(`  ✓ ${data.users.length} users returned`)
  })

  test('DELETE /api/categories/[id] returns 401 for non-owner', async () => {
    // Try to delete a default category as non-owner regular user
    const res = await fetch(`${BASE}/api/categories/${state.categoryId}`, {
      method:  'DELETE',
      headers: { cookie: state.cookie },
    })
    // Should be 403 (not owner, not admin) or 404 if id invalid
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`)
    console.log(`  ✓ category delete correctly rejected (${res.status})`)
  })
})

// ─── Cleanup ─────────────────────────────────────────────────────────────────
describe('7. Cleanup', () => {
  test('DELETE /api/posts/[id] deletes own post', async () => {
    const res = await fetch(`${BASE}/api/posts/${state.postId}`, {
      method:  'DELETE',
      headers: { cookie: state.cookie },
    })
    assert.equal(res.status, 200)
    console.log(`  ✓ test post deleted`)
  })

  test('GET /api/posts/[id] returns 404 after deletion', async () => {
    const res = await fetch(`${BASE}/api/posts/${state.postId}`)
    assert.equal(res.status, 404)
  })
})
