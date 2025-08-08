// src/app/api/services/route.ts

import { serviceService } from '@/lib/services';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const services = await serviceService.onServicesUpdatePromise();
    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
