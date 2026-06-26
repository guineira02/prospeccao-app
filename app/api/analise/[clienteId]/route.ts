import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { TENDENCIA_SYSTEM, ANALISE_SCHEMA } from '@/lib/tendencia'
import { diasAtraso } from '@/lib/constants'
import { getSecret } from '@/lib/secrets'

interface Atividade {
  tipo: string; status: string; comentario: string | null
  follow_up_data: string | null; created_at: string
}

function fmtBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params
  const body = await req.json().catch(() => ({}))
  const cliente = body.cliente ?? {}

  const { data: atvs } = await supabase
    .from('pt_atividades')
    .select('tipo, status, comentario, follow_up_data, created_at')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  const atividades = (atvs ?? []) as Atividade[]
  const ultima = atividades[0]
  const diasOcioso = ultima
    ? Math.round((Date.now() - new Date(ultima.created_at).getTime()) / 86_400_000)
    : null
  const atrasoFU = diasAtraso(ultima?.follow_up_data ?? null)

  const historico = atividades.length
    ? atividades.map(a =>
        `- ${fmtBR(a.created_at)} · ${a.tipo} · ${a.status}${a.comentario ? ` · "${a.comentario}"` : ''}${a.follow_up_data ? ` · follow-up p/ ${fmtBR(a.follow_up_data + 'T00:00:00')}` : ''}`
      ).join('\n')
    : '(nenhum contato registrado ainda)'

  const userPrompt = `# Cliente
Nome: ${cliente.nome ?? '—'}
UF/Região: ${cliente.uf ?? '—'} / ${cliente.regiao ?? '—'}
Estágio atual de prospecção: ${cliente.estagio ?? 'Novo'}
${cliente.valorFatura != null ? `Valor da fatura: R$ ${Number(cliente.valorFatura).toLocaleString('pt-BR')}\n` : ''}${cliente.economia != null ? `Economia estimada: R$ ${Number(cliente.economia).toLocaleString('pt-BR')}\n` : ''}${cliente.concorrente ? `Concorrente atual: ${cliente.concorrente}\n` : ''}${cliente.vencimento ? `Vencimento do contrato: ${fmtBR(cliente.vencimento + 'T00:00:00')}\n` : ''}
# Situação
${diasOcioso != null ? `Dias desde o último contato: ${diasOcioso}` : 'Sem contato anterior'}
${atrasoFU != null && atrasoFU > 0 ? `Follow-up ATRASADO há ${atrasoFU} dias` : atrasoFU === 0 ? 'Follow-up é hoje' : ''}

# Histórico de contatos (mais recente primeiro)
${historico}

Analise este cliente e sugira a próxima abordagem. Seja específico ao que realmente aconteceu.`

  // Chamada direta à API Anthropic (fetch) — evita o SDK pegar key errada do env no serverless.
  const apiKey = await getSecret('ANTHROPIC_API_KEY')
  const model  = (await getSecret('ANTHROPIC_MODEL')) || 'claude-haiku-4-5'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: TENDENCIA_SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: { format: { type: 'json_schema', schema: ANALISE_SCHEMA } },
      }),
    })

    if (!res.ok) {
      const detalhe = (await res.text().catch(() => '')).slice(0, 200)
      return NextResponse.json({ error: `Falha na análise (${res.status})`, detalhe }, { status: 502 })
    }

    const data = await res.json()
    if (data.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'Análise indisponível para este conteúdo' }, { status: 422 })
    }

    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === 'text')
    const raw = textBlock?.text ?? '{}'
    const analise = JSON.parse(raw)

    return NextResponse.json({ analise, meta: { diasOcioso, totalAtividades: atividades.length } })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'erro'
    return NextResponse.json({ error: `Falha na análise: ${detail}` }, { status: 500 })
  }
}
