import { NextRequest, NextResponse } from 'next/server'

// /api/notificacoes/run é chamada pelo n8n sem cookie — autentica sozinha via CRON_SECRET.
// Nenhuma outra rota de notificações deve pular o gate de sessão daqui.
const PUBLIC_PATHS = ['/', '/api/auth/login', '/api/notificacoes/run']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname === p) || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')

  if (isPublic) return NextResponse.next()

  const token = req.cookies.get('sb-access-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
