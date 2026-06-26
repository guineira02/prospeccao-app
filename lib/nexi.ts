const NEXI_BASE = process.env.NEXI_API_BASE!
const NEXI_KEY  = process.env.NEXI_API_KEY!

const _userCache = new Map<string, { user: ({ _id: string; [k: string]: unknown }) | null; exp: number }>()

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

export async function nexiGetCurrentUser(nexiToken: string): Promise<{ _id: string; [k: string]: unknown } | null> {
  const hit = _userCache.get(nexiToken)
  if (hit && hit.exp > Date.now()) return hit.user
  try {
    const res = await fetch(`${NEXI_BASE}/obj/user`, {
      headers: { Authorization: `Bearer ${nexiToken}` },
    })
    if (!res.ok) { _userCache.set(nexiToken, { user: null, exp: Date.now() + 10_000 }); return null }
    const data = await res.json()
    const user = data.response?.results?.[0] ?? data.response ?? null
    _userCache.set(nexiToken, { user, exp: Date.now() + 60_000 })
    return user
  } catch {
    return null
  }
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
const list = Array.isArray(data.response) ? data.response : (data.response?.clientes ?? [])
    return list.map((c: Record<string, unknown>) => ({
      ...c,
      'Razão Social': c['Razão Social'] ?? c['Nome'] ?? '',
    }))
  } catch {
    return []
  }
}
