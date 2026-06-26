import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiGetCurrentUser, nexiGetClientesProspeccao } from '@/lib/nexi'

// Seed route — só usar em dev para popular dados de demonstração

function daysAgo(n: number, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function dateIn(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function datePast(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await nexiGetCurrentUser(nexiToken)
  if (!user?._id) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const clientes = await nexiGetClientesProspeccao(user._id, nexiToken)

  function findId(nome: string) {
    const n = nome.toLowerCase()
    return clientes.find(c => c['Razão Social'].toLowerCase().includes(n))?._id ?? null
  }

  const dhefId     = findId('dhef')
  const wandId     = findId('wanderley')
  const davinciId  = findId('davinci')

  const missing = [
    !dhefId    && 'Dhef',
    !wandId    && 'Wanderley',
    !davinciId && 'Davinci',
  ].filter(Boolean)

  if (missing.length) {
    return NextResponse.json({ error: `Clientes não encontrados: ${missing.join(', ')}` }, { status: 404 })
  }

  const supabase = getSupabaseAdmin()
  const agente   = user._id

  // ── limpa histórico anterior dos 3 clientes ────────────────────────────────
  await supabase.from('pt_atividades').delete().in('cliente_id', [dhefId, wandId, davinciId])

  // ── DHEF — História de sucesso ─────────────────────────────────────────────
  const dhef = [
    {
      agente_id: agente, cliente_id: dhefId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Primeiro contato direto com o CEO. Empresa consome acima de 800 kWh/mês. Abri com abordagem consultiva sobre gestão energética — demonstrou interesse imediato. Agendamos reunião para daqui 7 dias.',
      follow_up_data: datePast(44), created_at: daysAgo(51, 9, 15),
    },
    {
      agente_id: agente, cliente_id: dhefId,
      tipo: 'Reuniao', status: 'Atendeu',
      comentario: 'Reunião com CEO e diretor financeiro. Apresentei o modelo de gestão da Tendência — auditoria contínua e imparcialidade chamaram atenção. Pediram proposta formal com simulação de 12 meses. Saí com muito otimismo.',
      follow_up_data: datePast(37), created_at: daysAgo(44, 14, 0),
    },
    {
      agente_id: agente, cliente_id: dhefId,
      tipo: 'Email', status: 'Atendeu',
      comentario: 'Proposta enviada com simulação completa. Retorno do financeiro foi no mesmo dia — aprovação interna já encaminhada. Estão aguardando só a assinatura do CEO.',
      follow_up_data: datePast(33), created_at: daysAgo(37, 10, 30),
    },
    {
      agente_id: agente, cliente_id: dhefId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Contrato assinado. Migração iniciada junto à CCEE. Cliente muito satisfeito com a agilidade do processo. Mencionou dois outros empresários da região que podem ter interesse — solicitou contato para indicação.',
      follow_up_data: null, created_at: daysAgo(33, 16, 0),
    },
  ]

  // ── WANDERLEY — Enrolão ────────────────────────────────────────────────────
  const wand = [
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Não atendeu',
      comentario: 'Primeiro contato. Sem resposta.',
      follow_up_data: datePast(48), created_at: daysAgo(52, 9, 0),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Não atendeu',
      comentario: 'Segunda tentativa. Caixa postal.',
      follow_up_data: datePast(44), created_at: daysAgo(48, 10, 0),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Atendeu, mas disse que estava em reunião. Pediu para ligar na semana seguinte "sem falta". Tom receptivo mas sem comprometimento real.',
      follow_up_data: datePast(37), created_at: daysAgo(44, 11, 20),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Não atendeu',
      comentario: 'Semana seguinte. Não atendeu novamente.',
      follow_up_data: datePast(33), created_at: daysAgo(37, 9, 30),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Atendeu. Disse que estava "analisando internamente" mas pediu que eu enviasse um email primeiro antes de qualquer reunião — queria mostrar para o sócio.',
      follow_up_data: datePast(28), created_at: daysAgo(33, 15, 0),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Email', status: 'Atendeu',
      comentario: 'Email enviado com apresentação da Tendência. Confirmou recebimento, mas disse que estão em período de fechamento de orçamento anual e que só teriam espaço para analisar em 2 semanas.',
      follow_up_data: datePast(21), created_at: daysAgo(28, 14, 0),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Não atendeu',
      comentario: 'Duas semanas depois como combinado. Sem resposta.',
      follow_up_data: datePast(17), created_at: daysAgo(21, 9, 0),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Atendeu. O financeiro ainda não tinha visto o material. Pediu mais uma semana — desta vez com tom menos comprometido do que antes. Começo a desconfiar do real interesse.',
      follow_up_data: datePast(10), created_at: daysAgo(17, 10, 45),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Não atendeu',
      comentario: 'Semana passada. Sem resposta. Deixei recado na caixa postal.',
      follow_up_data: datePast(7), created_at: daysAgo(10, 9, 0),
    },
    {
      agente_id: agente, cliente_id: wandId,
      tipo: 'Ligacao', status: 'Não atendeu',
      comentario: 'Terceira tentativa sem retorno consecutiva. Vou tentar WhatsApp na próxima.',
      follow_up_data: datePast(3), created_at: daysAgo(7, 11, 0),
    },
  ]

  // ── TESTE DAVINCI — Foi longe mas desistiu no final ────────────────────────
  const davinci = [
    {
      agente_id: agente, cliente_id: davinciId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Primeiro contato. Empresa com consumo expressivo — acima de 1.2 MWh/mês. Demonstrou interesse real em entender o mercado livre. Tom receptivo desde o início. Agendei reunião introdutória.',
      follow_up_data: datePast(37), created_at: daysAgo(42, 10, 0),
    },
    {
      agente_id: agente, cliente_id: davinciId,
      tipo: 'Reuniao', status: 'Agendou retorno',
      comentario: 'Reunião introdutória com o gerente operacional. Apresentei o conceito de gestão energética e o diferencial de imparcialidade. Ficou muito interessado, mas pediu para incluir o setor jurídico e o diretor financeiro na próxima conversa.',
      follow_up_data: datePast(30), created_at: daysAgo(37, 14, 30),
    },
    {
      agente_id: agente, cliente_id: davinciId,
      tipo: 'Reuniao', status: 'Atendeu',
      comentario: 'Segunda reunião com jurídico, financeiro e gerente. Apresentei os riscos do processo de migração e como a Tendência mitiga cada um. Proposta de valor muito bem recebida. Pediram simulação formal com cenário conservador e otimista.',
      follow_up_data: datePast(23), created_at: daysAgo(30, 10, 0),
    },
    {
      agente_id: agente, cliente_id: davinciId,
      tipo: 'Proposta', status: 'Atendeu',
      comentario: 'Proposta formal entregue com dois cenários de simulação — 12 e 24 meses. Diretor financeiro recebeu pessoalmente. Disse que ia apresentar para o conselho na reunião mensal. Expectativa positiva.',
      follow_up_data: datePast(16), created_at: daysAgo(23, 16, 0),
    },
    {
      agente_id: agente, cliente_id: davinciId,
      tipo: 'Ligacao', status: 'Atendeu',
      comentario: 'Ligaram para esclarecer dúvida técnica sobre o processo de migração junto à CCEE e os prazos legais. Respondi tudo com detalhes. Tom ainda positivo. Aguardando reunião do conselho.',
      follow_up_data: datePast(9), created_at: daysAgo(16, 11, 0),
    },
    {
      agente_id: agente, cliente_id: davinciId,
      tipo: 'Declinio', status: 'Cliente recusou',
      comentario: 'Informaram que após análise interna e apresentação ao conselho, decidiram manter o contrato regulado por mais 12 meses — priorizando estabilidade nesse momento de expansão da empresa. A proposta foi bem avaliada tecnicamente, mas o timing não favoreceu. Deixei a porta aberta e combinei de retomar em 6 meses.',
      follow_up_data: null, created_at: daysAgo(9, 14, 0),
    },
  ]

  const { error } = await supabase
    .from('pt_atividades')
    .insert([...dhef, ...wand, ...davinci])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    inseridos: dhef.length + wand.length + davinci.length,
    clientes: { dhef: dhefId, wanderley: wandId, davinci: davinciId },
  })
}
