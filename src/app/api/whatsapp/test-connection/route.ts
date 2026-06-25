import { NextResponse } from 'next/server';
import { authGuard } from '@/lib/server-auth';

// Bloquea destinos internos para evitar SSRF (metadata, loopback, redes privadas).
function isBlockedHost(host: string): boolean {
  const hostname = host.split(':')[0].trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1' || hostname.endsWith('.localhost')) return true;
  if (hostname === 'metadata' || hostname.endsWith('.internal') || hostname.includes('metadata.google')) return true;
  // IPv4 en rangos privados / loopback / link-local
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const guard = await authGuard(request, { minRole: 'staff' });
    if ('response' in guard) return guard.response;

    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');
    const apikey = request.headers.get('x-api-key') || '';

    if (!host) {
      return NextResponse.json({ error: 'Host is required' }, { status: 400 });
    }
    if (isBlockedHost(host)) {
      return NextResponse.json({ error: 'Host no permitido' }, { status: 400 });
    }

    // Ping the Baileys server
    const targetUrl = `http://${host}/api/sessions`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apikey
      },
      // 5 seconds timeout
      signal: AbortSignal.timeout(5000),
    });

    // If we get a 200 OK, or even a 401/404, the server is responding.
    // 200 is ideal, it means auth also works if we sent the right key.
    // We'll consider any valid HTTP response as "connected" since the goal is just
    // to check if the server is accessible.
    if (response.ok || response.status === 401) {
      return NextResponse.json({ success: true, status: response.status });
    }

    return NextResponse.json({ success: false, status: response.status }, { status: 502 });
  } catch (error: any) {
    console.error('Test connection error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
