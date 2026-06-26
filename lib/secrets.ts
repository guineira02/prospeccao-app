import { getSupabaseAdmin } from './supabase-admin'

// Lê segredos do Supabase (tabela app_secrets, só service_role acessa via RLS).
// Cache em memória (60s) pra não bater no banco toda request.
// Fallback pro process.env se a tabela não tiver a key (ex: dev local).
let cache: Record<string, string> | null = null
let loadedAt = 0
const TTL = 60_000

async function carregar(): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin.from('app_secrets').select('key, value')
    const m: Record<string, string> = {}
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      if (row.value != null) m[row.key] = row.value
    }
    cache = m
    loadedAt = Date.now()
  } catch {
    // mantém cache antigo / cai no env
  }
}

export async function getSecret(key: string): Promise<string> {
  if (!cache || Date.now() - loadedAt > TTL) await carregar()
  return cache?.[key] || process.env[key] || ''
}

// Invalida o cache (após rotacionar um segredo, por ex).
export function limparCacheSecrets(): void {
  cache = null
  loadedAt = 0
}
