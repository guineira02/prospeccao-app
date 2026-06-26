import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    const body = await req.json()
    email = body.email
    password = body.password
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  let bubbleRes: Response
  try {
    bubbleRes = await fetch(`${process.env.BUBBLE_OAUTH_BASE}/wf/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, stay: 'yes' }),
    })
  } catch (e) {
    console.error('Bubble wf/oauth network error:', e)
    return NextResponse.json({ error: 'network_error' }, { status: 502 })
  }

  if (!bubbleRes.ok) {
    const body = await bubbleRes.text()
    console.error('Bubble wf/oauth failed:', bubbleRes.status, body)
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  let data: Record<string, unknown>
  try {
    data = await bubbleRes.json()
  } catch {
    console.error('Bubble wf/oauth non-JSON 200 response')
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  // Bubble may return HTTP 200 with { status: "error" } for bad credentials
  if ((data as { status?: string }).status === 'error') {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const resp = data.response as Record<string, unknown> | null
  const access_token =
    resp?.access_token as string ??
    resp?.token as string ??
    data.access_token as string ??
    data.token as string

  const bubble_user_id =
    resp?.user_id as string ??
    data.user_id as string ??
    null

  if (!access_token) {
    console.error('No access_token in Bubble response:', data)
    return NextResponse.json({ error: 'no_token' }, { status: 500 })
  }

  if (!bubble_user_id) {
    console.error('No user_id in Bubble response:', data)
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('nexi_token', access_token, cookieOpts)
  if (bubble_user_id) {
    res.cookies.set('nexi_user_id', bubble_user_id, cookieOpts)
  }
  return res
}
