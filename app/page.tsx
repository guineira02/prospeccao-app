'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const ORBS = [
  { w: 480, h: 480, top: '-10%', left: '-8%',  color: 'rgba(9,188,138,0.18)',  dur: '9s',  tx: '30px',  ty: '-40px', tx2: '-20px', ty2: '25px'  },
  { w: 340, h: 340, top: '50%',  left: '10%',  color: 'rgba(96,165,250,0.12)', dur: '12s', tx: '-25px', ty: '35px',  tx2: '15px',  ty2: '-20px' },
  { w: 260, h: 260, top: '20%',  left: '40%',  color: 'rgba(0,229,160,0.10)',  dur: '7s',  tx: '20px',  ty: '20px',  tx2: '-15px', ty2: '-25px' },
  { w: 400, h: 400, top: '60%',  left: '30%',  color: 'rgba(9,188,138,0.08)',  dur: '11s', tx: '35px',  ty: '-20px', tx2: '-30px', ty2: '30px'  },
]

/* Ghost logo Nexi — opacity max 0.065, filter blur */
const GHOSTS = [
  { size: 260, top: '5%',  left: '44%', opacity: 0.062, dur: '18s', delay: '0s',    blur: 3, tx: '20px',  ty: '-25px', tx2: '-15px', ty2: '20px' },
  { size: 120, top: '62%', left: '14%', opacity: 0.05,  dur: '14s', delay: '3s',    blur: 2, tx: '-18px', ty: '22px',  tx2: '12px',  ty2: '-18px' },
  { size: 72,  top: '18%', left: '22%', opacity: 0.04,  dur: '11s', delay: '1.5s',  blur: 2, tx: '14px',  ty: '-16px', tx2: '-10px', ty2: '12px' },
  { size: 72,  top: '78%', left: '52%', opacity: 0.04,  dur: '16s', delay: '5s',    blur: 2, tx: '-12px', ty: '18px',  tx2: '16px',  ty2: '-12px' },
]

const NEXI_PATH = 'M1.5 36.3747L27.8064 49.0643V66.12C27.8064 70.1809 27.8064 74.9533 27.4992 78.2018C31.17 76.3761 37.4409 73.5302 42.334 71.2979L69.4033 59.1153L1.5 27.2394V2.36401L94.0286 45.9194C99.9925 48.7615 105.5 52.9236 105.5 59.525C105.5 66.1264 100.455 69.9826 94.0286 72.926L1.5 115.364V36.3747Z'

const ERRO_MSG: Record<string, string> = {
  oauth_invalido:        'Link de autenticação inválido. Tente novamente.',
  oauth_config:          'Login da Nexi ainda não configurado. Fale com o administrador.',
  token_invalido:        'Erro ao autenticar com a Nexi. Tente novamente.',
  agente_nao_encontrado: 'Sua conta da Nexi não foi encontrada.',
  sessao_falhou:         'Erro ao criar sessão. Tente novamente.',
}

function LoginContent() {
  const erro = useSearchParams().get('erro')

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      background: '#15161b',
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

      {/* Ghost logo Nexi — discretos, opacity < 0.07 */}
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

      {/* Painel central */}
      <div style={{
        flex: '0 0 100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem',
        zIndex: 3,
      }}>
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.7s ease both' }}>
          {/* Logo */}
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
              Prospecção Nexi
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

          {erro && (
            <div style={{
              maxWidth: 360, margin: '0 auto 16px', padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)', borderRadius: 8,
              color: '#ef4444', fontSize: 12,
            }}>
              {ERRO_MSG[erro] ?? 'Erro desconhecido. Tente novamente.'}
            </div>
          )}

          {/* Login direto na página da Nexi (OAuth) */}
          <a
            href="/api/auth/login"
            style={{
              display: 'inline-block',
              background: '#09bc8a',
              color: '#0d1e18',
              border: 'none',
              borderRadius: 12,
              padding: '14px 32px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Montserrat, sans-serif',
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(9,188,138,0.35)',
              transition: 'opacity 0.2s',
            }}
          >
            Entrar com a Nexi
          </a>

          <p style={{ color: '#5a5f73', fontSize: 11, marginTop: 16 }}>
            Você será levado à página de login segura da Nexi
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
