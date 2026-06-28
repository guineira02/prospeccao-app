// ── Motor de Risco / Radar ────────────────────────────────────
// Determinístico (sem custo LLM), espelha a filosofia do tendencia.ts.
// Detecta leads esfriando ANTES de sumirem do radar — em especial os
// "invisíveis": parados, sem follow-up agendado, que o /followups não pega.
//
// Entrada: o cliente enriquecido que /api/clientes já devolve.
// Saída: RiscoResult com nível, score (ordenação) e motivos — ou null se sem risco.

import { diasAtraso, mesesAteVencimento, type Estagio } from './constants'

export type RiscoNivel = 'critico' | 'atencao' | 'observar'

export interface RiscoMotivo {
  tipo: 'proposta_travada' | 'follow_up_atrasado' | 'lead_invisivel'
      | 'negociacao_esfriando' | 'renovacao_janela' | 'nunca_contatado'
  label: string
  peso: number
}

export interface RiscoResult {
  nivel: RiscoNivel
  score: number          // soma dos pesos — usado para ordenar a fila
  motivos: RiscoMotivo[]
  principal: RiscoMotivo // motivo de maior peso (o que aparece em destaque)
}

// Cliente mínimo que o motor precisa (subset do ClienteEnriquecido).
export interface ClienteRisco {
  estagio: Estagio
  ultimoContato: string | null    // ISO created_at da última atividade
  proximoFollowUp: string | null  // YYYY-MM-DD
  vencimento: string | null       // YYYY-MM-DD (contrato)
  totalAtividades: number
}

// Dias corridos desde o último contato (null se nunca contatado).
export function diasSemToque(ultimoContato: string | null, hoje = new Date()): number | null {
  if (!ultimoContato) return null
  const u = new Date(ultimoContato)
  if (isNaN(u.getTime())) return null
  return Math.floor((hoje.getTime() - u.getTime()) / 86_400_000)
}

// Limiares (dias) — centralizados pra calibrar fácil.
const T = {
  PROPOSTA_PARADA: 5,
  SEM_TOQUE_INVISIVEL: 7,
  NEGOCIACAO_PARADA: 7,
  RENOVACAO_MESES: 3,
} as const

export function avaliarRisco(c: ClienteRisco, hoje = new Date()): RiscoResult | null {
  // Declinado sai do radar — não é risco, é encerrado.
  if (c.estagio === 'Declinado') return null

  const atraso = diasAtraso(c.proximoFollowUp)
  const semToque = diasSemToque(c.ultimoContato, hoje)
  const meses = mesesAteVencimento(c.vencimento)

  const motivos: RiscoMotivo[] = []

  // 1. Proposta travada — maior valor em jogo, deal perdendo momentum.
  if (c.estagio === 'Proposta' && semToque !== null && semToque > T.PROPOSTA_PARADA) {
    motivos.push({
      tipo: 'proposta_travada',
      label: `Proposta sem retorno há ${semToque}d`,
      peso: 50 + Math.min(semToque, 30),
    })
  }

  // 2. Follow-up agendado e vencido.
  if (atraso !== null && atraso > 0) {
    motivos.push({
      tipo: 'follow_up_atrasado',
      label: `Follow-up ${atraso}d em atraso`,
      peso: 10 + Math.min(atraso * 3, 30),
    })
  }

  // 3. Lead invisível — o buraco do /followups: parado E sem follow-up agendado.
  if (!c.proximoFollowUp && semToque !== null && semToque > T.SEM_TOQUE_INVISIVEL) {
    motivos.push({
      tipo: 'lead_invisivel',
      label: `${semToque}d sem contato, sem follow-up agendado`,
      peso: 15 + Math.min(semToque, 25),
    })
  }

  // 4. Negociação/Estudo esfriando (só se ainda houver follow-up; sem follow-up já caiu no #3).
  if ((c.estagio === 'Negociando' || c.estagio === 'Estudo') && c.proximoFollowUp
      && semToque !== null && semToque > T.NEGOCIACAO_PARADA) {
    motivos.push({
      tipo: 'negociacao_esfriando',
      label: `${c.estagio} parado há ${semToque}d`,
      peso: 25,
    })
  }

  // 5. Renovação na janela curta — oportunidade time-sensitive.
  if (meses !== null && meses >= 0 && meses <= T.RENOVACAO_MESES) {
    motivos.push({
      tipo: 'renovacao_janela',
      label: meses === 0 ? 'Renovação neste mês' : `Renova em ${meses}m`,
      peso: 20,
    })
  }

  // 6. Nunca contatado — oportunidade fria, baixa urgência.
  if (c.estagio === 'Novo' && c.totalAtividades === 0) {
    motivos.push({
      tipo: 'nunca_contatado',
      label: 'Nunca contatado',
      peso: 8,
    })
  }

  if (motivos.length === 0) return null

  motivos.sort((a, b) => b.peso - a.peso)
  const score = motivos.reduce((s, m) => s + m.peso, 0)
  const principal = motivos[0]

  // Nível: proposta travada é sempre crítico; senão por score.
  let nivel: RiscoNivel
  if (principal.tipo === 'proposta_travada' || score >= 50) nivel = 'critico'
  else if (score >= 25) nivel = 'atencao'
  else nivel = 'observar'

  return { nivel, score, motivos, principal }
}

export const NIVEL_LABEL: Record<RiscoNivel, string> = {
  critico:  'Crítico',
  atencao:  'Atenção',
  observar: 'Observar',
}

export const NIVEL_COLOR: Record<RiscoNivel, string> = {
  critico:  '#ef4444',
  atencao:  '#fbbf24',
  observar: '#60a5fa',
}
