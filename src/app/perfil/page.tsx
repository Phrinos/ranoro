
import { redirect } from 'next/navigation';

export default function PerfilRedirectPage() {
  // This file exists only to resolve a route conflict.
  // The actual profile page is at /src/app/(app)/perfil/page.tsx
  // We redirect to the login page as a safe fallback.
  redirect('/login');
}
