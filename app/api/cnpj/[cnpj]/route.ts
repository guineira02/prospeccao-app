import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'

const CNPJA_PROXY = 'https://primary-production-84466.up.railway.app/webhook/cnpja-proxy'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cnpj } = await params
  const cnpjLimpo = cnpj.replace(/\D/g, '')

  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido — deve ter 14 dígitos' }, { status: 400 })
  }

  try {
    const res = await fetch(CNPJA_PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cnpj: cnpjLimpo }),
    })

    if (!res.ok) return NextResponse.json({ error: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })

    const raw  = await res.json()
    const data = Array.isArray(raw) ? raw[0] : raw

    if (!data?.company) return NextResponse.json({ error: 'Dados indisponíveis para este CNPJ' }, { status: 404 })

    return NextResponse.json({
      razao_social: data.company?.name ?? '',
      cnae:         String(data.mainActivity?.id ?? ''),
      atividade:    data.mainActivity?.text ?? '',
      situacao:     data.status?.text ?? '',
      municipio:    data.address?.city ?? '',
      uf:           data.address?.state ?? '',
      email:        data.emails?.[0]?.address ?? '',
      telefone:     data.phones?.[0]
                      ? `(${data.phones[0].area}) ${data.phones[0].number}`
                      : '',
      rep_legal:    data.company?.members?.[0]?.person?.name ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })
  }
}
