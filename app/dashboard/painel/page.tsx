'use client'

import { useState } from 'react'

interface AIData {
  name:         string
  contextTitle: string
  chips:        string[]
  contexto:     string
  tags:         [string, string][]
  script:       string
}

const AI_DATA: Record<string, AIData> = {
  metalurgica: {
    name: 'Metalúrgica São Paulo Ltda',
    contextTitle: 'Por que o silêncio?',
    chips: ['📄 Proposta enviada há 8 dias','👥 Diretor financeiro envolvido','⚡ Contrato vence em 5 meses','🕐 Não atendeu às 14h32'],
    contexto: 'Rômulo pediu uma semana para análise interna — passaram 8 dias. O não-atendimento às 14h32 sugere horário inadequado, não evasão. Com o diretor financeiro envolvido, a decisão é colegiada e naturalmente mais lenta. O interesse demonstrado na reunião de junho era genuíno.',
    tags: [['g','Tom consultivo'],['i','Ligar pela manhã'],['r','Não cobrar resposta'],['a','Reforçar urgência do contrato']],
    script: 'Rômulo, tudo bem? Queria saber se surgiu alguma dúvida sobre a simulação que mandei. Às vezes tem detalhe que fica sem resposta na proposta — posso ajustar se precisar. O diretor teve chance de dar uma olhada?',
  },
  ceramica: {
    name: 'Cerâmica Vale do Rio S.A.',
    contextTitle: 'Por que o silêncio?',
    chips: ['📧 E-mail sem resposta há 4 dias','🤝 Nenhuma ligação realizada ainda','❓ Relação não estabelecida'],
    contexto: 'E-mail tem taxa de abertura incerta — pode estar em spam ou simplesmente não foi priorizado. Nunca houve ligação: o relacionamento ainda não foi estabelecido de voz. O cliente não tem contexto suficiente para responder com interesse real.',
    tags: [['g','Ligar, não reenviar e-mail'],['i','Apresentação rápida (3 min)'],['a','Confirmar recebimento']],
    script: 'Olá, tudo bem? Sou da Tendência Energia. Mandei um e-mail há alguns dias sobre uma análise de economia no consumo de energia da cerâmica. Você chegou a receber? Consigo apresentar em 3 minutos agora mesmo se quiser.',
  },
  distribuidora: {
    name: 'Distribuidora Nordeste Ltda',
    contextTitle: 'Por que o silêncio?',
    chips: ['🤝 Se comprometeu a ligar','⏰ 2 dias além do combinado','📍 BA — possível fuso horário'],
    contexto: 'Cliente se comprometeu mas não ligou — comportamento comum quando a decisão ainda precisa de mais tempo ou outra prioridade surgiu. Não é sinal de desinteresse. O compromisso verbal é um ativo — use com leveza.',
    tags: [['i','Lembrete gentil'],['g','Reforçar que não é cobrança'],['a','Abrir espaço para reagendar']],
    script: 'Oi, tudo bem? Você tinha falado que me ligaria essa semana sobre a migração de energia. Queria só confirmar se ainda está na pauta ou se surgiu alguma coisa. Fico à disposição para reagendar no melhor momento pra você.',
  },
  agropecuaria: {
    name: 'Agropecuária Planalto',
    contextTitle: 'Por que o silêncio?',
    chips: ['📄 Proposta enviada ontem','✅ Reunião bem-sucedida','🔥 Janela de encantamento aberta'],
    contexto: 'Apenas 1 dia — muito cedo para preocupação. A proposta é nova e o cliente ainda está processando. Esta é a janela ideal de follow-up: o conteúdo está fresco, o interesse da reunião ainda está ativo.',
    tags: [['g','Confirmar recebimento agora'],['i','Tom de suporte, não pressão'],['a','Aproveitar momentum da reunião']],
    script: 'Oi! Enviei a proposta ontem à tarde. Queria confirmar que chegou certinha e se ficou fácil de ler. Qualquer dúvida sobre a simulação ou os números, me avisa que ajusto na hora.',
  },
  porto: {
    name: 'Porto Seco Logística',
    contextTitle: 'Por que o silêncio?',
    chips: ['📞 Primeiro contato tentado','❌ Não atendeu ontem','🆕 Relação ainda inexistente'],
    contexto: 'Simples: não estava disponível. Primeiro contato com 1 dia de atraso não é sinal de nada. Tente um horário diferente — logísticas geralmente têm manhã mais intensa. Fim de tarde pode funcionar melhor.',
    tags: [['i','Tentar horário diferente'],['g','Deixar mensagem de voz curta'],['a','Gancho: redução de custo operacional']],
    script: 'Tudo bem? Tentei te ligar ontem. Sou da Tendência Energia — trabalho com empresas de logística para reduzir custo com energia elétrica. Quando seria um bom momento pra trocar uma ideia de 5 minutos?',
  },
  frigorifico: {
    name: 'Frigorífico Norte S.A.',
    contextTitle: 'Momento atual',
    chips: ['✅ Reunião realizada','📅 Retorno agendado','⚡ Contrato vence em 3 meses','🔥 Prioridade máxima — semana + renovação'],
    contexto: 'Reunião bem recebida e o cliente agendou retorno espontaneamente — sinal claro de interesse real. Com o contrato vencendo em 3 meses, a janela de decisão está aberta agora. Concorrente atual provavelmente vai entrar em contato no mesmo período.',
    tags: [['g','Tom parceiro, não vendedor'],['a','Antecipar renovação como vantagem'],['i','Levar simulação comparativa'],['r','Criar senso de oportunidade, não urgência artificial']],
    script: 'Oi! Fiz a simulação com base nos dados que você compartilhou na reunião. Com o contrato vencendo em outubro, antecipar agora pode travar uma tarifa mais favorável antes da alta sazonal. Quando você estaria disponível pra gente fechar os números?',
  },
  cooperativa: {
    name: 'Cooperativa Agrícola Triângulo',
    contextTitle: 'Momento atual',
    chips: ['📄 Proposta enviada','⏳ Aguardando resposta','✅ Ligação atendida na semana'],
    contexto: 'Cliente atendeu e demonstrou abertura. Proposta está em análise — estágio de momentum positivo. Agora é o momento de facilitar a decisão, não de pressionar. Cooperativas têm decisão colegiada: pode estar circulando internamente.',
    tags: [['g','Facilitar decisão, não pressionar'],['i','Perguntar se chegou para todos os decisores'],['a','Oferecer reunião de apresentação interna']],
    script: 'Oi, tudo bem? A proposta chegou bem? Às vezes em cooperativa ela precisa passar por mais de uma pessoa antes de avançar — se quiser, posso fazer uma apresentação rápida para o grupo, facilita bastante a discussão interna.',
  },
  madeireira: {
    name: 'Madeireira Pinheiro Ltda',
    contextTitle: 'Momento atual',
    chips: ['📞 Ligação atendida','✅ Pediu proposta','🔥 Interesse confirmado — semana atual'],
    contexto: 'Cliente atendeu, ouviu e pediu proposta — interesse confirmado e ativo. Este é o estágio mais quente: o cliente está no modo de comparação. A proposta precisa chegar bem estruturada e ser acompanhada imediatamente.',
    tags: [['a','Enviar proposta hoje'],['g','Confirmar recebimento em 24h'],['i','Destacar economia mensal, não técnica'],['r','Simplicidade: 1 página, 1 número claro']],
    script: 'Oi! A proposta foi enviada agora há pouco. Destaquei a economia mensal estimada no topo, bem direto. Quando você tiver um momento pra dar uma olhada, me fala o que achou — se precisar ajustar algo, resolvo rápido.',
  },
  textil: {
    name: 'Indústria Têxtil Modernidade',
    contextTitle: 'Janela de renovação',
    chips: ['🏁 Contrato vence em 2 meses','⚠️ Concorrente atual: CPFL','📵 Sem contato recente','🎯 Oportunidade de virada'],
    contexto: 'Contrato vencendo em 2 meses com concorrente ativo (CPFL) — janela crítica de virada. A ausência de contato recente pode ser lida como indiferença pelo cliente. CPFL provavelmente já está em processo de renovação.',
    tags: [['a','Entrar com comparativo CPFL × Tendência'],['g','Tom consultivo: "vamos ver se faz sentido"'],['r','Não atacar o concorrente — comparar dados'],['i','Urgência real: 2 meses, não urgência artificial']],
    script: 'Olá, tudo bem? Vi que o contrato de energia de vocês está perto do vencimento. Fiz uma simulação rápida comparando com o que normalmente a CPFL pratica para o perfil da indústria têxtil — saiu uma diferença relevante. Vale 15 minutos pra você dar uma olhada antes de renovar?',
  },
}

