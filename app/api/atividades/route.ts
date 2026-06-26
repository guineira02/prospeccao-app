import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiGetCurrentUser } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await nexiGetCurrentUser(nexiToken)
  if (!user?._id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientes = await (await import('@/lib/nexi')).nexiGetClientesProspeccao(user._id, nexiToken)
  const clientIds = clientes.map(c => c._id)

  if (!clientIds.length) return NextResponse.json({ atividades: [] })

  const { data, error } = await getSupabaseAdmin()
    .from('pt_atividades')
    .select('*')
    .in('cliente_id', clientIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ atividades: data ?? [] })
}

const TIPOS_VALIDOS  = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio'] as const
const STATUS_VALIDOS = ['Atendeu', 'Não atendeu', 'Agendou retorno', 'Cliente recusou'] as const

export async function POST(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await nexiGetCurrentUser(nexiToken)
  if (!user?._id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { cliente_id, tipo, status, comentario, follow_up_data } = body

  if (!cliente_id || !tipo || !status)
    return NextResponse.json({ error: 'cliente_id, tipo e status são obrigatórios' }, { status: 400 })
  if (!TIPOS_VALIDOS.includes(tipo))
    return NextResponse.json({ error: `tipo inválido. Aceitos: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
  if (!STATUS_VALIDOS.includes(status))
    return NextResponse.json({ error: `status inválido. Aceitos: ${STATUS_VALIDOS.join(', ')}` }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('pt_atividades')
    .insert({
      agente_id:      user._id,
      cliente_id,
      tipo,
      status,
      comentario:     comentario ?? null,
      follow_up_data: follow_up_data ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ atividade: data }, { status: 201 })
}
