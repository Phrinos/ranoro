// Helpers de cliente para llamar endpoints/Server Actions autenticados.
// Adjuntan el Firebase ID token del usuario en sesión.
import { auth } from '@/lib/firebaseClient';

/** Devuelve el ID token del usuario actual o lanza si no hay sesión. */
export async function getIdTokenOrThrow(): Promise<string> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  return user.getIdToken();
}

/** fetch() que adjunta `Authorization: Bearer <idToken>` si hay sesión. */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const user = auth?.currentUser;
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(input, { ...init, headers });
}
