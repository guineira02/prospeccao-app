import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const nexiToken = req.cookies.get('nexi_token')?.value
  if (!nexiToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('pt_atividades')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ atividades: data })
}
