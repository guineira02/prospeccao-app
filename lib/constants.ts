// ── Tipos de atividade (conforme BRIEF) ───────────────────────
export const TIPOS = [
  'Ligação',
  'Resposta',
  'Retorno',
  'Estudo Solicitado',
  'Estudo Apresentado',
  'Proposta',
  'Declínio',
  'Nota',
] as const
export type Tipo = typeof TIPOS[number]

export const STATUS = [
  'Atendeu',
  'Não atendeu',
  'Agendou retorno',
  'Cliente recusou',
  'Histórico',
] as const
export type StatusAtividade = typeof STATUS[number]

// 'Histórico' marca registro importado da Nexi (sem desfecho de ligação) —
// não deve aparecer como opção no modal de registro manual.
export const STATUS_MANUAL = STATUS.filter(s => s !== 'Histórico')

export const TIPO_ICON: Record<string, string> = {
  'Ligação':            '📞',
  'Resposta':           '💬',
  'Retorno':            '↩️',
  'Estudo Solicitado':  '📋',
  'Estudo Apresentado': '📊',
  'Proposta':           '📄',
  'Declínio':           '✕',
  'Nota':               '📝',
}

export const TIPO_COLOR: Record<string, string> = {
  'Ligação':            '#09bc8a',
  'Resposta':           '#60a5fa',
  'Retorno':            '#22d3ee',
  'Estudo Solicitado':  '#fbbf24',
  'Estudo Apresentado': '#a78bfa',
  'Proposta':           '#34d399',
  'Declínio':           '#ef4444',
  'Nota':               '#81869e',
}

export const STATUS_COLOR: Record<string, string> = {
  'Atendeu':         '#09bc8a',
  'Não atendeu':     '#fbbf24',
  'Agendou retorno': '#60a5fa',
  'Cliente recusou': '#ef4444',
  'Histórico':       '#81869e',
}

// ── Estágio do pipeline (DERIVADO da última atividade) ────────
// Nexi não tem status de prospecção. Calculamos do nosso Supabase.
export const ESTAGIOS = [
  'Novo',
  'Em contato',
  'Negociando',
  'Estudo',
  'Proposta',
  'Declinado',
] as const
export type Estagio = typeof ESTAGIOS[number]

export const ESTAGIO_COLOR: Record<Estagio, string> = {
  'Novo':       '#81869e',
  'Em contato': '#60a5fa',
  'Negociando': '#22d3ee',
  'Estudo':     '#a78bfa',
  'Proposta':   '#09bc8a',
  'Declinado':  '#ef4444',
}

export interface AtividadeLite {
  tipo:           string
  status:         string
  follow_up_data: string | null
  created_at:     string
}

// Deriva o estágio atual a partir da atividade mais recente.
export function derivarEstagio(ultima?: AtividadeLite | null): Estagio {
  if (!ultima) return 'Novo'
  const { tipo, status } = ultima
  if (tipo === 'Declínio' || status === 'Cliente recusou') return 'Declinado'
  if (tipo === 'Proposta') return 'Proposta'
  if (tipo === 'Estudo Solicitado' || tipo === 'Estudo Apresentado') return 'Estudo'
  if (status === 'Agendou retorno' || tipo === 'Retorno' || tipo === 'Resposta') return 'Negociando'
  return 'Em contato'
}

// ── Datas / follow-up ─────────────────────────────────────────
// +N dias úteis (pula sábado/domingo).
export function addDiasUteis(base: Date, dias: number): Date {
  const d = new Date(base)
  let restantes = dias
  while (restantes > 0) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) restantes--
  }
  return d
}

export function proximoFollowUp(): string {
  return addDiasUteis(new Date(), 2).toISOString().slice(0, 10)
}

// dias de atraso de um follow-up (>0 = atrasado). null se sem data.
export function diasAtraso(followUp: string | null): number | null {
  if (!followUp) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const fu = new Date(followUp + 'T00:00:00')
  return Math.round((hoje.getTime() - fu.getTime()) / 86_400_000)
}

// ── Regiões (Marcelly: Ceará + Norte) ─────────────────────────
export const REGIOES: Record<string, string[]> = {
  'Norte':        ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste':     ['CE', 'AL', 'BA', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste':      ['ES', 'MG', 'RJ', 'SP'],
  'Sul':          ['PR', 'RS', 'SC'],
}

export function regiaoDaUF(uf: string): string {
  const u = uf.toUpperCase()
  for (const [regiao, ufs] of Object.entries(REGIOES)) {
    if (ufs.includes(u)) return regiao
  }
  return '—'
}

// Monta link do WhatsApp a partir de um telefone BR.
// Limpa não-dígitos e garante DDI 55. Retorna null se não houver número usável.
export function whatsappUrl(fone: string | null | undefined): string | null {
  if (!fone) return null
  let d = fone.replace(/\D/g, '')
  if (d.length < 10) return null              // sem DDD + número mínimo
  if (!d.startsWith('55')) d = '55' + d
  return `https://wa.me/${d}`
}

// Renovação: contrato vence em <= 6 meses
export function mesesAteVencimento(dataVenc: string | null): number | null {
  if (!dataVenc) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const venc = new Date(dataVenc + 'T00:00:00')
  return (venc.getFullYear() - hoje.getFullYear()) * 12 + (venc.getMonth() - hoje.getMonth())
}
