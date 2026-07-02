import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { nexiClientes, nexiHistoricoComentarios } from '@/lib/nexi'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params

  const nexiId = user.user_metadata?.nexi_id as string | undefined
  if (!nexiId) return NextResponse.json({ error: 'Nexi ID não encontrado' }, { status: 400 })
  const clientesDoAgente = await nexiClientes(nexiId)
  if (!clientesDoAgente.some(c => c.id === clienteId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Puxa o histórico de Comentário já existente na Nexi e replica na
  // timeline — upsert por nexi_comentario_id, idempotente (reabrir o
  // cliente não duplica; comentário editado na Nexi atualiza o texto aqui).
  const historico = await nexiHistoricoComentarios(clienteId)
  if (historico.length > 0) {
    const rows = historico.map(c => ({
      agente_id:          user.id,
      cliente_id:         clienteId,
      tipo:               'Nota',
      status:             'Histórico',
      comentario:         c.texto,
      follow_up_data:     null,
      created_at:         c.criadoEm,
      origem:             'nexi',
      nexi_comentario_id: c.id,
    }))
    await supabase.from('pt_atividades').upsert(rows, { onConflict: 'nexi_comentario_id' })
  }

  const { data, error } = await supabase
    .from('pt_atividades')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('agente_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ atividades: data })
}
