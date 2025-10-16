
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin'; // Usamos una versión que no inicializa DB
import { auth as adminAuth } from 'firebase-admin';

// Inicializa la app de admin una sola vez
const app = getAdminApp();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Aplica el middleware solo a las rutas bajo /app
  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('AuthToken')?.value;

  if (!token) {
    // Si no hay token, redirigir al login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verificar el token con Firebase Admin SDK
    await adminAuth(app).verifyIdToken(token);
    // Si el token es válido, permite que la solicitud continúe
    return NextResponse.next();
  } catch (error) {
    // Si el token es inválido (expirado, etc.), redirigir al login
    console.warn('Invalid auth token, redirecting to login:', error);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    
    const response = NextResponse.redirect(url);
    // Elimina la cookie inválida para evitar bucles de redirección
    response.cookies.delete('AuthToken');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto las que probablemente sean
     * recursos estáticos.
     */
    '/app/:path((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
