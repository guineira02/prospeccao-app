import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const meta = data.user.user_metadata ?? {}
  return NextResponse.json({
    id: data.user.id,
    email: data.user.email,
    nome: meta.nome ?? '—',
    cargo: meta.cargo ?? '—',
    nexi_id: meta.nexi_id ?? null,
  })
}
