'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ORBS = [
  { w: 480, h: 480, top: '-10%', left: '-8%',  color: 'rgba(9,188,138,0.18)',  dur: '9s',  tx: '30px',  ty: '-40px', tx2: '-20px', ty2: '25px' },
  { w: 340, h: 340, top: '50%',  left: '10%',  color: 'rgba(96,165,250,0.12)', dur: '12s', tx: '-25px', ty: '35px',  tx2: '15px',  ty2: '-20px' },
  { w: 260, h: 260, top: '20%',  left: '40%',  color: 'rgba(0,229,160,0.10)',  dur: '7s',  tx: '20px',  ty: '20px',  tx2: '-15px', ty2: '-25px' },
  { w: 400, h: 400, top: '60%',  left: '30%',  color: 'rgba(9,188,138,0.08)',  dur: '11s', tx: '35px',  ty: '-20px', tx2: '-30px', ty2: '30px' },
  { w: 200, h: 200, top: '5%',   left: '60%',  color: 'rgba(251,191,36,0.06)', dur: '8s',  tx: '-10px', ty: '30px',  tx2: '20px',  ty2: '-15px' },
]

const BOLTS = [
  { top: '15%', left: '12%',  r: '-15deg', size: 64 },
  { top: '65%', left: '8%',   r: '20deg',  size: 48 },
  { top: '35%', left: '48%',  r: '-8deg',  size: 56 },
  { top: '75%', left: '42%',  r: '30deg',  size: 40 },
]

function BoltSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" fill="#09bc8a" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [split, setSplit]     = useState(false)
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErro(data.error ?? 'Erro ao autenticar')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: '#15161b',
      }}
    >
      {/* Animated orbs */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: orb.w,
            height: orb.h,
            top: orb.top,
            left: orb.left,
            borderRadius: '50%',
            background: orb.color,
            filter: 'blur(60px)',
            pointerEvents: 'none',
            animation: `orbFloat ${orb.dur} ease-in-out infinite`,
            ['--tx' as string]: orb.tx,
            ['--ty' as string]: orb.ty,
            ['--tx2' as string]: orb.tx2,
            ['--ty2' as string]: orb.ty2,
          }}
        />
      ))}

      {/* Bolt icons */}
      {BOLTS.map((bolt, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: bolt.top,
            left: bolt.left,
            pointerEvents: 'none',
            opacity: 0.12,
            animation: `boltDrift 6s ease-in-out infinite`,
            animationDelay: `${i * 1.2}s`,
            ['--r' as string]: bolt.r,
          }}
        >
          <BoltSVG size={bolt.size} />
        </div>
      ))}

      {/* Left panel */}
      <div
        style={{
          flex: split ? '0 0 55%' : '0 0 100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '4rem',
          zIndex: 1,
          transition: 'flex 0.6s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.7s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#09bc8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(9,188,138,0.4)',
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" fill="#0d1e18" />
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
            onClick={() => setSplit(true)}
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
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Entrar com a Nexi
          </button>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: '0 0 45%',
          background: '#1e1f24',
          borderLeft: '1px solid #353740',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          transform: split ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          position: split ? 'relative' : 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 2,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button
            onClick={() => setSplit(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#81869e',
              cursor: 'pointer',
              fontSize: 12,
              marginBottom: 24,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            ← Voltar
          </button>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Bem-vindo
          </h1>
          <p style={{ fontSize: 13, color: '#81869e', marginBottom: 28 }}>
            Entre com sua conta da Nexi para continuar
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#81869e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="seu@email.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#15161b',
                  border: '1px solid #353740',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#81869e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#15161b',
                  border: '1px solid #353740',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
              />
            </div>

            {erro && (
              <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 12 }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#353740' : '#09bc8a',
                color: loading ? '#81869e' : '#0d1e18',
                border: 'none',
                borderRadius: 10,
                padding: '12px',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
