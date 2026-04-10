const paypalMode = (process.env.PAYPAL_MODE ?? '').toLowerCase()
const BASE = paypalMode === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

function assertPayPalConfig() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal no configurado (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)')
  }
}

async function getToken(): Promise<string> {
  assertPayPalConfig()
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const d = await res.json().catch(() => ({} as any))
  if (!res.ok || !d?.access_token) {
    const detail = d?.error_description || d?.message || d?.error || 'No se pudo autenticar con PayPal'
    throw new Error(detail)
  }
  return d.access_token
}

export async function createOrder(returnBase: string) {
  const token = await getToken()
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: '8.00' }, description: 'VIP Membership - Skill All Show' }],
      application_context: {
        return_url: `${returnBase}/api/vip/capture`,
        cancel_url: `${returnBase}/vip?cancelled=1`,
        brand_name: 'Skill All Show',
        user_action: 'PAY_NOW',
      },
    }),
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    const detail = data?.message || data?.name || 'Error al crear orden PayPal'
    throw new Error(detail)
  }
  return data
}

export async function captureOrder(orderId: string) {
  const token = await getToken()
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    const detail = data?.message || data?.name || 'Error al capturar orden PayPal'
    throw new Error(detail)
  }
  return data
}

export async function createDonationOrder(returnBase: string, amount: number) {
  const token = await getToken()
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: amount.toFixed(2) }, description: 'Donación - Skill All Show' }],
      application_context: {
        return_url: `${returnBase}/api/donations/capture`,
        cancel_url: `${returnBase}/donate?cancelled=1`,
        brand_name: 'Skill All Show',
        user_action: 'PAY_NOW',
      },
    }),
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    const detail = data?.message || data?.name || 'Error al crear orden PayPal'
    throw new Error(detail)
  }
  return data
}
