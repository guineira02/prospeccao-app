import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/auth/callback`

  const tokenRes = await fetch(`${process.env.BUBBLE_OAUTH_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     process.env.BUBBLE_CLIENT_ID!,
      client_secret: process.env.BUBBLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      code,
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('Bubble token exchange failed:', tokenRes.status, body)
    return NextResponse.redirect(new URL('/?error=token_exchange', req.url))
  }

  const tokenData = await tokenRes.json()
  console.log('Bubble token response:', JSON.stringify(tokenData))
  const access_token = tokenData.access_token ?? tokenData.token ?? tokenData.access_Token

  if (!access_token) {
    console.error('No access_token in response:', tokenData)
    return NextResponse.redirect(new URL('/?error=no_token', req.url))
  }

  const res = new NextResponse(
    `<html><head><meta http-equiv="refresh" content="0;url=/dashboard"></head><body>Autenticado, redirecionando...</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
  res.cookies.set('nexi_token', access_token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 7,
  })
  return res
}
