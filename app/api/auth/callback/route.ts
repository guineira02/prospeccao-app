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
  const access_token = tokenData.access_token ?? tokenData.token ?? tokenData.access_Token

  if (!access_token) {
    console.error('No access_token in response:', tokenData)
    return NextResponse.redirect(new URL('/?error=no_token', req.url))
  }

  // Resolve Current User via Bubble workflow (OAuth token → user_id)
  let bubble_user_id: string | null = null
  try {
    const meRes = await fetch(`${process.env.NEXI_API_BASE}/wf/OAuth_Prospeccao`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    if (meRes.ok) {
      const meData = await meRes.json()
      bubble_user_id = meData.response?.user_id ?? null
      console.log('OAuth_Prospeccao resolved user_id:', bubble_user_id)
    } else {
      console.error('OAuth_Prospeccao failed:', meRes.status, await meRes.text())
    }
  } catch (e) {
    console.error('OAuth_Prospeccao error:', e)
  }

  const res = new NextResponse(
    `<html><head><meta http-equiv="refresh" content="0;url=/dashboard"></head><body>Autenticado, redirecionando...</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
  )
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   60 * 60 * 24 * 7,
  }
  res.cookies.set('nexi_token', access_token, cookieOpts)
  if (bubble_user_id) {
    res.cookies.set('nexi_user_id', bubble_user_id, cookieOpts)
  }
  return res
}
