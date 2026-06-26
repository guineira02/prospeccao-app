import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiClientes, type Cliente } from '@/lib/nexi'
import { diasAtraso } from '@/lib/constants'

// Disparo diário (chamado pelo n8n). Protegido por CRON_SECRET.
// NÃO envia direto — devolve, por agente, o número de WhatsApp + a mensagem pronta.
// O n8n itera `agentes` e dispara cada WhatsApp via integração Nexi.
const ATRASO_MIN = 2

function montarMensagem(nome: string, itens: { nome: string; uf: string; diasAtraso: number }[], appUrl: string): string {
  const linhas = itens
    .map(i => `• *${i.nome}* (${i.uf}) — ${i.diasAtraso} dia${i.diasAtraso > 1 ? 's' : ''} de atraso`)
    .join('\n')
  return [
    `Olá, ${nome.split(' ')[0] || 'agente'}! 👋`,
    ``,
    `Você tem *${itens.length} follow-up${itens.length > 1 ? 's' : ''}* em atraso há mais de 2 dias:`,
    ``,
    linhas,
    ``,
    `Não deixe o ritmo esfriar 🔥`,
    `👉 ${appUrl}/dashboard/followups`,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const enviado = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret')
  if (secret && enviado !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const appUrl = process.env.APP_URL || new URL(req.url).origin
  const admin = getSupabaseAdmin()

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const agentes = list?.users ?? []

  const [{ data: prefsAll }, { data: atvsAll }] = await Promise.all([
    admin.from('pt_preferencias').select('agente_id, notif_whatsapp, whatsapp_contato'),
    admin.from('pt_atividades').select('agente_id, cliente_id, follow_up_data, created_at').order('created_at', { ascending: false }),
  ])

  type Pref = { agente_id: string; notif_whatsapp: boolean; whatsapp_contato: string | null }
  type Atv  = { agente_id: string; cliente_id: string; follow_up_data: string | null; created_at: string }
  const prefMap = new Map((prefsAll as Pref[] ?? []).map(p => [p.agente_id, p]))

  const payload: {
    agente_id: string
    nome: string
    whatsapp: string
    total: number
    mensagem: string
    clientes: { nome: string; uf: string; diasAtraso: number }[]
  }[] = []

  for (const agente of agentes) {
    const pref = prefMap.get(agente.id)
    // só inclui quem ativou WhatsApp e tem número
    if (!pref?.notif_whatsapp || !pref.whatsapp_contato) continue
    const nexiId = agente.user_metadata?.nexi_id as string | undefined
    if (!nexiId) continue

    const atvs = (atvsAll as Atv[] ?? []).filter(a => a.agente_id === agente.id)
    if (atvs.length === 0) continue

    const proxPorCliente = new Map<string, string>()
    for (const a of atvs) {
      if (!a.follow_up_data) continue
      const cur = proxPorCliente.get(a.cliente_id)
      if (!cur || a.follow_up_data < cur) proxPorCliente.set(a.cliente_id, a.follow_up_data)
    }

    const atrasados = [...proxPorCliente.entries()]
      .map(([id, fu]) => ({ id, atraso: diasAtraso(fu) }))
      .filter(x => x.atraso !== null && x.atraso! > ATRASO_MIN)
    if (atrasados.length === 0) continue

    let clientes: Cliente[] = []
    try { clientes = await nexiClientes(nexiId) } catch { clientes = [] }
    const byId = new Map(clientes.map(c => [c.id, c]))

    const itens = atrasados
      .map(x => { const c = byId.get(x.id); return c ? { nome: c.nome, uf: c.uf || '—', diasAtraso: x.atraso! } : null })
      .filter(Boolean)
      .sort((a, b) => b!.diasAtraso - a!.diasAtraso) as { nome: string; uf: string; diasAtraso: number }[]
    if (itens.length === 0) continue

    const nome = (agente.user_metadata?.nome as string) || agente.email || 'agente'
    payload.push({
      agente_id: agente.id,
      nome,
      whatsapp:  pref.whatsapp_contato,
      total:     itens.length,
      mensagem:  montarMensagem(nome, itens, appUrl),
      clientes:  itens,
    })
  }

  // dispara cada WhatsApp no webhook n8n (Evolution send-text)
  const webhook = process.env.N8N_WEBHOOK_URL
  let disparados = 0
  const erros: string[] = []
  if (webhook) {
    for (const p of payload) {
      try {
        const r = await fetch(webhook, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ phone: p.whatsapp, mensagem2: p.mensagem, nome: p.nome, total: p.total }),
        })
        if (r.ok) disparados++
        else erros.push(`${p.nome}: HTTP ${r.status}`)
      } catch (e) {
        erros.push(`${p.nome}: ${e instanceof Error ? e.message : 'erro'}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    agentes_com_atraso: payload.length,
    disparados,
    erros: erros.length ? erros : undefined,
    // payload completo (útil pra debug / se o n8n preferir puxar e iterar)
    agentes: payload,
  })
}
