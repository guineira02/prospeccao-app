import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'

// Upsert da meta do cliente (concorrente + vencimento de contrato).
// Alimenta o Radar de Renovação. agente_id é uuid em pt_clientes_meta.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cliente_id, concorrente_atual, data_vencimento_contrato } = await req.json()
  if (!cliente_id) {
    return NextResponse.json({ error: 'cliente_id obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pt_clientes_meta')
    .upsert({
      cliente_id,
      agente_id:                user.id,
      concorrente_atual:        concorrente_atual ?? null,
      data_vencimento_contrato: data_vencimento_contrato ?? null,
      updated_at:               new Date().toISOString(),
    }, { onConflict: 'cliente_id,agente_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meta: data }, { status: 200 })
}
