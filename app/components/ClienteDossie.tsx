'use client'

import { useState, useEffect } from 'react'
import { whatsappUrl, ESTAGIO_COLOR, type Estagio } from '@/lib/constants'
import { NIVEL_LABEL, NIVEL_COLOR, type RiscoResult } from '@/lib/risco'
import { WhatsIcon } from './WhatsIcon'

export interface DossieCliente {
  id: string; nome: string; cnpj: string; uf: string; regiao: string
  contatoNome: string; contatoEmail: string; contatoFone: string
  valorFatura: number | null; economia: number | null
  estagio: Estagio; ultimoContato: string | null; proximoFollowUp: string | null
  totalAtividades: number; concorrente: string | null; vencimento: string | null
}

interface Analise {
  diagnostico: string; sinais: string[]; urgencia: 'alta' | 'media' | 'baixa'
  canal_sugerido: string; abordagem: string[]; script: string
}
interface Briefing { id: string; analise: Analise; created_at: string }
interface Receita {
  razao_social: string; cnae: string; atividade: string; situacao: string
  municipio: string; uf: string; email: string; telefone: string; rep_legal: string
}
interface EstudoArquivo { nome: string; url: string; tipo: 'pdf' | 'imagem' | 'outro' }

const MAX_BRIEFINGS_UI = 2
const URG_COLOR: Record<string, string> = { alta: '#ef4444', media: '#fbbf24', baixa: '#09bc8a' }
const CANAL_ICON: Record<string, string> = { 'Ligação': '📞', 'WhatsApp': '💬', 'E-mail': '✉', 'Reunião': '👥' }

