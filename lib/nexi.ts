import { getSecret } from './secrets'

// Config da Nexi vem do Supabase (app_secrets), com fallback pro env.
async function nexiCfg() {
  return {
    base: await getSecret('NEXI_API_BASE'),
    key:  await getSecret('NEXI_API_KEY'),
  }
}

function nexiHeaders(key: string) {
  return {
    'Content-Type':  'application/json',
    Authorization:   `Bearer ${key}`,
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
    const { base, key } = await nexiCfg()
    const res = await fetch(`${base}/wf/login_mobile`, {
      method:  'POST',
      headers: nexiHeaders(key),
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

    const { base, key } = await nexiCfg()
    const res = await fetch(`${base}/wf/atualizar_cliente_prospeccao`, {
      method:  'POST',
      headers: nexiHeaders(key),
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
    const { base, key } = await nexiCfg()
    const res = await fetch(`${base}/wf/clientes_mobile`, {
      method:  'POST',
      headers: nexiHeaders(key),
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

// ── OAuth2 (login via página da Nexi) ─────────────────────────
// Config do OAuth: vem do cofre (app_secrets), com fallback pro env.
// BUBBLE_CLIENT_ID / BUBBLE_CLIENT_SECRET são gerados no Bubble (ação manual).
async function oauthCfg() {
  return {
    base:         await getSecret('NEXI_API_BASE'),
    clientId:     await getSecret('BUBBLE_CLIENT_ID'),
    clientSecret: await getSecret('BUBBLE_CLIENT_SECRET'),
    appUrl:       await getSecret('APP_URL'),
  }
}

// Monta a URL de autorização (pra onde o /api/auth/login redireciona).
// Retorna null se o client ainda não foi configurado.
export async function nexiOAuthAuthorizeUrl(state: string): Promise<string | null> {
  const { base, clientId, appUrl } = await oauthCfg()
  if (!base || !clientId || !appUrl) return null
  const url = new URL(`${base}/oauth/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${appUrl}/api/auth/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  return url.toString()
}

// Troca o authorization code por access_token + user_id (o _id do Bubble).
export async function nexiOAuthToken(
  code: string
): Promise<{ accessToken: string; userId: string } | null> {
  try {
    const { base, clientId, clientSecret, appUrl } = await oauthCfg()
    const res = await fetch(`${base}/oauth/access_token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${appUrl}/api/auth/callback`,
      }).toString(),
      cache:   'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const accessToken = String(data?.access_token ?? data?.token ?? '')
    const userId      = String(data?.uid ?? data?.user_id ?? data?.userId ?? '')
    if (!accessToken || !userId) return null
    return { accessToken, userId }
  } catch {
    return null
  }
}

// ── Data API: dados do agente pelo _id (usa a API key estática) ──
// No fluxo OAuth o token só devolve o uid; email/nome vêm daqui.
export interface NexiUser {
  user_id: string
  email:   string
  nome:    string
  cargo:   string
}

// Resolve a referência de Cargo (id do Bubble) → texto, via Data Type Cargos.
// Cache em memória: o mesmo id se repete entre logins.
const cargoCache = new Map<string, string>()
async function resolverCargo(id: string): Promise<string> {
  if (cargoCache.has(id)) return cargoCache.get(id)!
  try {
    const { base, key } = await nexiCfg()
    const res = await fetch(`${base}/obj/cargos/${id}`, {
      method:  'GET',
      headers: nexiHeaders(key),
      cache:   'no-store',
    })
    if (!res.ok) return ''
    const data = await res.json()
    const nome = String((data?.response as Record<string, unknown>)?.Nome ?? '').trim()
    if (nome) cargoCache.set(id, nome)
    return nome
  } catch {
    return ''
  }
}

export async function nexiUserById(userId: string): Promise<NexiUser | null> {
  try {
    const { base, key } = await nexiCfg()
    const res = await fetch(`${base}/obj/user/${userId}`, {
      method:  'GET',
      headers: nexiHeaders(key),
      cache:   'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const u = (data?.response ?? {}) as Record<string, unknown>
    if (!u._id) return null

    // email mora em authentication.email.email
    const auth = u.authentication as { email?: { email?: string } } | undefined
    const email = String(auth?.email?.email ?? u.email ?? '').trim().toLowerCase()
    if (!email) return null

    const nome =
      [u.Nome, u.Sobrenome].filter(Boolean).map(String).join(' ').trim() ||
      String(u['Nome completo'] ?? '').trim()
    // Cargo na Data API vem como referência (id do Bubble, ex "123x456").
    // Resolve no Data Type Cargos pra trazer o texto ("Marketing").
    const cargoRaw = String(u.Cargo ?? '').trim()
    const cargo = /^\d+x\d+$/.test(cargoRaw) ? await resolverCargo(cargoRaw) : cargoRaw

    return { user_id: String(u._id), email, nome, cargo }
  } catch {
    return null
  }
}
