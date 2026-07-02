import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import { nexiClientes, nexiEstudoViabilidade } from '@/lib/nexi'

// Retorna os arquivos do Estudo de Viabilidade (Tarefa_Missao) de um cliente.
// Vínculo via Ramificada — ver nexiEstudoViabilidade.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clienteId } = await params

  const nexiId = user.user_metadata?.nexi_id as string | undefined
  if (!nexiId) return NextResponse.json({ error: 'Nexi ID não encontrado' }, { status: 400 })
  const clientes = await nexiClientes(nexiId)
  if (!clientes.some(c => c.id === clienteId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const arquivos = await nexiEstudoViabilidade(clienteId)

  return NextResponse.json({ arquivos })
}
