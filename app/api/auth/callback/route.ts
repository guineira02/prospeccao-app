import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSecret } from '@/lib/secrets'
import { nexiOAuthToken, nexiUserById } from '@/lib/nexi'

// Senha shadow derivada por HMAC — nunca previsível a partir do user_id da Nexi
// (que não é secreto: aparece em respostas de API e no user_metadata).
async function derivarSenhaShadow(userId: string): Promise<string> {
  const secret = await getSecret('SHADOW_PASSWORD_SECRET')
  if (!secret) throw new Error('SHADOW_PASSWORD_SECRET não configurado')
  return createHmac('sha256', secret).update(userId).digest('hex')
}

// Retorno do OAuth da Nexi. Valida state, troca code por user_id,
// busca email/nome e abre a sessão Supabase (shadow user) — mesma
// lógica do login antigo, só muda a origem da identidade.
export async function GET(req: NextRequest) {
  const appUrl = await getSecret('APP_URL')
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  const jar = await cookies()
  const savedState = jar.get('oauth_state')?.value

  const fail = (erro: string) => {
    const r = NextResponse.redirect(`${appUrl}/?erro=${erro}`)
    r.cookies.set('oauth_state', '', { maxAge: 0, path: '/' })
    return r
  }

  if (!code || !state || state !== savedState) return fail('oauth_invalido')

  // 1. code → access_token + user_id (o _id do Bubble)
  const tok = await nexiOAuthToken(code)
  if (!tok) return fail('token_invalido')

  // 2. user_id → email + nome (Data API, API key estática)
  const user = await nexiUserById(tok.userId)
  if (!user) return fail('agente_nao_encontrado')

  // 3. shadow user no Supabase (senha = hash estável do user_id Nexi)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const admin = getSupabaseAdmin()

  const emailNorm = user.email
  const supaPass  = await derivarSenhaShadow(user.user_id)
  const metadata  = { nome: user.nome, cargo: user.cargo, nexi_id: user.user_id }

  // perPage alto — listUsers pagina em 50 por padrão; com o default, agente
  // fora da primeira página nunca é encontrado e vira createUser duplicado.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existente = list?.users?.find(u => u.email?.toLowerCase() === emailNorm)

  if (existente) {
    await admin.auth.admin.updateUserById(existente.id, { password: supaPass, user_metadata: metadata })
  } else {
    await admin.auth.admin.createUser({ email: emailNorm, password: supaPass, email_confirm: true, user_metadata: metadata })
  }

  const { data: signIn } = await supabase.auth.signInWithPassword({ email: emailNorm, password: supaPass })
  const session = signIn?.session
  if (!session) return fail('sessao_falhou')

  // 4. seta cookies de sessão e limpa o state, redireciona pro app
  const res = NextResponse.redirect(`${appUrl}/dashboard`)
  res.cookies.set('oauth_state', '', { maxAge: 0, path: '/' })
  res.cookies.set('sb-access-token', session.access_token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8,
    path:     '/',
  })
  res.cookies.set('sb-refresh-token', session.refresh_token!, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  })

  return res
}
