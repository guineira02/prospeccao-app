import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { analisarComIA } from '@/lib/analise-ia'
import { Cliente, Atividade } from '@/app/dashboard/context'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const token = (await cookies()).get('nexi_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params
  const body: { cliente: Cliente } = await req.json()
  const { cliente } = body

  if (!cliente || cliente._id !== clienteId) {
    return NextResponse.json({ error: 'Invalid cliente' }, { status: 400 })
  }

  const { data: atividades, error } = await getSupabaseAdmin()
    .from('pt_atividades')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    const result = await analisarComIA(cliente, (atividades ?? []) as Atividade[])
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LLM error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
