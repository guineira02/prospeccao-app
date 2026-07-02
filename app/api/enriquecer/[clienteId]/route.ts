import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nexiAtualizarCliente, nexiClienteRaw, nexiClientes, type EnriquecimentoNexi } from '@/lib/nexi'

const CNPJA_PROXY = 'https://primary-production-84466.up.railway.app/webhook/cnpja-proxy'

// Enriquece via Receita Federal E grava de volta na Nexi (atualizar_cliente_prospeccao).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: udata, error } = await admin.auth.getUser(token)
  if (error || !udata.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const nexiId = udata.user.user_metadata?.nexi_id as string | undefined
  if (!nexiId) return NextResponse.json({ error: 'Nexi ID não encontrado' }, { status: 400 })

  const { clienteId } = await params

  const clientesDoAgente = await nexiClientes(nexiId)
  if (!clientesDoAgente.some(c => c.id === clienteId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { cnpj } = await req.json()
  const cnpjLimpo = String(cnpj ?? '').replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido — deve ter 14 dígitos' }, { status: 400 })
  }

  // 1. Receita Federal via proxy
  let dados: EnriquecimentoNexi
  try {
    const res = await fetch(CNPJA_PROXY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: cnpjLimpo }),
    })
    if (!res.ok) return NextResponse.json({ error: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
    const raw = await res.json()
    const data = Array.isArray(raw) ? raw[0] : raw
    if (!data?.company) return NextResponse.json({ error: 'Dados indisponíveis para este CNPJ' }, { status: 404 })

    dados = {
      razao_social: data.company?.name ?? '',
      cnae:         String(data.mainActivity?.id ?? ''),
      atividade:    data.mainActivity?.text ?? '',
      situacao:     data.status?.text ?? '',
      municipio:    data.address?.city ?? '',
      uf:           data.address?.state ?? '',
      email:        data.emails?.[0]?.address ?? '',
      telefone:     data.phones?.[0] ? `(${data.phones[0].area}) ${data.phones[0].number}` : '',
      rep_legal:    data.company?.members?.[0]?.person?.name ?? '',
    }
  } catch {
    return NextResponse.json({ error: 'Serviço de CNPJ indisponível' }, { status: 503 })
  }

  // 2. preserva o que já existe — Receita às vezes vem vazia (telefone/email).
  //    Lê o cliente atual e preenche os vazios pra não apagar dado existente na Nexi.
  const raw = await nexiClienteRaw(nexiId, clienteId)
  if (raw) {
    const existFone  = String(raw['Contact phone'] ?? raw['celular contato_principal'] ?? '').trim()
    const existEmail = String(raw['Contact email'] ?? '').trim()
    if (!dados.telefone && existFone)  dados.telefone = existFone
    if (!dados.email    && existEmail) dados.email    = existEmail
  }

  // 3. grava de volta na Nexi
  const salvoNexi = await nexiAtualizarCliente(nexiId, clienteId, dados)

  return NextResponse.json({ ...dados, salvoNexi })
}
