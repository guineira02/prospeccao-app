import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { nexiLogin } from '@/lib/nexi'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()
  if (!email || !senha) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
  }

  // 1. Valida credenciais na Nexi (login_mobile)
  const nexi = await nexiLogin(email, senha)
  if (!nexi) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  // 2. Abre/cria a sessão correspondente no Supabase.
  //    Senha do Supabase = hash estável do user_id Nexi (o agente nunca a digita;
  //    a verdade da autenticação é a Nexi, o Supabase só guarda a sessão + RLS).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const admin = getSupabaseAdmin()

  const emailNorm = String(email).trim().toLowerCase()
  const supaPass  = `nexi:${nexi.user_id}`
  const metadata  = { nome: nexi.nome, cargo: nexi.cargo, nexi_id: nexi.user_id }

  // Procura o shadow user existente por e-mail.
  const { data: list } = await admin.auth.admin.listUsers()
  const existente = list?.users?.find(u => u.email?.toLowerCase() === emailNorm)

  if (existente) {
    // reseta a senha shadow + atualiza metadata (a verdade é a Nexi)
    await admin.auth.admin.updateUserById(existente.id, { password: supaPass, user_metadata: metadata })
  } else {
    await admin.auth.admin.createUser({ email: emailNorm, password: supaPass, email_confirm: true, user_metadata: metadata })
  }

  const { data: signIn } = await supabase.auth.signInWithPassword({ email: emailNorm, password: supaPass })
  const session = signIn?.session
  if (!session) {
    return NextResponse.json({ error: 'Falha ao abrir sessão' }, { status: 500 })
  }

  const res = NextResponse.json({
    ok: true,
    agente: { nome: nexi.nome, cargo: nexi.cargo },
  })

  res.cookies.set('sb-access-token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  res.cookies.set('sb-refresh-token', session.refresh_token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return res
}
