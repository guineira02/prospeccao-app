'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Cliente { id: string; nome: string; cnpj: string; uf: string }

interface Action { id: string; label: string; hint: string; run: () => void }

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen]   = useState(false)
  const [q, setQ]         = useState('')
  const [sel, setSel]     = useState(0)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // abre com Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // carrega clientes na 1ª abertura
  useEffect(() => {
    if (open && clientes.length === 0) {
      fetch('/api/clientes').then(r => r.json()).then(d => setClientes(d.clientes ?? [])).catch(() => {})
    }
    if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) }
  }, [open, clientes.length])

  const acoes: Action[] = useMemo(() => [
    { id: 'atender', label: '▶ Iniciar Atendimento', hint: 'Fila completa', run: () => { sessionStorage.setItem('fila_atendimento', JSON.stringify({ ids: [], label: 'Carteira' })); router.push('/dashboard/atender') } },
    { id: 'clientes', label: 'Meus Clientes', hint: 'Carteira', run: () => router.push('/dashboard') },
    { id: 'painel', label: 'Painel', hint: 'KPIs + radar', run: () => router.push('/dashboard/painel') },
    { id: 'followups', label: 'Follow-ups', hint: 'Pendências', run: () => router.push('/dashboard/followups') },
  ], [router])

  const resultados = useMemo(() => {
    if (!q.trim()) return { acoes, clientes: [] as Cliente[] }
    const ql = q.toLowerCase()
    return {
      acoes: acoes.filter(a => a.label.toLowerCase().includes(ql)),
      clientes: clientes.filter(c => c.nome.toLowerCase().includes(ql) || c.cnpj.includes(q) || c.uf.toLowerCase().includes(ql)).slice(0, 6),
    }
  }, [q, acoes, clientes])

  const flat = useMemo(() => [
    ...resultados.acoes.map(a => ({ type: 'acao' as const, a })),
    ...resultados.clientes.map(c => ({ type: 'cli' as const, c })),
  ], [resultados])

  function exec(i: number) {
    const item = flat[i]; if (!item) return
    setOpen(false)
    if (item.type === 'acao') item.a.run()
    else { sessionStorage.setItem(`cli_${item.c.id}`, JSON.stringify(item.c)); router.push(`/dashboard/${item.c.id}`) }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); exec(sel) }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', paddingTop: '12vh' }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div style={{ width: '100%', maxWidth: 560, height: 'fit-content', background: '#1e1f24', border: '1px solid #353740', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', animation: 'paletteIn 0.18s cubic-bezier(0.4,0,0.2,1) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2a2c34' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#81869e" strokeWidth="1.5" style={{ width: 16, height: 16, flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5" /><path d="M10.5 10.5L14 14" /></svg>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(0) }} onKeyDown={onListKey}
            placeholder="Buscar cliente ou ação..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontFamily: 'inherit' }} />
          <kbd style={{ fontSize: 10, color: '#5a5f73', border: '1px solid #353740', borderRadius: 5, padding: '2px 6px' }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
          {flat.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#81869e', fontSize: 13 }}>Nada encontrado.</div>}
          {resultados.acoes.length > 0 && <Group title="Ações" />}
          {resultados.acoes.map((a, i) => (
            <Item key={a.id} active={sel === i} onHover={() => setSel(i)} onClick={() => exec(i)} primary={a.label} secondary={a.hint} />
          ))}
          {resultados.clientes.length > 0 && <Group title="Clientes" />}
          {resultados.clientes.map((c, j) => {
            const i = resultados.acoes.length + j
            return <Item key={c.id} active={sel === i} onHover={() => setSel(i)} onClick={() => exec(i)} primary={c.nome} secondary={`${c.uf} · ${c.cnpj}`} avatar={c.nome.slice(0, 2).toUpperCase()} />
          })}
        </div>
      </div>
    </div>
  )
}

function Group({ title }: { title: string }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5f73', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 10px 4px' }}>{title}</div>
}
function Item({ active, primary, secondary, avatar, onClick, onHover }: { active: boolean; primary: string; secondary: string; avatar?: string; onClick: () => void; onHover: () => void }) {
  return (
    <button onClick={onClick} onMouseEnter={onHover} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 9,
      background: active ? 'rgba(9,188,138,0.12)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    }}>
      {avatar && <div style={{ width: 28, height: 28, borderRadius: 8, background: '#24262e', border: '1px solid #353740', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#09bc8a', flexShrink: 0 }}>{avatar}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? '#fff' : '#c8cad0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</div>
      </div>
      <span style={{ fontSize: 11, color: '#81869e', flexShrink: 0 }}>{secondary}</span>
    </button>
  )
}
