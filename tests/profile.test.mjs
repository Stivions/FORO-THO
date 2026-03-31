import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// ---------- helpers ----------
function parseCookies(headers) {
  // getSetCookie() devuelve array con todas las Set-Cookie (Node 18+)
  const raw = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie') ?? '']
  return raw
    .filter(Boolean)
    .map(c => c.split(';')[0]) // solo nombre=valor
    .join('; ')
}

function mergeCookies(...jars) {
  const map = new Map()
  for (const jar of jars) {
    for (const pair of jar.split('; ')) {
      const [name] = pair.split('=')
      if (name) map.set(name.trim(), pair.trim())
    }
  }
  return [...map.values()].join('; ')
}

async function login(email, password) {
  // Paso 1: obtener CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookies = parseCookies(csrfRes.headers)

  // Paso 2: POST credentials
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: csrfCookies,
    },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: '/', json: 'true' }),
    redirect: 'manual',
  })
  const loginCookies = parseCookies(loginRes.headers)

  // Paso 3: si hay redirect, seguirlo para obtener la session cookie final
  let sessionCookies = mergeCookies(csrfCookies, loginCookies)

  const location = loginRes.headers.get('location')
  if (location) {
    const url = location.startsWith('http') ? location : `${BASE}${location}`
    const followRes = await fetch(url, {
      headers: { cookie: sessionCookies },
      redirect: 'manual',
    })
    const followCookies = parseCookies(followRes.headers)
    sessionCookies = mergeCookies(sessionCookies, followCookies)
  }

  return { cookie: sessionCookies }
}

// ---------- test data ----------
const email    = `profile_test_${Date.now()}@test.com`
const password = 'Test1234'
const username = `prof_${Date.now()}`
let sessionCookie = ''

describe('Profile API', () => {

  before(async () => {
    // 1. Crear usuario
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    assert.equal(reg.status, 201, 'Registro falló')

    // 2. Login y obtener cookie de sesión
    const { cookie } = await login(email, password)
    sessionCookie = cookie
    assert.ok(sessionCookie.includes('next-auth.session-token') ||
              sessionCookie.includes('__Secure-next-auth'), 'No se obtuvo cookie de sesión')
    console.log('  ✓ Sesión iniciada')
  })

  test('GET /api/users/me devuelve el usuario logueado', async () => {
    const res = await fetch(`${BASE}/api/users/me`, {
      headers: { cookie: sessionCookie },
    })
    const data = await res.json()
    console.log('  me:', JSON.stringify(data, null, 2))
    assert.equal(res.status, 200)
    assert.equal(data.username, username)
    assert.ok(!data.password, 'No debe exponer password')
  })

  test('PUT /api/users/me guarda todos los campos de perfil', async () => {
    const payload = {
      displayName: 'Test Display',
      bio:         'Bio de prueba para el test',
      location:    'Madrid, España',
      website:     'https://ejemplo.com',
      socialLinks: {
        twitter:   '@testuser',
        github:    'testuser',
        instagram: '@testinsta',
      },
    }

    const res = await fetch(`${BASE}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: sessionCookie,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    console.log('  updated user:', JSON.stringify(data, null, 2))

    assert.equal(res.status, 200, `PUT falló: ${JSON.stringify(data)}`)
    assert.equal(data.displayName,              payload.displayName)
    assert.equal(data.bio,                      payload.bio)
    assert.equal(data.location,                 payload.location)
    assert.equal(data.website,                  payload.website)
    assert.equal(data.socialLinks.twitter,      payload.socialLinks.twitter)
    assert.equal(data.socialLinks.github,       payload.socialLinks.github)
    assert.equal(data.socialLinks.instagram,    payload.socialLinks.instagram)
  })

  test('GET /api/users/me confirma que los cambios persisten en MongoDB', async () => {
    const res = await fetch(`${BASE}/api/users/me`, {
      headers: { cookie: sessionCookie },
    })
    const data = await res.json()

    assert.equal(data.displayName,           'Test Display',     'displayName no persistió')
    assert.equal(data.bio,                   'Bio de prueba para el test', 'bio no persistió')
    assert.equal(data.location,              'Madrid, España',   'location no persistió')
    assert.equal(data.website,               'https://ejemplo.com', 'website no persistió')
    assert.equal(data.socialLinks?.twitter,  '@testuser',        'twitter no persistió')
    assert.equal(data.socialLinks?.github,   'testuser',         'github no persistió')
    assert.equal(data.socialLinks?.instagram,'@testinsta',       'instagram no persistió')
    console.log('  ✓ Todos los campos persisten en MongoDB')
  })

  test('POST /api/upload guarda archivo real y devuelve URL estática', async () => {
    // PNG mínimo válido de 1x1 pixel
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d494844520000000100000001' +
      '0802000000907753de0000000c4944415408d76360f8cfc00000000200' +
      '01e221bc330000000049454e44ae426082', 'hex'
    )
    const formData = new FormData()
    formData.append('file', new Blob([pngBytes], { type: 'image/png' }), 'banner4k.png')

    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { cookie: sessionCookie },
      body: formData,
    })
    const data = await res.json()
    console.log('  upload status:', res.status, '| url:', data.url)

    assert.equal(res.status, 200, `Upload falló: ${JSON.stringify(data)}`)
    assert.ok(data.url, 'No devolvió url')
    assert.ok(data.url.startsWith('/uploads/'), `URL debe ser ruta estática, recibí: ${data.url}`)
    assert.ok(data.url.endsWith('.png'), 'Debe conservar extensión')

    // Verificar que el archivo es accesible como estático
    const fileRes = await fetch(`${BASE}${data.url}`)
    assert.equal(fileRes.status, 200, 'Archivo no accesible como estático')
    console.log('  ✓ imagen servida como archivo estático sin pérdida de calidad')
  })

  test('PUT /api/users/me guarda avatar y bannerUrl como ruta estática', async () => {
    const fakeUrl = '/uploads/test-image.png'

    const res = await fetch(`${BASE}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: sessionCookie,
      },
      body: JSON.stringify({ avatar: fakeUrl, bannerUrl: fakeUrl }),
    })
    const data = await res.json()

    assert.equal(res.status, 200)
    assert.equal(data.avatar,    fakeUrl, 'avatar no se guardó')
    assert.equal(data.bannerUrl, fakeUrl, 'bannerUrl no se guardó')
    console.log('  ✓ avatar y bannerUrl guardados como rutas estáticas')
  })

  test('GET /api/users/:id devuelve perfil público', async () => {
    // Obtener el id del usuario
    const meRes = await fetch(`${BASE}/api/users/me`, {
      headers: { cookie: sessionCookie },
    })
    const me = await meRes.json()

    const res = await fetch(`${BASE}/api/users/${me._id}`)
    const data = await res.json()

    assert.equal(res.status, 200)
    assert.equal(data.username, username)
    assert.ok(!data.password, 'No debe exponer password en perfil público')
    console.log('  ✓ perfil público accesible en /api/users/:id')
  })

  test('PUT /api/users/me rechaza sin sesión', async () => {
    const res = await fetch(`${BASE}/api/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'hack' }),
    })
    assert.equal(res.status, 401, 'Debería rechazar sin sesión')
    console.log('  ✓ protegido contra acceso sin autenticación')
  })
})
