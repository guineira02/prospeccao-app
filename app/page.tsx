'use client'

import { useState } from 'react'

const ORBS = [
  { w: 480, h: 480, top: '-10%', left: '-8%',  color: 'rgba(9,188,138,0.18)',  dur: '9s',  tx: '30px',  ty: '-40px', tx2: '-20px', ty2: '25px'  },
  { w: 340, h: 340, top: '50%',  left: '10%',  color: 'rgba(96,165,250,0.12)', dur: '12s', tx: '-25px', ty: '35px',  tx2: '15px',  ty2: '-20px' },
  { w: 260, h: 260, top: '20%',  left: '40%',  color: 'rgba(0,229,160,0.10)',  dur: '7s',  tx: '20px',  ty: '20px',  tx2: '-15px', ty2: '-25px' },
  { w: 400, h: 400, top: '60%',  left: '30%',  color: 'rgba(9,188,138,0.08)',  dur: '11s', tx: '35px',  ty: '-20px', tx2: '-30px', ty2: '30px'  },
]

const GHOSTS = [
  { size: 260, top: '5%',  left: '44%', opacity: 0.062, dur: '18s', delay: '0s',    blur: 3, tx: '20px',  ty: '-25px', tx2: '-15px', ty2: '20px' },
  { size: 120, top: '62%', left: '14%', opacity: 0.05,  dur: '14s', delay: '3s',    blur: 2, tx: '-18px', ty: '22px',  tx2: '12px',  ty2: '-18px' },
  { size: 72,  top: '18%', left: '22%', opacity: 0.04,  dur: '11s', delay: '1.5s',  blur: 2, tx: '14px',  ty: '-16px', tx2: '-10px', ty2: '12px' },
  { size: 72,  top: '78%', left: '52%', opacity: 0.04,  dur: '16s', delay: '5s',    blur: 2, tx: '-12px', ty: '18px',  tx2: '16px',  ty2: '-12px' },
]

const NEXI_PATH = 'M1.5 36.3747L27.8064 49.0643V66.12C27.8064 70.1809 27.8064 74.9533 27.4992 78.2018C31.17 76.3761 37.4409 73.5302 42.334 71.2979L69.4033 59.1153L1.5 27.2394V2.36401L94.0286 45.9194C99.9925 48.7615 105.5 52.9236 105.5 59.525C105.5 66.1264 100.455 69.9826 94.0286 72.926L1.5 115.364V36.3747Z'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '14px 16px',
  fontSize: 14,
  color: '#e8e9ef',
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

export default function LoginPage() {
  const [step, setStep] = useState<'welcome' | 'form'>('welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusField, setFocusField] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (res.ok) {
        window.location.href = '/dashboard'
      } else {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401 || data.error === 'invalid_credentials') {
          setError('Credenciais inválidas. Use o mesmo acesso da Nexi.')
        } else {
          setError('Erro ao conectar. Tente novamente.')
        }
        setLoading(false)
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#15161b',
      overflow: 'hidden',
    }}>

      {/* Animated orbs */}
      {ORBS.map((orb, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: orb.w,
          height: orb.h,
          top: orb.top,
          left: orb.left,
          borderRadius: '50%',
          background: orb.color,
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: `orbFloat ${orb.dur} ease-in-out infinite`,
          ['--tx' as string]: orb.tx,
          ['--ty' as string]: orb.ty,
          ['--tx2' as string]: orb.tx2,
          ['--ty2' as string]: orb.ty2,
        }} />
      ))}

      {/* Ghost logos */}
      {GHOSTS.map((g, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: g.top,
          left: g.left,
          pointerEvents: 'none',
          opacity: g.opacity,
          zIndex: 1,
          filter: `blur(${g.blur}px)`,
          animation: `orbFloat ${g.dur} ease-in-out infinite`,
          animationDelay: g.delay,
          ['--tx' as string]: g.tx,
          ['--ty' as string]: g.ty,
          ['--tx2' as string]: g.tx2,
          ['--ty2' as string]: g.ty2,
        }}>
          <svg width={g.size} height={Math.round(g.size * 118 / 107)} viewBox="0 0 107 118" fill="none">
            <path d={NEXI_PATH} fill="#09bc8a" />
          </svg>
        </div>
      ))}

      {/* Slide container — 200% wide, each panel 50% = 100vw */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, bottom: 0,
        width: '200%',
        display: 'flex',
        transform: step === 'form' ? 'translateX(-50%)' : 'translateX(0)',
        transition: 'transform 0.48s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 3,
      }}>

        {/* Panel 1 — Welcome */}
        <div style={{
          width: '50%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '4rem',
        }}>
          <div style={{ textAlign: 'center', animation: 'fadeUp 0.7s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: '#09bc8a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(9,188,138,0.4)',
              }}>
                <svg width="18" height="20" viewBox="0 0 107 118" fill="none">
                  <path d={NEXI_PATH} fill="#0d1e18" />
                </svg>
              </div>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                Prospecção
              </span>
            </div>

            <p style={{ color: '#81869e', fontSize: 14, marginBottom: 8 }}>
              Linha do tempo comercial · Tendência Energia
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '2.5rem 0', alignItems: 'center' }}>
              {[
                'Registre cada contato na linha do tempo',
                'Acompanhe follow-ups em aberto',
                'Visualize oportunidades por prioridade',
              ].map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#81869e', fontSize: 13 }}>
                  <span style={{ color: '#09bc8a', fontWeight: 700 }}>✓</span>
                  {txt}
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('form')}
              style={{
                background: '#09bc8a',
                color: '#0d1e18',
                border: 'none',
                borderRadius: 12,
                padding: '14px 32px',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(9,188,138,0.35)',
              }}
            >
              Entrar com a Nexi
            </button>
          </div>
        </div>

        {/* Panel 2 — Login form */}
        <div style={{
          width: '50%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '4rem',
        }}>
          <div style={{ width: '100%', maxWidth: 360 }}>

            {/* Back + Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <button
                onClick={() => { setStep('welcome'); setError('') }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: '#81869e',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontSize: 16,
                  lineHeight: 1,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                ←
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#09bc8a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(9,188,138,0.35)',
                }}>
                  <svg width="14" height="16" viewBox="0 0 107 118" fill="none">
                    <path d={NEXI_PATH} fill="#0d1e18" />
                  </svg>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
                  Prospecção
                </span>
              </div>
            </div>

            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
              Acesse sua conta
            </h2>
            <p style={{ color: '#52566e', fontSize: 13, margin: '0 0 28px' }}>
              Use as mesmas credenciais do seu acesso à Nexi
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', color: '#81869e', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField(null)}
                  style={{
                    ...INPUT_STYLE,
                    borderColor: focusField === 'email' ? '#09bc8a' : 'rgba(255,255,255,0.1)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#81869e', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onFocus={() => setFocusField('password')}
                    onBlur={() => setFocusField(null)}
                    style={{
                      ...INPUT_STYLE,
                      paddingRight: 44,
                      borderColor: focusField === 'password' ? '#09bc8a' : 'rgba(255,255,255,0.1)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#52566e', padding: 4, display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#f87171',
                  fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? 'rgba(9,188,138,0.5)' : '#09bc8a',
                  color: '#0d1e18',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(9,188,138,0.35)',
                  transition: 'all 0.2s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
