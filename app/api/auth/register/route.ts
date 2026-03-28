import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'El registro directo fue deshabilitado. Solicita un codigo por correo.' },
    { status: 410 }
  )
}
