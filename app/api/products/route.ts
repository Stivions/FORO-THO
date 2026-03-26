import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const products = await Product.find()
    .sort({ createdAt: -1 })
    .lean()
  return NextResponse.json({ products })
}
