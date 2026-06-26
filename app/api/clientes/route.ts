import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { nexiGetClientesProspeccao } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const nexiId = user.user_metadata?.nexi_id as string | undefined
  if (!nexiId) return NextResponse.json({ error: 'Nexi ID não encontrado na sessão' }, { status: 400 })

  const nexiToken = req.cookies.get('nexi-access-token')?.value
  const clientes = await nexiGetClientesProspeccao(nexiId, nexiToken)

  return NextResponse.json({ clientes })
}
