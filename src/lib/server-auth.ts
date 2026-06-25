import 'server-only';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

// Roles del sistema (deben coincidir con firestore.rules y permissions.ts)
const STAFF_ROLES = new Set(['Superadministrador', 'Asesor']);

export type MinRole = 'any' | 'staff' | 'superadmin';

export type AuthedActor = {
  uid: string;
  role: string;
  /** true cuando la autorización fue por x-api-key de servicio interno (no un usuario) */
  isService: boolean;
};

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/** Comparación en tiempo constante para secretos compartidos. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function verifyActor(idToken: string, minRole: MinRole): Promise<AuthedActor> {
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    throw new AuthError(401, 'Token inválido o expirado');
  }

  const snap = await getAdminDb().collection('users').doc(decoded.uid).get();
  if (!snap.exists) throw new AuthError(403, 'Usuario no registrado');
  const data = (snap.data() || {}) as { role?: string; isArchived?: boolean };
  if (data.isArchived) throw new AuthError(403, 'Usuario archivado');
  const role = data.role || '';

  if (minRole === 'superadmin' && role !== 'Superadministrador') {
    throw new AuthError(403, 'Requiere rol Superadministrador');
  }
  if (minRole === 'staff' && !STAFF_ROLES.has(role)) {
    throw new AuthError(403, 'Requiere rol de operación');
  }

  return { uid: decoded.uid, role, isService: false };
}

type RequireOpts = {
  minRole?: MinRole;
  /** Si se provee y coincide con el header x-api-key, autoriza como servicio interno. */
  apiKey?: string | null;
};

/**
 * Autoriza un route handler. Acepta:
 *  1) x-api-key === opts.apiKey (servicio interno server-to-server), o
 *  2) Authorization: Bearer <Firebase ID token> de un usuario con rol suficiente.
 * Lanza AuthError (con .status) si no cumple.
 */
export async function requireAuth(request: Request, opts: RequireOpts = {}): Promise<AuthedActor> {
  const minRole = opts.minRole ?? 'staff';

  if (opts.apiKey) {
    const provided = request.headers.get('x-api-key');
    if (provided && timingSafeEqualStr(provided, opts.apiKey)) {
      return { uid: 'service', role: 'service', isService: true };
    }
  }

  const authz = request.headers.get('authorization') || '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token) throw new AuthError(401, 'No autenticado');

  return verifyActor(token, minRole);
}

/**
 * Versión para route handlers que no quieren manejar el throw: retorna el actor
 * o una NextResponse de error lista para devolver.
 *
 *   const guard = await authGuard(request, { minRole: 'staff' });
 *   if ('response' in guard) return guard.response;
 *   const { actor } = guard;
 */
export async function authGuard(
  request: Request,
  opts: RequireOpts = {},
): Promise<{ actor: AuthedActor } | { response: NextResponse }> {
  try {
    const actor = await requireAuth(request, opts);
    return { actor };
  } catch (e) {
    if (e instanceof AuthError) {
      return { response: NextResponse.json({ error: e.message }, { status: e.status }) };
    }
    console.error('[auth] Error inesperado en authGuard:', e);
    return { response: NextResponse.json({ error: 'Error de autorización' }, { status: 500 }) };
  }
}

/**
 * Autoriza una Server Action. Como las Server Actions no exponen el Request,
 * el cliente debe pasar su Firebase ID token como argumento.
 * Lanza AuthError si no cumple.
 */
export async function requireActionAuth(
  idToken: string | undefined | null,
  opts: { minRole?: MinRole } = {},
): Promise<AuthedActor> {
  if (!idToken) throw new AuthError(401, 'No autenticado');
  return verifyActor(idToken, opts.minRole ?? 'staff');
}
