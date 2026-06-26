import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { TIPOS, STATUS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Suporta registro único OU em lote (ações em massa).
  // body.cliente_ids = string[]  → cria a mesma atividade para vários clientes.
  const ids: string[] = Array.isArray(body.cliente_ids)
    ? body.cliente_ids
    : body.cliente_id ? [body.cliente_id] : []

  const { tipo, status, comentario, follow_up_data } = body

  if (ids.length === 0 || !tipo || !status) {
    return NextResponse.json({ error: 'cliente(s), tipo e status são obrigatórios' }, { status: 400 })
  }
  if (!TIPOS.includes(tipo)) {
    return NextResponse.json({ error: `tipo inválido. Aceitos: ${TIPOS.join(', ')}` }, { status: 400 })
  }
  if (!STATUS.includes(status)) {
    return NextResponse.json({ error: `status inválido. Aceitos: ${STATUS.join(', ')}` }, { status: 400 })
  }

  const rows = ids.map(cliente_id => ({
    agente_id:      user.id,
    cliente_id,
    tipo,
    status,
    comentario:     comentario ?? null,
    follow_up_data: follow_up_data ?? null,
  }))

  const { data, error } = await supabase
    .from('pt_atividades')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // único → devolve a atividade; lote → devolve contagem
  if (rows.length === 1) {
    return NextResponse.json({ atividade: data?.[0] }, { status: 201 })
  }
  return NextResponse.json({ criadas: data?.length ?? 0, atividades: data }, { status: 201 })
}