function fmtGerado(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtCNPJ(c: string) {
  const d = (c || '').replace(/\D/g, '')
  if (d.length !== 14) return c || '—'
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}
function fmtData(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function ClienteDossie({
  cliente, risco, onClose, onAtender, onTimeline,
}: {
  cliente: DossieCliente
  risco?: RiscoResult
  onClose: () => void
  onAtender: (id: string) => void
  onTimeline: (c: DossieCliente) => void
}) {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [restantes, setRestantes] = useState(2)
  const [verIndex, setVerIndex] = useState(0)
  const [aLoading, setALoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [aErro, setAErro] = useState('')
  const [copied, setCopied] = useState(false)

  const [estudo, setEstudo] = useState<EstudoArquivo[] | null>(null)
  const [eLoading, setELoading] = useState(true)

  const [receita, setReceita] = useState<Receita | null>(null)
  const [rLoading, setRLoading] = useState(false)
  const [rErro, setRErro] = useState('')

  const wa = whatsappUrl(cliente.contatoFone)

  // Abordagem IA — carrega o que já foi gerado, sem chamar IA
  useEffect(() => {
    setALoading(true)
    fetch(`/api/analise/${cliente.id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setAErro(d.error); else { setBriefings(d.briefings ?? []); setRestantes(d.restantes ?? 0) } })
      .catch(() => setAErro('Falha ao carregar análises'))
      .finally(() => setALoading(false))
  }, [cliente])

  function gerarAnalise() {
    setGerando(true); setAErro('')
    fetch(`/api/analise/${cliente.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setAErro(d.error); return }
        setBriefings(prev => [{ id: `novo-${prev.length}`, analise: d.analise, created_at: new Date().toISOString() }, ...prev])
        setRestantes(d.restantes ?? 0)
        setVerIndex(0)
      })
      .catch(() => setAErro('Falha ao gerar análise'))
      .finally(() => setGerando(false))
  }

  const analise = briefings[verIndex]?.analise ?? null
  const atualBriefing = briefings[verIndex]

  // Estudo de viabilidade — auto na montagem
  useEffect(() => {
    setELoading(true)
    fetch(`/api/estudo/${cliente.id}`)
      .then(r => r.ok ? r.json() : { arquivos: [] })
      .then(d => setEstudo(d.arquivos ?? []))
      .catch(() => setEstudo([]))
      .finally(() => setELoading(false))
  }, [cliente.id])

  function buscarReceita() {
    const cnpj = (cliente.cnpj || '').replace(/\D/g, '')
    if (cnpj.length !== 14) { setRErro('CNPJ inválido para consulta'); return }
    setRLoading(true); setRErro('')
    fetch(`/api/cnpj/${cnpj}`)
      .then(r => r.json())
      .then(d => { if (d.error) setRErro(d.error); else setReceita(d) })
      .catch(() => setRErro('Falha na consulta'))
      .finally(() => setRLoading(false))
  }

  function copyScript() {
    if (!analise?.script) return
    navigator.clipboard.writeText(analise.script).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 460, maxWidth: '100%', height: '100%', background: '#1e1f24', borderLeft: '1px solid #353740', overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'slideFromRight 0.32s cubic-bezier(0.4,0,0.2,1) both' }}>

        {/* Header */}
        <div style={{ padding: '1.4rem 1.5rem 1rem', borderBottom: '1px solid #2a2c34', position: 'sticky', top: 0, background: '#1e1f24', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: '#15161b', border: '2px solid #09bc8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#09bc8a', flexShrink: 0 }}>
              {cliente.nome.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 3, lineHeight: 1.2 }}>{cliente.nome}</h2>
              <div style={{ fontSize: 11.5, color: '#81869e' }}>{fmtCNPJ(cliente.cnpj)}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#81869e', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, color: ESTAGIO_COLOR[cliente.estagio], background: `${ESTAGIO_COLOR[cliente.estagio]}1c`, border: `1px solid ${ESTAGIO_COLOR[cliente.estagio]}40` }}>{cliente.estagio}</span>
            {risco && (
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, color: NIVEL_COLOR[risco.nivel], background: `${NIVEL_COLOR[risco.nivel]}1c`, border: `1px solid ${NIVEL_COLOR[risco.nivel]}40` }}>
                ⚠ {NIVEL_LABEL[risco.nivel]} · {risco.principal.label}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>

          {/* WhatsApp ação primária */}
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, textDecoration: 'none',
              background: 'rgba(37,211,102,0.14)', border: '1px solid rgba(37,211,102,0.4)', borderRadius: 11,
              padding: '12px', marginBottom: 18, color: '#25d366', fontWeight: 700, fontSize: 14,
            }}>
              <WhatsIcon size={17} /> WhatsApp {cliente.contatoFone}{cliente.contatoNome ? ` · ${cliente.contatoNome}` : ''}
            </a>
          ) : (
            <div style={{ background: '#15161b', border: '1px solid #2a2c34', borderRadius: 11, padding: '10px 12px', marginBottom: 18, color: '#81869e', fontSize: 12 }}>
              Sem telefone cadastrado{cliente.contatoEmail ? ` · ${cliente.contatoEmail}` : ''}
            </div>
          )}

          {/* Dossiê — fatos rápidos */}
          <Section title="Dossiê">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Fato label="UF / Região" value={`${cliente.uf || '—'} · ${cliente.regiao}`} />
              <Fato label="Contatos" value={`${cliente.totalAtividades}`} />
              {cliente.valorFatura != null && <Fato label="Fatura" value={`R$ ${cliente.valorFatura.toLocaleString('pt-BR')}`} />}
              {cliente.economia != null && <Fato label="Economia est." value={`R$ ${cliente.economia.toLocaleString('pt-BR')}`} accent />}
              <Fato label="Último contato" value={fmtData(cliente.ultimoContato)} />
              <Fato label="Próx. follow-up" value={fmtData(cliente.proximoFollowUp)} />
              {cliente.contatoNome && <Fato label="Contato" value={cliente.contatoNome} />}
              {cliente.contatoEmail && <Fato label="E-mail" value={cliente.contatoEmail} />}
              {cliente.concorrente && <Fato label="Concorrente" value={cliente.concorrente} />}
              {cliente.vencimento && <Fato label="Vence em" value={fmtData(cliente.vencimento)} />}
            </div>
          </Section>

          {/* Estudo de Viabilidade */}
          {eLoading ? (
            <Section title="📄 Estudo de Viabilidade">
              <div style={{ fontSize: 12, color: '#81869e' }}>Buscando na Nexi...</div>
            </Section>
          ) : estudo && estudo.length > 0 ? (
            <Section title="📄 Estudo de Viabilidade">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {estudo.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                    background: '#15161b', border: '1px solid #353740', borderRadius: 10, padding: '10px 12px',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#353740')}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{a.tipo === 'pdf' ? '📄' : a.tipo === 'imagem' ? '🖼' : '📎'}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#c8cad0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</span>
                    <span style={{ fontSize: 11, color: '#09bc8a', fontWeight: 700, flexShrink: 0 }}>Abrir →</span>
                  </a>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Receita Federal — sob demanda */}
          <Section title="Dados da Receita">
            {!receita && (
              <button onClick={buscarReceita} disabled={rLoading} style={{
                width: '100%', padding: '10px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                border: '1px dashed #353740', background: 'transparent', color: rLoading ? '#5a5f73' : '#81869e', cursor: rLoading ? 'wait' : 'pointer',
              }}>
                {rLoading ? 'Consultando Receita Federal...' : '🔎 Buscar dados na Receita'}
              </button>
            )}
            {rErro && <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>{rErro}</div>}
            {receita && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, animation: 'fadeUp 0.3s ease both' }}>
                {receita.razao_social && <Fato label="Razão social" value={receita.razao_social} full />}
                {receita.atividade && <Fato label="Atividade (CNAE)" value={receita.atividade} full />}
                {receita.situacao && <Fato label="Situação" value={receita.situacao} />}
                {(receita.municipio || receita.uf) && <Fato label="Município" value={`${receita.municipio || '—'} / ${receita.uf || '—'}`} />}
                {receita.rep_legal && <Fato label="Representante legal" value={receita.rep_legal} full />}
                {receita.telefone && <Fato label="Telefone (RF)" value={receita.telefone} />}
                {receita.email && <Fato label="E-mail (RF)" value={receita.email} full />}
              </div>
            )}
          </Section>

          {/* Abordagem IA */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(9,188,138,0.12)', border: '1px solid rgba(9,188,138,0.25)', borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, color: '#09bc8a', fontWeight: 700 }}>✦ Abordagem por IA</span>
            </div>

            {aLoading && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#81869e', fontSize: 12.5 }}>
                <div style={{ fontSize: 24, marginBottom: 10, animation: 'pulse 1.4s ease-in-out infinite' }}>✦</div>
                Carregando análises...
              </div>
            )}
            {!aLoading && aErro && <div style={{ marginBottom: 12, padding: '0.9rem', background: 'rgba(239,68,68,0.08)', borderRadius: 10, color: '#ef4444', fontSize: 12.5 }}>{aErro}</div>}

            {!aLoading && briefings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.75rem 1rem' }}>
                <p style={{ color: '#81869e', fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>Nenhuma análise gerada ainda. Cada geração consome IA — use quando fizer diferença.</p>
                <button onClick={gerarAnalise} disabled={gerando} style={{ background: 'rgba(9,188,138,0.12)', border: '1px solid rgba(9,188,138,0.3)', borderRadius: 9, padding: '9px 16px', color: '#09bc8a', fontSize: 12, cursor: gerando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  {gerando ? 'Gerando...' : `✦ Gerar Análise de IA (${restantes} disponíve${restantes === 1 ? 'l' : 'is'})`}
                </button>
              </div>
            )}

            {analise && (
              <div style={{ animation: 'fadeUp 0.4s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10.5, color: '#5a5f73' }}>Gerada em {fmtGerado(atualBriefing!.created_at)}</span>
                  {briefings.length > 1 && (
                    <button onClick={() => setVerIndex(i => (i + 1) % briefings.length)} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                      ver {verIndex === 0 ? 'anterior' : 'mais recente'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, color: URG_COLOR[analise.urgencia], background: `${URG_COLOR[analise.urgencia]}1c`, border: `1px solid ${URG_COLOR[analise.urgencia]}40` }}>
                    Urgência {analise.urgencia}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}>
                    {CANAL_ICON[analise.canal_sugerido] ?? '·'} {analise.canal_sugerido}
                  </span>
                </div>

                <Section title="Diagnóstico">
                  <p style={{ fontSize: 12.5, color: '#c8cad0', lineHeight: 1.6, margin: 0 }}>{analise.diagnostico}</p>
                </Section>

                {analise.sinais?.length > 0 && (
                  <Section title="Sinais">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {analise.sinais.map((s, i) => (
                        <span key={i} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 8, background: '#24262e', border: '1px solid #353740', color: '#c8cad0' }}>{s}</span>
                      ))}
                    </div>
                  </Section>
                )}

                {analise.abordagem?.length > 0 && (
                  <Section title="Como abordar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {analise.abordagem.map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: '#c8cad0', lineHeight: 1.5 }}>
                          <span style={{ color: '#09bc8a', fontWeight: 700, flexShrink: 0 }}>→</span>{a}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {analise.script && (
                  <Section title="Script sugerido">
                    <div style={{ background: '#15161b', border: '1px solid #353740', borderRadius: 10, padding: '12px', position: 'relative' }}>
                      <p style={{ fontSize: 12.5, color: '#c8cad0', lineHeight: 1.6, margin: 0, fontStyle: 'italic', paddingRight: 60 }}>&ldquo;{analise.script}&rdquo;</p>
                      <button onClick={copyScript} title="Copiar" style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: `1px solid ${copied ? 'rgba(9,188,138,0.4)' : '#353740'}`, borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 11, color: copied ? '#09bc8a' : '#81869e', transition: 'all 0.2s' }}>
                        {copied ? '✓ copiado' : '⎘ copiar'}
                      </button>
                    </div>
                  </Section>
                )}

                {restantes > 0 ? (
                  <button onClick={gerarAnalise} disabled={gerando} style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px solid #353740', borderRadius: 9, color: '#81869e', fontSize: 11.5, cursor: gerando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {gerando ? 'Gerando...' : `Gerar nova análise (restam ${restantes})`}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#81869e', padding: '8px', background: 'rgba(129,134,158,0.08)', borderRadius: 9 }}>
                    Limite de {MAX_BRIEFINGS_UI} análises por cliente — use com cautela, cada uma consome IA.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer ações */}
        <div style={{ position: 'sticky', bottom: 0, background: '#1e1f24', borderTop: '1px solid #2a2c34', padding: '12px 1.5rem', display: 'flex', gap: 8 }}>
          <button onClick={() => onTimeline(cliente)} style={{ flex: '0 0 auto', padding: '11px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, border: '1px solid #353740', background: 'transparent', color: '#81869e', cursor: 'pointer', fontFamily: 'inherit' }}>
            Timeline
          </button>
          <button onClick={() => onAtender(cliente.id)} style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: '#09bc8a', color: '#0d1e18', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 20px rgba(9,188,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            ▶ Atender agora
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Fato({ label, value, accent, full }: { label: string; value: string; accent?: boolean; full?: boolean }) {
  return (
    <div style={{ background: '#15161b', border: '1px solid #2a2c34', borderRadius: 9, padding: '8px 10px', gridColumn: full ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: accent ? '#09bc8a' : '#e6e7ea', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: full ? 'normal' : 'nowrap' }}>{value}</div>
    </div>
  )
}
