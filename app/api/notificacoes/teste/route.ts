import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { getSecret } from '@/lib/secrets'

// Envia uma notificação de TESTE no WhatsApp do próprio agente logado.
// Útil pra validar a integração n8n ao vivo (demo).
export async function POST(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // número: o que veio do form, senão o salvo nas preferências
  const body = await req.json().catch(() => ({}))
  let phone: string = (body.phone || '').trim()
  if (!phone) {
    const { data: pref } = await supabase
      .from('pt_preferencias').select('whatsapp_contato').eq('agente_id', user.id).maybeSingle()
    phone = (pref?.whatsapp_contato || '').trim()
  }
  if (phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'Informe um número de WhatsApp válido com DDD.' }, { status: 400 })
  }

  const webhook = await getSecret('N8N_WEBHOOK_URL')
  if (!webhook) return NextResponse.json({ error: 'Webhook n8n não configurado.' }, { status: 500 })

  const nome = (user.user_metadata?.nome as string) || user.email || 'agente'
  const mensagem = [
    `🔔 *Teste de notificação — Prospecção Nexi*`,
    ``,
    `Olá, ${nome.split(' ')[0] || 'agente'}! Se você recebeu esta mensagem, suas notificações de follow-up estão funcionando. ✅`,
  ].join('\n')

  try {
    const r = await fetch(webhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, mensagem2: mensagem, nome, total: 0, teste: true }),
    })
    if (!r.ok) return NextResponse.json({ error: `n8n retornou HTTP ${r.status}` }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao chamar o webhook' }, { status: 502 })
  }
}
