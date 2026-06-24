const NEXI_BASE = process.env.NEXI_API_BASE!
const NEXI_KEY = process.env.NEXI_API_KEY!

function nexiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${NEXI_KEY}`,
  }
}

export interface NexiUser {
  nome: string
  cargo: string
  user_id: string
}

export interface NexiCliente {
  _id: string
  'Razão Social': string
  CNPJ: string
  UF: string
  'Consumo Estimado'?: number
  Status?: string
}

export async function nexiLogin(email: string, senha: string): Promise<NexiUser | null> {
  try {
    const res = await fetch(`${NEXI_BASE}/wf/login_mobile`, {
      method: 'POST',
      headers: nexiHeaders(),
      body: JSON.stringify({ email, senha, stay_logged_in: 'sim', remember_the_email: 'no' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.response?.user_id) return null
    return {
      nome: data.response.nome,
      cargo: data.response.cargo,
      user_id: data.response.user_id,
    }
  } catch {
    return null
  }
}

export async function nexiGetClientes(userId: string): Promise<NexiCliente[]> {
  try {
    const res = await fetch(`${NEXI_BASE}/wf/clientes_mobile`, {
      method: 'POST',
      headers: nexiHeaders(),
      body: JSON.stringify({ user_id: userId }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.response?.clientes ?? []
  } catch {
    return []
  }
}
