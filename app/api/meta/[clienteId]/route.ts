import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type Params = { params: Promise<{ clienteId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const token = req.cookies.get('nexi_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params
  const { data } = await getSupabaseAdmin()
    .from('pt_clientes_meta')
    .select('contato_nome,contato_telefone,contato_email,concorrente,data_vencimento_contrato')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  return NextResponse.json({ meta: data ?? {} })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const token = req.cookies.get('nexi_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params
  const body = await req.json()
  const { contato_nome, contato_telefone, contato_email } = body

  const { data, error } = await getSupabaseAdmin()
    .from('pt_clientes_meta')
    .upsert({ cliente_id: clienteId, contato_nome, contato_telefone, contato_email }, { onConflict: 'cliente_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meta: data })
}
