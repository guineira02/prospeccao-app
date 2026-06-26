'use client'

import { useEffect, useState } from 'react'

interface Prefs {
  notif_email: boolean
  notif_whatsapp: boolean
  email_contato: string
  whatsapp_contato: string
}

// Máscara de telefone BR: (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo)
function maskTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 44, height: 24, borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: on ? '#09bc8a' : '#353740', position: 'relative', transition: 'background 0.2s',
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </button>
  )
}

export default function PerfilPage() {
  const [prefs, setPrefs]     = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [ok, setOk]           = useState(false)
  const [testando, setTestando] = useState(false)
  const [testeMsg, setTesteMsg] = useState<{ tipo: 'ok' | 'erro'; txt: string } | null>(null)

  useEffect(() => {
    fetch('/api/preferencias').then(r => r.json()).then(d => {
      if (d.prefs) setPrefs({
        notif_email:      d.prefs.notif_email ?? true,
        notif_whatsapp:   d.prefs.notif_whatsapp ?? false,
        email_contato:    d.prefs.email_contato ?? d.email_login ?? '',
        whatsapp_contato: maskTelefone(d.prefs.whatsapp_contato ?? ''),
      })
    }).finally(() => setLoading(false))
  }, [])

  async function salvar() {
    if (!prefs) return
    setSaving(true); setOk(false)
    const res = await fetch('/api/preferencias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
    if (res.ok) { setOk(true); setTimeout(() => setOk(false), 2000) }
  }

  function upd<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    setPrefs(p => p ? { ...p, [k]: v } : p)
  }

  async function enviarTeste() {
    if (!prefs) return
    setTestando(true); setTesteMsg(null)
    const res = await fetch('/api/notificacoes/teste', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: prefs.whatsapp_contato }),
    })
    const d = await res.json().catch(() => ({}))
    setTestando(false)
    if (res.ok) setTesteMsg({ tipo: 'ok', txt: '✓ Enviado! Confira seu WhatsApp.' })
    else setTesteMsg({ tipo: 'erro', txt: d.error || 'Falha ao enviar teste.' })
  }

  return (
    <div style={{ padding: '2rem 2.25rem', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.4px' }}>Notificações</h1>
      <p style={{ fontSize: 13, color: '#81869e', marginBottom: '1.75rem' }}>
        Seja avisado quando um follow-up atrasar mais de 2 dias.
      </p>

      {loading && <div style={{ color: '#81869e', fontSize: 13 }}>Carregando...</div>}

      {prefs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* WhatsApp — canal principal */}
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: prefs.notif_whatsapp ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>💬 WhatsApp</div>
                <div style={{ fontSize: 12, color: '#81869e' }}>Aviso via integração n8n da Nexi</div>
              </div>
              <Toggle on={prefs.notif_whatsapp} onClick={() => upd('notif_whatsapp', !prefs.notif_whatsapp)} />
            </div>
            {prefs.notif_whatsapp && (
              <input value={prefs.whatsapp_contato} onChange={e => upd('whatsapp_contato', maskTelefone(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric"
                style={{ width: '100%', padding: '10px 12px', background: '#15161b', border: '1px solid #353740', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />
            )}
            {prefs.notif_whatsapp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <button onClick={enviarTeste} disabled={testando} style={{
                  padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  border: '1px solid #25d36655', background: 'rgba(37,211,102,0.1)', color: '#25d366',
                  cursor: testando ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { if (!testando) e.currentTarget.style.background = 'rgba(37,211,102,0.18)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.1)')}>
                  {testando ? 'Enviando...' : '📲 Enviar teste'}
                </button>
                {testeMsg && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: testeMsg.tipo === 'ok' ? '#09bc8a' : '#ef4444' }}>
                    {testeMsg.txt}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Email — opcional */}
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: prefs.notif_email ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>✉ E-mail <span style={{ fontSize: 10, fontWeight: 600, color: '#81869e' }}>(opcional)</span></div>
                <div style={{ fontSize: 12, color: '#81869e' }}>Resumo dos follow-ups atrasados</div>
              </div>
              <Toggle on={prefs.notif_email} onClick={() => upd('notif_email', !prefs.notif_email)} />
            </div>
            {prefs.notif_email && (
              <input value={prefs.email_contato} onChange={e => upd('email_contato', e.target.value)} placeholder="seu@email.com" type="email"
                style={{ width: '100%', padding: '10px 12px', background: '#15161b', border: '1px solid #353740', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />
            )}
          </div>

          <button onClick={salvar} disabled={saving} style={{
            alignSelf: 'flex-start', marginTop: 6, padding: '11px 24px', borderRadius: 11, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            background: ok ? 'rgba(9,188,138,0.15)' : '#09bc8a', color: ok ? '#09bc8a' : '#0d1e18',
            boxShadow: ok ? 'none' : '0 0 18px rgba(9,188,138,0.25)', transition: 'all 0.2s',
          }}>
            {saving ? 'Salvando...' : ok ? '✓ Preferências salvas' : 'Salvar preferências'}
          </button>
        </div>
      )}
    </div>
  )
}
