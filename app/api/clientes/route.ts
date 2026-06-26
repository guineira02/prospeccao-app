import { NextRequest, NextResponse } from 'next/server'
import { nexiGetCurrentUser, nexiGetClientesProspeccao } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await nexiGetCurrentUser(nexiToken)
  if (!user?._id) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const clientes = await nexiGetClientesProspeccao(user._id, nexiToken)
  return NextResponse.json({ clientes })
}
