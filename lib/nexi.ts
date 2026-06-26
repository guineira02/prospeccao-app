const NEXI_BASE = process.env.NEXI_API_BASE!
const NEXI_KEY  = process.env.NEXI_API_KEY!

function nexiHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token ?? NEXI_KEY}`,
  }
}

export interface NexiUser {
  nome:    string
  cargo:   string
  user_id: string
}

export interface NexiCliente {
  _id:                 string
  'Razão Social':      string
  CNPJ:                string
  UF:                  string
  'Consumo Estimado'?: number
  Status?:             string
}

export async function nexiGetClientesProspeccao(
  userId: string,
  nexiToken?: string
): Promise<NexiCliente[]> {
  try {
    const res = await fetch(`${NEXI_BASE}/wf/clientes_prospeccao`, {
      method:  'POST',
      headers: nexiHeaders(nexiToken),
      body:    JSON.stringify({ user_id: userId }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.response?.clientes ?? []
  } catch {
    return []
  }
}
