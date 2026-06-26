import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiGetCurrentUser, nexiGetClientesProspeccao } from '@/lib/nexi'

export async function GET(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await nexiGetCurrentUser(nexiToken)
  if (!user?._id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [clientes, atividadesRes] = await Promise.all([
    nexiGetClientesProspeccao(user._id, nexiToken),
    getSupabaseAdmin()
      .from('pt_atividades')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  const { data: atividades } = atividadesRes

  const todayStr = new Date().toISOString().slice(0, 10)
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

  type AtRow = NonNullable<typeof atividades>[0]
  const lastAt: Record<string, AtRow> = {}
  for (const at of atividades ?? []) {
    if (!lastAt[at.cliente_id]) lastAt[at.cliente_id] = at
  }

  const todayOverdue = (atividades ?? []).filter(a =>
    a.follow_up_data && a.follow_up_data.slice(0, 10) < todayStr
  )
  const thisWeek = (atividades ?? []).filter(a =>
    new Date(a.created_at) >= weekAgo
  )

  const clienteItems = clientes.map((c, i) => {
    const at = lastAt[c._id]
    const fuDate = at?.follow_up_data
    const isOverdue = fuDate && fuDate.slice(0, 10) < todayStr
    const tags: string[] = []
    if (isOverdue) tags.push('atrasado')
    if (at && new Date(at.created_at) >= weekAgo) tags.push('semana')
    return {
      _id:  c._id,
      n:    i + 1,
      nome: c['Razão Social'],
      uf:   c.UF ?? '',
      cnpj: c.CNPJ ?? '',
      meta: at ? `${at.tipo} · ${at.status}` : 'Sem atividades registradas',
      dias: isOverdue ? `${Math.floor((Date.now() - new Date(fuDate!).getTime()) / 86400000)} dias atraso` : '',
      tags,
    }
  })

  return NextResponse.json({
    kpis: {
      total:    clientes.length,
      atrasado: todayOverdue.length,
      semana:   new Set(thisWeek.map(a => a.cliente_id)).size,
    },
    clientes: clienteItems,
  })
}
