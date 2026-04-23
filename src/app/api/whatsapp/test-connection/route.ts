import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');
    const apikey = request.headers.get('x-api-key') || '';
    
    if (!host) {
      return NextResponse.json({ error: 'Host is required' }, { status: 400 });
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
