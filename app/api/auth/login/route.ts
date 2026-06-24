import { NextRequest, NextResponse } from 'next/server'
import { nexiLogin } from '@/lib/nexi'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()

  if (!email || !senha) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
  }

  // 1. Valida contra a Nexi
  const nexiUser = await nexiLogin(email, senha)
  if (!nexiUser) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  // 2. Cria sessão no Supabase Auth
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const admin = getSupabaseAdmin()

  let session
  const { data: signIn, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password: senha })

  if (signInError) {
    // Usuário não existe no Supabase ainda — cria
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nexiUser.nome, cargo: nexiUser.cargo, nexi_id: nexiUser.user_id },
    })
    if (createError) {
      return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
    }
    const { data: retry } = await supabaseClient.auth.signInWithPassword({ email, password: senha })
    session = retry?.session
  } else {
    // Atualiza metadados da Nexi
    await admin.auth.admin.updateUserById(signIn.user.id, {
      user_metadata: { nome: nexiUser.nome, cargo: nexiUser.cargo, nexi_id: nexiUser.user_id },
    })
    session = signIn.session
  }

  if (!session) {
    return NextResponse.json({ error: 'Falha ao criar sessão' }, { status: 500 })
  }

  const res = NextResponse.json({
    ok: true,
    user: { nome: nexiUser.nome, cargo: nexiUser.cargo, nexi_id: nexiUser.user_id, email },
  })

  // Cookie httpOnly com o token de acesso
  res.cookies.set('sb-access-token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8h
    path: '/',
  })
  res.cookies.set('sb-refresh-token', session.refresh_token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })

  return res
}
