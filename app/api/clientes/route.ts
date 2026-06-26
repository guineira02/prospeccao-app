import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { nexiClientes } from '@/lib/nexi'
import { derivarEstagio, regiaoDaUF, type AtividadeLite, type Estagio } from '@/lib/constants'

export interface ClienteEnriquecido {
  id:            string
  nome:          string
  cnpj:          string
  uf:            string
  regiao:        string
  contatoNome:   string
  contatoEmail:  string
  contatoFone:   string
  valorFatura:   number | null
  economia:      number | null
  tipoModelo:    string
  tipoLead:      string
  estagio:       Estagio
  ultimoContato: string | null   // ISO created_at da última atividade
  proximoFollowUp: string | null // follow_up_data mais recente em aberto
  totalAtividades: number
  concorrente:   string | null
  vencimento:    string | null   // data_vencimento_contrato
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: udata, error: uerr } = await admin.auth.getUser(token)
  if (uerr || !udata.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agenteId = udata.user.id
  const nexiId   = udata.user.user_metadata?.nexi_id as string | undefined
  if (!nexiId) return NextResponse.json({ error: 'Nexi ID não encontrado na sessão' }, { status: 400 })

  // 1. clientes da Nexi + 2. atividades + 3. meta — em paralelo
  const supa = getSupabaseForUser(token)
  const [clientes, atvRes, metaRes] = await Promise.all([
    nexiClientes(nexiId),
    supa.from('pt_atividades')
      .select('cliente_id, tipo, status, follow_up_data, created_at')
      .order('created_at', { ascending: false }),
    supa.from('pt_clientes_meta')
      .select('cliente_id, concorrente_atual, data_vencimento_contrato'),
  ])

  type AtvRow = AtividadeLite & { cliente_id: string }
  const atividades = (atvRes.data ?? []) as AtvRow[]
  const metas = (metaRes.data ?? []) as { cliente_id: string; concorrente_atual: string | null; data_vencimento_contrato: string | null }[]

  // agrupa atividades por cliente (já vêm ordenadas desc por created_at)
  const porCliente = new Map<string, AtvRow[]>()
  for (const a of atividades) {
    const arr = porCliente.get(a.cliente_id) ?? []
    arr.push(a)
    porCliente.set(a.cliente_id, arr)
  }
  const metaMap = new Map(metas.map(m => [m.cliente_id, m]))

  const hoje = new Date().toISOString().slice(0, 10)

  const enriquecidos: ClienteEnriquecido[] = clientes.map(c => {
    const atvs = porCliente.get(c.id) ?? []
    const ultima = atvs[0] ?? null
    // follow-up em aberto mais próximo (a data mais antiga ainda no futuro/passado não resolvida)
    const followUps = atvs
      .map(a => a.follow_up_data)
      .filter((d): d is string => !!d)
      .sort()
    const proximo = followUps.find(d => d >= hoje) ?? followUps[0] ?? null
    const meta = metaMap.get(c.id)

    return {
      id:              c.id,
      nome:            c.nome,
      cnpj:            c.cnpj,
      uf:              c.uf,
      regiao:          regiaoDaUF(c.uf),
      contatoNome:     c.contatoNome,
      contatoEmail:    c.contatoEmail,
      contatoFone:     c.contatoFone,
      valorFatura:     c.valorFatura,
      economia:        c.economia,
      tipoModelo:      c.tipoModelo,
      tipoLead:        c.tipoLead,
      estagio:         derivarEstagio(ultima),
      ultimoContato:   ultima?.created_at ?? null,
      proximoFollowUp: proximo,
      totalAtividades: atvs.length,
      concorrente:     meta?.concorrente_atual ?? null,
      vencimento:      meta?.data_vencimento_contrato ?? null,
    }
  })

  return NextResponse.json({
    agente: {
      nome:  udata.user.user_metadata?.nome ?? '',
      cargo: udata.user.user_metadata?.cargo ?? '',
    },
    clientes: enriquecidos,
  })
}
