const NEXI_BASE = process.env.NEXI_API_BASE!   // https://nexiplay.com/api/1.1
const NEXI_KEY  = process.env.NEXI_API_KEY!

function nexiHeaders() {
  return {
    'Content-Type':  'application/json',
    Authorization:   `Bearer ${NEXI_KEY}`,
  }
}

// ── login_mobile ──────────────────────────────────────────────
export interface NexiLoginResult {
  nome:    string
  cargo:   string
  user_id: string
  token:   string
  expires: number
}

export async function nexiLogin(
  email: string,
  senha: string
): Promise<NexiLoginResult | null> {
  try {
    const res = await fetch(`${NEXI_BASE}/wf/login_mobile`, {
      method:  'POST',
      headers: nexiHeaders(),
      body:    JSON.stringify({ email, senha }),
      cache:   'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const r = data?.response
    if (data?.status !== 'success' || !r?.user_id) return null
    return {
      nome:    r.nome    ?? '',
      cargo:   r.cargo   ?? '',
      user_id: r.user_id,
      token:   r.token   ?? '',
      expires: r.expires ?? 0,
    }
  } catch {
    return null
  }
}

// ── clientes_mobile ───────────────────────────────────────────
// Bubble retorna campos esparsos — nem todo cliente tem todo campo.
export interface NexiClienteRaw {
  _id:                 string
  Nome?:               string
  CNPJ?:               string
  'Company\'s adress'?: string
  API_UF?:             string
  'Contact email'?:    string
  'Contact phone'?:    string
  'Contact name'?:     string
  'Valor Fatura'?:     number
  Economia?:           number
  Motivo?:             string
  Tipo_modelo?:        string
  'Tipo de Cliente'?:  string
  'Tipo de Lead'?:     string
  'Created Date'?:     number
  'Modified Date'?:    number
  [key: string]: unknown
}

// Forma normalizada que o app usa.
export interface Cliente {
  id:           string
  nome:         string
  cnpj:         string
  uf:           string
  contatoNome:  string
  contatoEmail: string
  contatoFone:  string
  valorFatura:  number | null
  economia:     number | null
  tipoModelo:   string
  tipoLead:     string
  motivo:       string
  criadoEm:     number | null
}

function normalizeUF(c: NexiClienteRaw): string {
  const raw = c.API_UF || c['Company\'s adress'] || ''
  return String(raw).trim().toUpperCase().slice(0, 2)
}

export function normalizeCliente(c: NexiClienteRaw): Cliente {
  return {
    id:           c._id,
    nome:         (c.Nome || 'Sem nome').trim(),
    cnpj:         (c.CNPJ || '').trim(),
    uf:           normalizeUF(c),
    contatoNome:  (c['Contact name']  || '').trim(),
    contatoEmail: (c['Contact email'] || '').trim(),
    contatoFone:  (c['Contact phone'] || '').trim(),
    valorFatura:  typeof c['Valor Fatura'] === 'number' ? c['Valor Fatura'] : null,
    economia:     typeof c.Economia === 'number' ? c.Economia : null,
    tipoModelo:   (c.Tipo_modelo || '').trim(),
    tipoLead:     (c['Tipo de Lead'] || '').trim(),
    motivo:       (c.Motivo || '').trim(),
    criadoEm:     typeof c['Created Date'] === 'number' ? c['Created Date'] : null,
  }
}

// ── atualizar_cliente_prospeccao ──────────────────────────────
// Grava os dados enriquecidos (Receita Federal) de volta na Nexi.
// Match no Bubble: Cliente = cliente_id (uniqueid) + responsavel = user_id.
export interface EnriquecimentoNexi {
  razao_social?: string
  cnae?:         string
  atividade?:    string
  situacao?:     string
  municipio?:    string
  uf?:           string
  email?:        string
  telefone?:     string
  rep_legal?:    string
}

export async function nexiAtualizarCliente(
  userId: string,
  clienteId: string,
  dados: EnriquecimentoNexi
): Promise<boolean> {
  try {
    // Envia só campos com valor — nunca sobrescreve dado existente com vazio.
    const body: Record<string, string> = { user_id: userId, cliente_id: clienteId }
    const campos: (keyof EnriquecimentoNexi)[] = [
      'razao_social', 'cnae', 'atividade', 'situacao', 'municipio', 'uf', 'email', 'telefone', 'rep_legal',
    ]
    for (const k of campos) {
      const v = (dados[k] ?? '').trim()
      if (v) body[k] = v
    }

    const res = await fetch(`${NEXI_BASE}/wf/atualizar_cliente_prospeccao`, {
      method:  'POST',
      headers: nexiHeaders(),
      body:    JSON.stringify(body),
      cache:   'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

async function fetchClientesRaw(userId: string): Promise<NexiClienteRaw[]> {
  try {
    const res = await fetch(`${NEXI_BASE}/wf/clientes_mobile`, {
      method:  'POST',
      headers: nexiHeaders(),
      body:    JSON.stringify({ user_id: userId }),
      cache:   'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data?.response?.clientes ?? []
  } catch {
    return []
  }
}

export async function nexiClientes(userId: string): Promise<Cliente[]> {
  const lista = await fetchClientesRaw(userId)
  return lista.map(normalizeCliente)
}

// Retorna o objeto cru de UM cliente (pra preservar campos no enriquecimento).
export async function nexiClienteRaw(userId: string, clienteId: string): Promise<NexiClienteRaw | null> {
  const lista = await fetchClientesRaw(userId)
  return lista.find(c => c._id === clienteId) ?? null
}
