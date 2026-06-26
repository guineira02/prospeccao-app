import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('pt_preferencias')
    .select('notif_email, notif_whatsapp, email_contato, whatsapp_contato')
    .eq('agente_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    prefs: data ?? {
      notif_email: true,
      notif_whatsapp: false,
      email_contato: user.email ?? '',
      whatsapp_contato: '',
    },
    email_login: user.email ?? '',
  })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notif_email, notif_whatsapp, email_contato, whatsapp_contato } = await req.json()

  const { data, error } = await supabase
    .from('pt_preferencias')
    .upsert({
      agente_id:        user.id,
      notif_email:      !!notif_email,
      notif_whatsapp:   !!notif_whatsapp,
      email_contato:    email_contato || null,
      whatsapp_contato: whatsapp_contato || null,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'agente_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prefs: data })
}
