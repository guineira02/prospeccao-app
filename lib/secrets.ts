import { getSupabaseAdmin } from './supabase-admin'

const cache: Record<string, string> = {}

export async function getSecret(key: string): Promise<string> {
  if (cache[key]) return cache[key]
  const { data, error } = await getSupabaseAdmin()
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .single()
  if (error || !data) throw new Error(`Secret "${key}" not found in app_secrets`)
  cache[key] = data.value
  return data.value
}