interface UrgItem {
  key:  string
  n:    number
  nome: string
  uf:   string
  meta: string
  dias: string
  dc:   boolean
  tags: string[]
  tagEls?: React.ReactNode
}

const URG_ITEMS: UrgItem[] = [
  { key: 'metalurgica',  n: 1, nome: 'Metalúrgica São Paulo Ltda',    uf: 'SP', meta: 'Proposta enviada · Último contato não atendeu',   dias: '5 dias atraso',  dc: true,  tags: ['atrasado'] },
  { key: 'ceramica',     n: 2, nome: 'Cerâmica Vale do Rio S.A.',      uf: 'MG', meta: 'E-mail enviado · Sem resposta',                  dias: '4 dias atraso',  dc: true,  tags: ['atrasado'] },
  { key: 'distribuidora',n: 3, nome: 'Distribuidora Nordeste Ltda',    uf: 'BA', meta: 'Comprometeu retorno · Não retornou',             dias: '2 dias atraso',  dc: false, tags: ['atrasado'] },
  { key: 'agropecuaria', n: 4, nome: 'Agropecuária Planalto',          uf: 'GO', meta: 'Reunião realizada · Proposta enviada ontem',     dias: '1 dia atraso',   dc: false, tags: ['atrasado'] },
  { key: 'porto',        n: 5, nome: 'Porto Seco Logística',           uf: 'RS', meta: 'Primeiro contato · Não atendeu',                 dias: '1 dia atraso',   dc: false, tags: ['atrasado'] },
  { key: 'frigorifico',  n: 6, nome: 'Frigorífico Norte S.A.',         uf: 'PA', meta: 'Reunião realizada · Agendou retorno',            dias: '',               dc: false, tags: ['semana', 'renovacao'] },
  { key: 'cooperativa',  n: 7, nome: 'Cooperativa Agrícola Triângulo', uf: 'MG', meta: 'Proposta enviada · Aguardando resposta',         dias: '',               dc: false, tags: ['semana'] },
  { key: 'madeireira',   n: 8, nome: 'Madeireira Pinheiro Ltda',       uf: 'SC', meta: 'Ligação · Atendeu, pediu proposta',              dias: '',               dc: false, tags: ['semana'] },
  { key: 'textil',       n: 9, nome: 'Indústria Têxtil Modernidade',   uf: 'SP', meta: 'Sem contato recente · Concorrente: CPFL',        dias: '',               dc: false, tags: ['renovacao'] },
]

