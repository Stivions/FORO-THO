import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'

const BASE = 'http://localhost:3002'
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@test.com`,
  password: 'Test1234',
}

describe('Auth API', () => {
  test('POST /api/auth/register - registra usuario nuevo', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
    const data = await res.json()
    console.log('  register response:', data)
    assert.equal(res.status, 201, `Esperaba 201, recibí ${res.status}: ${JSON.stringify(data)}`)
  })

  test('POST /api/auth/register - rechaza email duplicado', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
    const data = await res.json()
    console.log('  duplicate response:', data)
    assert.equal(res.status, 409, `Esperaba 409, recibí ${res.status}`)
  })

  test('POST /api/auth/register - rechaza campos vacíos', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email }),
    })
    const data = await res.json()
    console.log('  empty fields response:', data)
    assert.equal(res.status, 400, `Esperaba 400, recibí ${res.status}`)
  })

  test('POST /api/auth/signin - login con credenciales correctas', async () => {
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: testUser.email,
        password: testUser.password,
        csrfToken: 'test',
        callbackUrl: '/',
        json: 'true',
      }),
      redirect: 'manual',
    })
    // next-auth redirige en login exitoso (3xx) o devuelve error
    console.log('  login status:', res.status)
    assert.ok(res.status < 500, `Login devolvió error de servidor: ${res.status}`)
  })

  test('GET /api/auth/session - devuelve sesión (puede ser null sin cookie)', async () => {
    const res = await fetch(`${BASE}/api/auth/session`)
    const data = await res.json()
    console.log('  session response:', data)
    assert.equal(res.status, 200)
    assert.ok(typeof data === 'object', 'Debería devolver un objeto')
  })
})
