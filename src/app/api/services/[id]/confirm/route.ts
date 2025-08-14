
// This file is no longer used and can be deleted.
// The logic has been moved to a server action in /src/app/(public)/s/actions.ts
// to ensure it runs with the correct administrative privileges.
// Keeping it here temporarily to avoid breaking builds until fully deprecated.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'This endpoint is deprecated. Please use the new server action.' },
    { status: 410 } // 410 Gone
  );
}
