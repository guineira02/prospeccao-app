'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Me { nome: string; cargo: string; initials: string; _id: string }
export interface Cliente {
  _id: string; 'Razão Social': string; CNPJ: string; UF: string
  'Consumo Estimado'?: number; Status?: string; Concorrente?: string
}
export interface Atividade {
  id: string; agente_id: string; cliente_id: string
  tipo: string; status: string; comentario: string | null
  follow_up_data: string | null; created_at: string
}

interface DashCtx {
  me:         Me | null
  clientes:   Cliente[]
  atividades: Atividade[]
  loading:    boolean
}

const Ctx = createContext<DashCtx>({ me: null, clientes: [], atividades: [], loading: true })

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [me,         setMe]         = useState<Me | null>(null)
  const [clientes,   setClientes]   = useState<Cliente[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.ok ? r.json() : null),
      fetch('/api/clientes').then(r => r.ok ? r.json() : null),
      fetch('/api/atividades').then(r => r.ok ? r.json() : null),
    ]).then(([meData, clData, atData]) => {
      if (meData?.nome)              setMe(meData)
      if (clData?.clientes?.length)  setClientes(clData.clientes)
      if (atData?.atividades)        setAtividades(atData.atividades)
      setLoading(false)
    })
  }, [])

  return <Ctx.Provider value={{ me, clientes, atividades, loading }}>{children}</Ctx.Provider>
}

export function useDashboard() { return useContext(Ctx) }
