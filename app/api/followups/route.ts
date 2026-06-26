import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiGetCurrentUser, nexiGetClientesProspeccao } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, supabaseResult] = await Promise.all([
    nexiGetCurrentUser(nexiToken),
    getSupabaseAdmin()
      .from('pt_atividades')
      .select('*')
      .not('follow_up_data', 'is', null)
      .order('follow_up_data', { ascending: true }),
  ])

  const { data, error } = supabaseResult
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build client name map
  let clientMap: Record<string, { nome: string; uf: string }> = {}
  if (user?._id) {
    const clientes = await nexiGetClientesProspeccao(user._id, nexiToken)
    clientes.forEach(c => { clientMap[c._id] = { nome: c['Razão Social'], uf: c.UF ?? '' } })
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const weekEnd  = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
  const weekStr  = weekEnd.toISOString().slice(0, 10)

  const overdue: unknown[] = []
  const today:   unknown[] = []
  const week:    unknown[] = []

  for (const at of data ?? []) {
    const fuStr = at.follow_up_data.slice(0, 10)
    const client = clientMap[at.cliente_id] ?? { nome: at.cliente_id, uf: '' }
    const item = {
      id:             at.id,
      cliente_id:     at.cliente_id,
      nome:           client.nome,
      uf:             client.uf,
      tipo:           at.tipo,
      status:         at.status,
      comentario:     at.comentario,
      follow_up_data: at.follow_up_data,
    }
    if (fuStr < todayStr)       overdue.push(item)
    else if (fuStr === todayStr) today.push(item)
    else if (fuStr <= weekStr)   week.push(item)
  }

  return NextResponse.json({ overdue, today, week })
}
