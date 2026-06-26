import { NextRequest, NextResponse } from 'next/server'
import { nexiGetCurrentUser } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await nexiGetCurrentUser(nexiToken)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const nome  = (user['Nome'] as string) ?? 'Agente'
  const raw   = user['Cargo'] as string | undefined
  const isBubbleRef = raw && /^\d{10,}x\d+$/.test(raw)
  const cargo = (!isBubbleRef && raw) ? raw : 'Agente comercial'
  const parts = nome.trim().split(' ')
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase()

  return NextResponse.json({ nome, cargo, initials, _id: user._id })
}