const FILTER_OPTS = [
  { key: 'todos',     label: 'Todos',                    count: 9 },
  { key: 'atrasado',  label: 'Follow-up atrasado',        count: 5 },
  { key: 'semana',    label: 'Contatados essa semana',    count: 4 },
  { key: 'renovacao', label: 'Renovações próximas',       count: 3 },
]

const FILTER_LABELS: Record<string, string> = {
  todos: 'Todos os clientes',
  atrasado: 'Follow-up atrasado',
  semana: 'Contatados essa semana',
  renovacao: 'Renovações próximas',
}

export default function PainelPage() {
  const [aiKey,  setAiKey]  = useState<string | null>(null)
  const [filter, setFilter] = useState('todos')
  const [copied, setCopied] = useState(false)

  const aiData = aiKey ? AI_DATA[aiKey] : null

  function openAI(key: string) {
    if (aiKey === key) { setAiKey(null); return }
    setAiKey(key)
    setCopied(false)
  }

  function copyScript() {
    if (!aiData) return
    navigator.clipboard.writeText(aiData.script).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const visible = URG_ITEMS.filter(item =>
    filter === 'todos' || item.tags.includes(filter)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Scrollable content + AI panel side by side */}
      <div className={`painel-main${aiKey ? ' ai-open' : ''}`} style={{ flex: 1, overflow: 'hidden' }}>

        {/* Scrollable painel content */}
        <div className="painel-scroll">
          <div className="painel-body">
            <div className="painel-h1">Painel</div>
            <div className="painel-sub">Sua carteira hoje · 25 jun 2026</div>

            {/* KPI grid */}
            <div className="kpi-grid">
              <div className="kpi kpi-g">
                <div className="kpi-lbl">Total de Clientes</div>
                <div className="kpi-n">24</div>
                <div className="kpi-d">base sincronizada</div>
              </div>
              <div className="kpi kpi-r">
                <div className="kpi-lbl">Follow-ups Atrasados</div>
                <div className="kpi-n">5</div>
                <div className="kpi-d">↑ 2 desde ontem</div>
              </div>
              <div className="kpi kpi-b">
                <div className="kpi-lbl">Contatados essa Semana</div>
                <div className="kpi-n">8</div>
                <div className="kpi-d">meta: 10 por semana</div>
              </div>
              <div className="kpi kpi-a">
                <div className="kpi-lbl">Renovações Próximas</div>
                <div className="kpi-n">3</div>
                <div className="kpi-d">contratos em 6 meses</div>
              </div>
            </div>

            {/* Filters */}
            <div className="painel-filters">
              {FILTER_OPTS.map(f => (
                <button
                  key={f.key}
                  className={`pf-btn${filter === f.key ? ' on' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className="pf-count">{f.count}</span>
                </button>
              ))}
            </div>

            {/* Urgency list */}
            <div className="urg-hd">
              {FILTER_LABELS[filter]} <span className="urg-hd-count">{visible.length}</span>
            </div>
            <div className="urg-list">
              {visible.map(item => (
                <div key={item.key} style={{ marginBottom: 8 }}>
                  <div className="urg-row">
                    <span className="urg-n">{item.n}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="urg-co">{item.nome}</div>
                      <div className="urg-meta">{item.uf} · {item.meta}</div>
                    </div>
                    {item.tags.includes('renovacao') && !item.tags.includes('semana') && (
                      <span className="tag-renovacao">Renova em {item.key === 'textil' ? '2' : '3'} meses</span>
                    )}
                    {item.tags.includes('renovacao') && item.tags.includes('semana') && (
                      <><span className="tag-renovacao">Renova em 3 meses</span><span className="tag-semana">Esta semana</span></>
                    )}
                    {item.tags.includes('semana') && !item.tags.includes('renovacao') && (
                      <span className="tag-semana">Esta semana</span>
                    )}
                    {item.dias && (
                      <span className={`urg-days ${item.dc ? 'dc' : 'dw'}`}>{item.dias}</span>
                    )}
                    <button
                      className={`btn-ai${aiKey === item.key ? ' on' : ''}`}
                      onClick={() => openAI(item.key)}
                    >
                      ✦ Ver análise
                    </button>
                    <button className="btn-ver">Ver →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Side Panel */}
        <div className="ai-side">
          <div className="ai-side-head">
            <div>
              <div className="ai-badge">✦ Análise de IA</div>
              <div className="ai-client-name">{aiData?.name ?? '—'}</div>
            </div>
            <button className="ai-side-close" onClick={() => setAiKey(null)}>✕</button>
          </div>
          {aiData && (
            <div className="ai-body">
              {/* Chips */}
              <div className="ai-chips">
                {aiData.chips.map((c, i) => <span key={i} className="ai-chip">{c}</span>)}
              </div>
              {/* Context */}
              <div className="ai-block">
                <div className="ai-block-title">{aiData.contextTitle}</div>
                <div className="ai-text">{aiData.contexto}</div>
              </div>
              {/* Tags */}
              <div className="ai-block">
                <div className="ai-block-title">Como abordar</div>
                <div className="ai-tags">
                  {aiData.tags.map(([t, l], i) => (
                    <span key={i} className={`ai-tag ai-tag-${t}`}>{l}</span>
                  ))}
                </div>
              </div>
              {/* Script */}
              <div className="ai-block">
                <div className="ai-block-title">Script sugerido</div>
                <div className="ai-script-wrap">
                  <div className="ai-script-text">&ldquo;{aiData.script}&rdquo;</div>
                  <button
                    className="ai-copy"
                    onClick={copyScript}
                    title="Copiar script"
                    style={copied ? { borderColor: 'rgba(9,188,138,.3)' } : undefined}
                  >
                    {copied
                      ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#09bc8a" strokeWidth="2"><path d="M3 8l4 4 6-7"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"/></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
