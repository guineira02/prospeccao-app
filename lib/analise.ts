import { Cliente, Atividade } from '@/app/dashboard/context'

export interface AnaliseResult {
  estagio:      string
  contextTitle: string
  contexto:     string
  tags:         [string, string][]
  script:       string
  chips:        string[]
  urgencia:     'alta' | 'media' | 'baixa'
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function daysUntil(isoDate: string) {
  const d = new Date(isoDate); d.setHours(0, 0, 0, 0)
  const t = new Date();        t.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - t.getTime()) / 86400000)
}

function nomeAbrev(razaoSocial: string) {
  // "Supermercados Boa Esperança LTDA" → "Boa Esperança"
  const s = razaoSocial.replace(/\b(LTDA|S\.?A\.?|EIRELI|ME|EPP|SS|COMERCIO|COMERCIAL|INDUSTRIA|INDUSTRIAS|SERVICOS|SOLUCOES)\b/gi, '').trim()
  const words = s.split(/\s+/).filter(Boolean)
  return words.slice(0, 2).join(' ')
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function analisar(cliente: Cliente, atividades: Atividade[]): AnaliseResult {
  const nome  = nomeAbrev(cliente['Razão Social'])
  const todos = [...atividades].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const total = todos.length
  const last  = todos[0]

  if (total === 0) return primeiroContato(nome)

  const diasUltimo = daysSince(last.created_at)

  const hasAtendeu       = todos.some(a => a.status === 'Atendeu')
  const hasReuniaoOk     = todos.some(a => a.tipo === 'Reuniao' && (a.status === 'Atendeu' || a.status === 'Agendou retorno'))
  const hasProposta      = todos.some(a => a.tipo === 'Proposta')
  const hasDeclinioFinal = last.tipo === 'Declinio' || last.status === 'Cliente recusou'
  const allNaoAtendeu    = todos.every(a => a.status === 'Não atendeu')
  const lastAgendou      = last.status === 'Agendou retorno'

  const fuVencido = last.follow_up_data ? daysUntil(last.follow_up_data) < 0 : false
  const fuDias    = last.follow_up_data ? Math.abs(daysUntil(last.follow_up_data)) : 0

  if (hasDeclinioFinal)               return declinioRecente(nome, todos, diasUltimo)
  if (hasProposta)                     return propostaEnviada(nome, todos, diasUltimo, fuVencido, fuDias)
  if (hasReuniaoOk)                    return posReuniaoSemProposta(nome, todos, diasUltimo, fuVencido, fuDias)
  if (lastAgendou)                     return retornoAgendado(nome, todos, diasUltimo)
  if (hasAtendeu)                      return emQualificacao(nome, todos, diasUltimo, fuVencido, fuDias)
  if (allNaoAtendeu)                   return semResposta(nome, todos, diasUltimo)
  return emQualificacao(nome, todos, diasUltimo, fuVencido, fuDias)
}

// ─── cenários ─────────────────────────────────────────────────────────────────

function primeiroContato(nome: string): AnaliseResult {
  return {
    estagio:      'Primeiro contato',
    urgencia:     'media',
    contextTitle: 'Nenhum contato registrado ainda',
    contexto:     `Nenhuma atividade registrada para ${nome}. O primeiro contato define o tom da relação — o objetivo não é vender energia, mas gerar autoridade estratégica. Pergunte sobre como eles gerenciam energia hoje antes de falar qualquer número.`,
    tags: [
      ['g', 'Abordagem consultiva'],
      ['i', 'Não mencionar preço'],
      ['i', 'Perguntar sobre gestão atual'],
    ],
    chips: ['Sem atividades', 'Abordagem inicial'],
    script: `Olá, tudo bem? Meu nome é [seu nome], sou da Tendência Energia. Estamos trabalhando com empresas da sua região que estão revisando a estratégia energética — principalmente por conta das mudanças regulatórias recentes no mercado livre. Queria entender como vocês acompanham isso hoje: existe algum acompanhamento estratégico da gestão de energia, ou isso fica mais concentrado no operacional mesmo?`,
  }
}

function semResposta(nome: string, todos: Atividade[], diasUltimo: number): AnaliseResult {
  const tentativas = todos.length
  const diasStr    = diasUltimo === 0 ? 'hoje' : diasUltimo === 1 ? 'ontem' : `há ${diasUltimo} dias`

  const contexto = tentativas >= 4
    ? `${tentativas} tentativas de ligação sem atendimento. Manter o mesmo canal não vai funcionar — a abordagem precisa mudar. Uma mensagem de WhatsApp curta e consultiva tende a ter taxa de resposta muito maior do que ligações repetidas.`
    : `${tentativas} tentativa${tentativas > 1 ? 's' : ''} de contato sem resposta. Última tentativa foi ${diasStr}. Ainda é cedo para desistir — tente variar o horário ou o canal antes de encerrar o ciclo.`

  const script = tentativas >= 4
    ? `Olá, [nome do contato]! Tentei falar por telefone algumas vezes mas não consegui te pegar. Sou da Tendência Energia — estamos trabalhando com empresas do setor que estão revisando a estratégia energética por conta das mudanças no mercado livre. Se fizer sentido conversar, pode me responder aqui mesmo. Sem compromisso.`
    : `Olá, [nome do contato]! Tentei ligar hoje mais cedo mas não consegui. Sou [nome] da Tendência Energia. Queria entender rapidamente como vocês acompanham a gestão energética hoje — seria possível 15 minutinhos essa semana?`

  return {
    estagio:      'Sem resposta',
    urgencia:     tentativas >= 3 ? 'alta' : 'media',
    contextTitle: 'Difícil de alcançar',
    contexto,
    tags: [
      ['a', tentativas >= 4 ? 'Mudar para WhatsApp' : 'Variar horário'],
      ['i', 'Tom consultivo, sem pressão'],
      ['r', 'Não ligar mais de 2x no mesmo dia'],
    ],
    chips: [`${tentativas} tentativa${tentativas > 1 ? 's' : ''}`, `Última ${diasStr}`],
    script,
  }
}

function retornoAgendado(nome: string, todos: Atividade[], diasUltimo: number): AnaliseResult {
  const last      = todos[0]
  const diasStr   = diasUltimo === 0 ? 'hoje' : diasUltimo === 1 ? 'ontem' : `há ${diasUltimo} dias`
  const comentario = last.comentario ?? ''
  const temComentario = comentario.length > 20

  return {
    estagio:      'Retorno agendado',
    urgencia:     'media',
    contextTitle: 'Cliente sinalizou interesse',
    contexto:     `${nome} agendou retorno ${diasStr}. ${temComentario ? 'O comentário do último contato traz contexto valioso — releia antes de ligar.' : 'Prepare o conteúdo antes de retomar o contato.'} Esse é o momento mais sensível: o cliente está avaliando. Chegue preparado, confirme o horário e não desvie do que foi combinado.`,
    tags: [
      ['g', 'Confirmar disponibilidade'],
      ['g', 'Preparar conteúdo específico'],
      ['i', 'Não atrasar o retorno'],
    ],
    chips: [`Agendou retorno ${diasStr}`, 'Confirmar antes de ligar'],
    script: `Olá, [nome]! Passando para confirmar nossa conversa de hoje. Preparei os pontos que você pediu — queria também trazer alguns dados do cenário regulatório atual que podem ser relevantes para a decisão de vocês. Fico no aguardo para confirmar o melhor horário.`,
  }
}

function emQualificacao(nome: string, todos: Atividade[], diasUltimo: number, fuVencido: boolean, fuDias: number): AnaliseResult {
  const contatos   = todos.filter(a => a.status === 'Atendeu').length
  const diasStr    = diasUltimo === 0 ? 'hoje' : diasUltimo === 1 ? 'ontem' : `há ${diasUltimo} dias`
  const atrasado   = fuVencido && fuDias > 0
  const urgencia   = atrasado && fuDias > 5 ? 'alta' : atrasado ? 'media' : 'baixa'

  const contexto = atrasado
    ? `Follow-up vencido há ${fuDias} dia${fuDias > 1 ? 's' : ''}. ${nome} já atendeu ${contatos === 1 ? 'uma vez' : `${contatos} vezes`} — existe abertura. Retome o contato com tom consultivo, sem cobrar resposta. Traga algo novo: um dado de mercado, uma mudança regulatória, qualquer contexto que justifique o contato sem parecer follow-up de vendas.`
    : `${contatos === 1 ? 'Primeiro atendimento realizado' : `${contatos} contatos realizados`}. ${nome} está sendo qualificado — o próximo passo natural é evoluir de ligação para reunião. Último contato foi ${diasStr}.`

  const script = atrasado
    ? `Olá, [nome]! Queria dar um alô rápido — saiu uma atualização interessante sobre o cenário do mercado livre que pode afetar empresas como a de vocês. Nada urgente, mas queria compartilhar para vocês terem o contexto. Você tem 10 minutinhos essa semana para a gente trocar uma ideia?`
    : `Olá, [nome]! Seguindo nosso último contato — queria propor uma reunião rápida, de 20 a 30 minutos, para eu entender melhor o contexto energético de vocês e ver se faz sentido a gente aprofundar a conversa. Posso preparar uma análise personalizada antes de qualquer proposta. Tem disponibilidade essa semana?`

  return {
    estagio:      'Em qualificação',
    urgencia,
    contextTitle: atrasado ? 'Follow-up em atraso' : 'Qualificação em andamento',
    contexto,
    tags: [
      ['g', 'Propor reunião'],
      [atrasado ? 'a' : 'i', atrasado ? 'Trazer novo contexto' : 'Falar sobre gestão estratégica'],
      ['i', 'Não enviar proposta ainda'],
    ],
    chips: [
      `${contatos} atendimento${contatos > 1 ? 's' : ''}`,
      atrasado ? `Follow-up ${fuDias}d atraso` : `Último contato ${diasStr}`,
    ],
    script,
  }
}

function posReuniaoSemProposta(nome: string, todos: Atividade[], diasUltimo: number, fuVencido: boolean, fuDias: number): AnaliseResult {
  const reuniao  = todos.find(a => a.tipo === 'Reuniao')
  const diasStr  = diasUltimo === 0 ? 'hoje' : diasUltimo === 1 ? 'ontem' : `há ${diasUltimo} dias`
  const atrasado = fuVencido && fuDias > 0
  const urgencia = atrasado && fuDias > 7 ? 'alta' : 'media'

  const contexto = atrasado
    ? `Reunião realizada e follow-up vencido há ${fuDias} dia${fuDias > 1 ? 's' : ''}. ${nome} já conhece a proposta de valor — o silêncio pode indicar análise interna ou dúvida não respondida. Retome perguntando, não pressionando. Abra espaço para ${nome} trazer o que está travando.`
    : `Reunião realizada com ${nome} ${diasStr}. ${reuniao?.comentario ? 'Cliente demonstrou interesse — esse é o momento de consolidar a proposta com os dados específicos que foram levantados.' : 'Próximo passo: formalizar proposta com os dados levantados na reunião.'}`

  return {
    estagio:      'Pós-reunião',
    urgencia,
    contextTitle: atrasado ? 'Follow-up vencido após reunião' : 'Reunião realizada',
    contexto,
    tags: [
      ['g', atrasado ? 'Retomar sem pressionar' : 'Enviar proposta formal'],
      ['i', 'Perguntar sobre análise interna'],
      [atrasado ? 'r' : 'g', atrasado ? 'Não cobrar decisão' : 'Incluir simulação de economia'],
    ],
    chips: [
      'Reunião realizada',
      atrasado ? `Follow-up ${fuDias}d atraso` : `Último contato ${diasStr}`,
    ],
    script: atrasado
      ? `Olá, [nome]! Queria só dar um oi rápido após a nossa reunião. Sei que vocês estão analisando internamente — se surgiu alguma dúvida ou ponto específico que precisaria de mais detalhe da minha parte, fico à disposição para ajustar o que for necessário. Sem pressa.`
      : `Olá, [nome]! Com base no que conversamos, preparei uma proposta com a análise do cenário energético de vocês. Incluí a simulação de economia e os pontos regulatórios que mencionamos. Quando posso apresentar? Posso adaptar conforme o feedback de vocês.`,
  }
}

function propostaEnviada(nome: string, todos: Atividade[], diasUltimo: number, fuVencido: boolean, fuDias: number): AnaliseResult {
  const diasStr     = diasUltimo === 0 ? 'hoje' : diasUltimo === 1 ? 'ontem' : `há ${diasUltimo} dias`
  const atrasado    = fuVencido && fuDias > 0
  const muitoTempo  = diasUltimo >= 14
  const urgencia    = muitoTempo ? 'alta' : atrasado ? 'media' : 'baixa'

  const contexto = muitoTempo
    ? `Proposta enviada há mais de 2 semanas sem resposta registrada. Clientes nesse estágio geralmente estão em análise interna ou a proposta ficou para segundo plano. Uma abordagem que traga algo novo — ajuste de proposta, contexto regulatório atualizado — funciona melhor do que perguntar "e então?".`
    : atrasado
    ? `Proposta enviada e follow-up vencido há ${fuDias} dia${fuDias > 1 ? 's' : ''}. ${nome} está no momento decisivo. Retome com leveza — ofereça esclarecer dúvidas ou ajustar algum ponto antes de pedir uma resposta.`
    : `Proposta enviada ${diasStr}. ${nome} está em análise — dê espaço para a decisão interna. Se o follow-up estiver próximo, prepare-se para retomar com abertura para ajuste.`

  const script = muitoTempo
    ? `Olá, [nome]! Queria retomar nossa conversa — tenho um contexto novo sobre o cenário do mercado livre que pode ser interessante para a decisão de vocês. Também estou aberto a revisar qualquer ponto da proposta se precisar. Tem como a gente trocar uma ideia rápida?`
    : atrasado
    ? `Olá, [nome]! Só passando para ver se surgiu alguma dúvida sobre a proposta que encaminhei. Se precisar de alguma adaptação — prazo, modelo de contratação, qualquer coisa — é só falar que a gente ajusta.`
    : `Olá, [nome]! Só confirmando que você recebeu a proposta. Qualquer ponto que queira detalhar antes de apresentar internamente, estou à disposição.`

  return {
    estagio:      'Proposta enviada',
    urgencia,
    contextTitle: muitoTempo ? 'Proposta sem retorno por 2+ semanas' : 'Proposta em análise',
    contexto,
    tags: [
      [muitoTempo ? 'a' : 'g', muitoTempo ? 'Trazer novo contexto' : 'Aguardar análise'],
      ['i', 'Oferecer ajuste na proposta'],
      ['r', 'Não pressionar por resposta'],
    ],
    chips: [
      'Proposta enviada',
      atrasado ? `Follow-up ${fuDias}d atraso` : `Último contato ${diasStr}`,
    ],
    script,
  }
}

function declinioRecente(nome: string, todos: Atividade[], diasUltimo: number): AnaliseResult {
  const diasStr    = diasUltimo === 0 ? 'hoje' : diasUltimo === 1 ? 'ontem' : `há ${diasUltimo} dias`
  const muitoTempo = diasUltimo >= 30
  const last       = todos[0]
  const motivo     = last.comentario ?? ''

  return {
    estagio:      'Declínio registrado',
    urgencia:     muitoTempo ? 'media' : 'baixa',
    contextTitle: 'Recusou — momento de respeitar',
    contexto:     muitoTempo
      ? `Declínio registrado ${diasStr}. Já se passou tempo suficiente para uma nova abordagem, mas com ângulo diferente. ${motivo ? 'Releia o comentário do declínio para entender o que motivou e evitar repetir o mesmo argumento.' : 'Uma abordagem pelo ângulo regulatório — mudanças no mercado livre — costuma reabrir conversas que foram encerradas por falta de prioridade, não por falta de interesse.'}`
      : `Declínio registrado ${diasStr}. Respeite o tempo — insistir agora vai fechar a porta definitivamente. ${motivo ? 'O comentário registrado pode indicar se é um "não por enquanto" ou um "não definitivo".' : 'Aguarde pelo menos 3 semanas antes de retomar com outro ângulo.'}`,
    tags: [
      [muitoTempo ? 'g' : 'r', muitoTempo ? 'Retomar com ângulo novo' : 'Não reincidir agora'],
      ['i', 'Ângulo regulatório funciona melhor'],
      [muitoTempo ? 'i' : 'a', muitoTempo ? 'Tom consultivo, sem menção à proposta' : 'Aguardar 3+ semanas'],
    ],
    chips: ['Declínio', diasStr],
    script: muitoTempo
      ? `Olá, [nome]! Já faz um tempo desde a nossa última conversa. Queria retomar o contato — o cenário do mercado livre mudou bastante nos últimos meses e estou passando em empresas do setor para ver se faz sentido atualizar a análise. Sem compromisso — só queria compartilhar o contexto.`
      : '',
  }
}
