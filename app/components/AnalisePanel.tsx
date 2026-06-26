'use client'

import { useState, useEffect } from 'react'

interface Analise {
  diagnostico: string
  sinais: string[]
  urgencia: 'alta' | 'media' | 'baixa'
  canal_sugerido: string
  abordagem: string[]
  script: string
}

const URG_COLOR: Record<string, string> = { alta: '#ef4444', media: '#fbbf24', baixa: '#09bc8a' }
const CANAL_ICON: Record<string, string> = { 'Ligação': '📞', 'WhatsApp': '💬', 'E-mail': '✉', 'Reunião': '👥' }

export function AnalisePanel({ clienteId, cliente, onClose }: { clienteId: string; cliente: unknown; onClose: () => void }) {
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')
  const [copied, setCopied]   = useState(false)

  // carrega na montagem
  useEffect(() => {
    fetch(`/api/analise/${clienteId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente }),
    })
      .then(r => r.json())
      .then(d => { if (d.error) setErro(d.error); else setAnalise(d.analise) })
      .catch(() => setErro('Falha ao gerar análise'))
      .finally(() => setLoading(false))
  }, [clienteId, cliente])

  function copyScript() {
    if (!analise) return
    navigator.clipboard.writeText(analise.script).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 380, maxWidth: '100%', height: '100%', background: '#1e1f24', borderLeft: '1px solid #353740', overflowY: 'auto', padding: '1.5rem', animation: 'slideFromRight 0.32s cubic-bezier(0.4,0,0.2,1) both' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(9,188,138,0.12)', border: '1px solid rgba(9,188,138,0.25)', borderRadius: 20, padding: '4px 12px' }}>
            <span style={{ fontSize: 12, color: '#09bc8a', fontWeight: 700 }}>✦ Análise de IA</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#81869e', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#81869e', fontSize: 13 }}>
            <div style={{ fontSize: 26, marginBottom: 12, animation: 'pulse 1.4s ease-in-out infinite' }}>✦</div>
            Lendo o histórico e o método Tendência...
          </div>
        )}

        {!loading && erro && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 10, color: '#ef4444', fontSize: 13 }}>{erro}</div>
        )}

        {analise && (
          <div style={{ animation: 'fadeUp 0.4s ease both' }}>
            {/* urgência + canal */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, color: URG_COLOR[analise.urgencia], background: `${URG_COLOR[analise.urgencia]}1c`, border: `1px solid ${URG_COLOR[analise.urgencia]}40` }}>
                Urgência {analise.urgencia}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}>
                {CANAL_ICON[analise.canal_sugerido] ?? '·'} {analise.canal_sugerido}
              </span>
            </div>

            {/* diagnóstico */}
            <Section title="Diagnóstico">
              <p style={{ fontSize: 13, color: '#c8cad0', lineHeight: 1.6, margin: 0 }}>{analise.diagnostico}</p>
            </Section>

            {/* sinais */}
            <Section title="Sinais">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {analise.sinais.map((s, i) => (
                  <span key={i} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 8, background: '#24262e', border: '1px solid #353740', color: '#c8cad0' }}>{s}</span>
                ))}
              </div>
            </Section>

            {/* abordagem */}
            <Section title="Como abordar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {analise.abordagem.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: '#c8cad0', lineHeight: 1.5 }}>
                    <span style={{ color: '#09bc8a', fontWeight: 700, flexShrink: 0 }}>→</span>{a}
                  </div>
                ))}
              </div>
            </Section>

            {/* script */}
            <Section title="Script sugerido">
              <div style={{ background: '#15161b', border: '1px solid #353740', borderRadius: 10, padding: '12px', position: 'relative' }}>
                <p style={{ fontSize: 12.5, color: '#c8cad0', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>&ldquo;{analise.script}&rdquo;</p>
                <button onClick={copyScript} title="Copiar" style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: `1px solid ${copied ? 'rgba(9,188,138,0.4)' : '#353740'}`, borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 11, color: copied ? '#09bc8a' : '#81869e', transition: 'all 0.2s' }}>
                  {copied ? '✓ copiado' : '⎘ copiar'}
                </button>
              </div>
            </Section>

            <div style={{ fontSize: 10.5, color: '#5a5f73', marginTop: 16, textAlign: 'center' }}>
              Gerado por IA · método consultivo Tendência Energia
            </div>
          </div>
        )}
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
