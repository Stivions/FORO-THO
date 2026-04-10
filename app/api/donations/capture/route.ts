import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Donation } from '@/models/Donation'
import { captureOrder } from '@/lib/paypal'
import { getRequestBaseUrl } from '@/lib/request'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token   = searchParams.get('token')
  const PayerID = searchParams.get('PayerID')

  if (!token) {
    return NextResponse.redirect(new URL('/donate?cancelled=1', getRequestBaseUrl(req)))
  }

  try {
    const result = await captureOrder(token)

    if (result?.status === 'COMPLETED') {
      await connectDB()
      await Donation.findOneAndUpdate(
        { paypalOrderId: token },
        { status: 'completed' }
      )
      const returnBase = getRequestBaseUrl(req)
      return NextResponse.redirect(`${returnBase}/donate?success=1`)
    }

    const returnBase = getRequestBaseUrl(req)
    return NextResponse.redirect(`${returnBase}/donate?cancelled=1`)
  } catch (err) {
    console.error(err)
    const returnBase = getRequestBaseUrl(req)
    return NextResponse.redirect(`${returnBase}/donate?cancelled=1`)
  }
}
