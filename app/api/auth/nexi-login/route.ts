import { NextResponse } from 'next/server'

export async function GET() {
  const clientId    = process.env.BUBBLE_CLIENT_ID!
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/auth/callback`

  const url = new URL(`${process.env.BUBBLE_OAUTH_BASE}/oauth/authorize`)
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
