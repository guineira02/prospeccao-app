import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { getSecret } from '@/lib/secrets'
import { nexiOAuthAuthorizeUrl } from '@/lib/nexi'

// Início do login OAuth: gera state anti-CSRF e manda o usuário
// pra página de Login da Nexi (Bubble). A senha é digitada LÁ, não aqui.
export async function GET() {
  const appUrl = await getSecret('APP_URL')

  const state = randomBytes(16).toString('hex')
  const authorizeUrl = await nexiOAuthAuthorizeUrl(state)

  // Client OAuth ainda não configurado no Bubble → erro claro.
  if (!authorizeUrl) {
    return NextResponse.redirect(`${appUrl || ''}/?erro=oauth_config`)
  }

  const jar = await cookies()
  jar.set('oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })

  return NextResponse.redirect(authorizeUrl)
}
