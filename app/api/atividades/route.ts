import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'

const TIPOS_VALIDOS   = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio'] as const
const STATUS_VALIDOS  = ['Atendeu', 'Nao atendeu', 'Agendou retorno', 'Cliente recusou'] as const

export async function POST(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { cliente_id, tipo, status, comentario, follow_up_data } = body

  if (!cliente_id || !tipo || !status) {
    return NextResponse.json({ error: 'cliente_id, tipo e status são obrigatórios' }, { status: 400 })
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: `tipo inválido. Aceitos: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
  }
  if (!STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: `status inválido. Aceitos: ${STATUS_VALIDOS.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pt_atividades')
    .insert({
      agente_id:      user.id,
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
