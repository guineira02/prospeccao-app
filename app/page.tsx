'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#15161b' }}>

      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#09bc8a' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 12H2L8 2Z" fill="#15161b" />
            </svg>
          </div>
          <span className="text-xl font-semibold" style={{ color: '#ffffff' }}>Prospecção</span>
        </div>
        <p className="text-sm" style={{ color: '#81869e' }}>
          Linha do tempo comercial — Nexi
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-8 border"
        style={{ backgroundColor: '#1e1f24', borderColor: '#353740' }}>
        <h1 className="text-lg font-semibold mb-1" style={{ color: '#ffffff' }}>
          Bem-vindo
        </h1>
        <p className="text-sm mb-6" style={{ color: '#81869e' }}>
          Entre com sua conta da Nexi para continuar
        </p>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3 rounded-xl font-medium text-sm transition-opacity glow-brand"
          style={{ backgroundColor: '#09bc8a', color: '#15161b' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Entrar com a Nexi
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4 z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 border"
            style={{ backgroundColor: '#1e1f24', borderColor: '#353740' }}>

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold" style={{ color: '#ffffff' }}>Entrar com a Nexi</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
                style={{ color: '#81869e' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#24262e')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#81869e' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border transition-colors"
                  style={{ backgroundColor: '#15161b', borderColor: '#353740', color: '#ffffff' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#81869e' }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border transition-colors"
                  style={{ backgroundColor: '#15161b', borderColor: '#353740', color: '#ffffff' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
                />
              </div>

              {erro && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-sm transition-all mt-2"
                style={{
                  backgroundColor: loading ? '#353740' : '#09bc8a',
                  color: loading ? '#81869e' : '#15161b',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Autenticando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
