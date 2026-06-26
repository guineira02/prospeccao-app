import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/api/auth/login']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname === p) || pathname.startsWith('/_next') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/notificacoes')

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
