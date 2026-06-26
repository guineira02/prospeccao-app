import Anthropic from '@anthropic-ai/sdk'
import { getSecret } from './secrets'
import { getSupabaseAdmin } from './supabase-admin'
import { Cliente, Atividade } from '@/app/dashboard/context'
import { AnaliseResult } from './analise'

const SYSTEM = `Você é um especialista em vendas consultivas para o setor de energia elétrica, trabalhando na Tendência Energia.

## Metodologia Tendência Energia
- Abordagem consultiva: nunca empurrar produto — entender gestão energética do cliente antes de qualquer proposta
- Diferencial competitivo: imparcialidade técnica e domínio regulatório do mercado livre
- Principal gatilho de abertura: mudanças regulatórias recentes no mercado livre de energia
- Tom sempre consultivo, sem pressão, perguntar antes de propor
- Sequência natural: abordagem → qualificação → reunião → proposta → fechamento
- Clientes que declinaram: respeitar tempo, reabrir pelo ângulo regulatório após 3+ semanas
- Propostas sem retorno: trazer novo contexto de mercado, não cobrar decisão

## Regras de escrita do script
- Primeira pessoa, tom direto e humano
- Máximo 3 frases
- Referir ao histórico real do cliente quando houver comentários relevantes
- Nunca mencionar preço no primeiro contato
- Script vazio ("") quando cliente declinioU recentemente (< 3 semanas)

## Formato de saída
Chame a ferramenta \`analise_cliente\` com os campos preenchidos. Nada mais.`

const ANALISE_TOOL: Anthropic.Tool = {
  name: 'analise_cliente',
  description: 'Retorna análise estratégica estruturada do cliente de prospecção',
  input_schema: {
    type: 'object' as const,
    required: ['estagio', 'contextTitle', 'contexto', 'tags', 'script', 'chips', 'urgencia'],
    properties: {
      estagio: {
        type: 'string',
        description: 'Estágio atual: Primeiro contato | Sem resposta | Retorno agendado | Em qualificação | Pós-reunião | Proposta enviada | Declínio registrado',
      },
      contextTitle: { type: 'string', description: 'Título curto do contexto (≤ 6 palavras)' },
      contexto: { type: 'string', description: 'Análise consultiva do momento — 2 a 4 frases, específica ao histórico real' },
      tags: {
        type: 'array',
        description: 'Array de [tipo, label]: tipo = "g" (verde/fazer), "i" (azul/info), "a" (amarelo/atenção), "r" (vermelho/evitar)',
        items: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 2,
        },
      },
      script: { type: 'string', description: 'Script de abordagem pronto para usar. String vazia se declínio recente.' },
      chips: { type: 'array', items: { type: 'string' }, description: '2 chips de contexto rápido' },
      urgencia: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    },
  },
}

async function getMaterialContext(): Promise<string> {
  try {
    const { data } = await getSupabaseAdmin()
      .from('pt_material')
      .select('titulo, conteudo')
      .order('created_at', { ascending: false })
      .limit(3)
    if (!data || data.length === 0) return ''
    return '\n\n## Material de apoio carregado\n' +
      data.map((m: { titulo: string; conteudo: string }) => `### ${m.titulo}\n${m.conteudo}`).join('\n\n')
  } catch {
    return ''
  }
}

function buildPrompt(cliente: Cliente, atividades: Atividade[]): string {
  const sorted = [...atividades].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const clienteInfo = [
    `**Empresa:** ${cliente['Razão Social']}`,
    `**CNPJ:** ${cliente.CNPJ}`,
    `**UF:** ${cliente.UF}`,
    cliente.Status            ? `**Status atual:** ${cliente.Status}` : null,
    cliente['Consumo Estimado'] ? `**Consumo estimado:** ${cliente['Consumo Estimado']} kWh/mês` : null,
    cliente.Concorrente       ? `**Concorrente atual:** ${cliente.Concorrente}` : null,
  ].filter(Boolean).join('\n')

  const historicoStr = sorted.length === 0
    ? 'Nenhuma atividade registrada.'
    : sorted.map((a, i) => {
        const data = new Date(a.created_at).toLocaleDateString('pt-BR')
        const fu   = a.follow_up_data ? ` | FU: ${a.follow_up_data}` : ''
        const com  = a.comentario     ? `\n   Comentário: "${a.comentario}"` : ''
        return `${i + 1}. [${data}] ${a.tipo} — ${a.status}${fu}${com}`
      }).join('\n')

  return `## Cliente\n${clienteInfo}\n\n## Histórico de atividades (mais recente primeiro)\n${historicoStr}\n\nGere a análise estratégica para esse cliente.`
}

export async function analisarComIA(cliente: Cliente, atividades: Atividade[]): Promise<AnaliseResult> {
  const [apiKey, materialCtx] = await Promise.all([
    getSecret('ANTHROPIC_API_KEY'),
    getMaterialContext(),
  ])

  const client = new Anthropic({ apiKey })

  const systemPrompt = materialCtx ? SYSTEM + materialCtx : SYSTEM

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    tools: [ANALISE_TOOL],
    tool_choice: { type: 'tool', name: 'analise_cliente' },
    messages: [{ role: 'user', content: buildPrompt(cliente, atividades) }],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call analise_cliente tool')
  }

  return toolBlock.input as AnaliseResult
}
