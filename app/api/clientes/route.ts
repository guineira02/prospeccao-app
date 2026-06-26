import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiGetClientesProspeccao } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const nexiId = data.user.user_metadata?.nexi_id as string | undefined
  if (!nexiId) return NextResponse.json({ error: 'Nexi ID não encontrado na sessão' }, { status: 400 })

  const clientes = await nexiGetClientesProspeccao(nexiId)

  return NextResponse.json({ clientes })
}
