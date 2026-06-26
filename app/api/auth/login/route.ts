import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()
  if (!email || !senha) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const admin = getSupabaseAdmin()

  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })

  let session = signIn?.session

  if (signInError) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome: email.split('@')[0],
        cargo: 'Agente Comercial',
        nexi_id: email,
      },
    })
    if (createError) {
      return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
    }
    const { data: retry } = await supabase.auth.signInWithPassword({ email, password: senha })
    session = retry?.session
  }

  if (!session) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })

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
