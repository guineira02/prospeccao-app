import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const nexiToken  = req.cookies.get('nexi_token')?.value ?? null
  const nexiUserId = req.cookies.get('nexi_user_id')?.value ?? null

  let wfResult: unknown = null
  if (nexiToken) {
    try {
      const r = await fetch(`${process.env.NEXI_API_BASE}/wf/OAuth_Prospeccao`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${nexiToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      wfResult = { status: r.status, body: await r.json() }
    } catch (e) {
      wfResult = { error: String(e) }
    }
  }

  // Test: GET /obj/user with the user's OWN token (not admin key)
  let userListWithUserToken: unknown = null
  if (nexiToken) {
    try {
      const r = await fetch(`${process.env.NEXI_API_BASE}/obj/user`, {
        headers: { Authorization: `Bearer ${nexiToken}` },
      })
      const data = await r.json()
      userListWithUserToken = { status: r.status, count: data.response?.count, results: data.response?.results?.map((u: Record<string,unknown>) => ({ _id: u._id, Nome: u['Nome'], email: u['email'] })) }
    } catch (e) {
      userListWithUserToken = { error: String(e) }
    }
  }

  let userLookup: unknown = null
  if (nexiUserId) {
    try {
      const r = await fetch(`${process.env.NEXI_API_BASE}/obj/user/${nexiUserId}`, {
        headers: { Authorization: `Bearer ${process.env.NEXI_API_KEY}` },
      })
      userLookup = { status: r.status, body: await r.json() }
    } catch (e) {
      userLookup = { error: String(e) }
    }
  }

  return NextResponse.json({ nexiToken: nexiToken ? nexiToken.slice(0, 12) + '...' : null, nexiUserId, wfResult, userListWithUserToken, userLookup })
}
