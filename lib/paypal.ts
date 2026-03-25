const BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const d = await res.json()
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
  return res.json()
}

export async function captureOrder(orderId: string) {
  const token = await getToken()
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
  return res.json()
}
