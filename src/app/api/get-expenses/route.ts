
import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// Temporary route to fetch fixed expenses.
// This file will be deleted after use.
export async function GET() {
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized.' }, { status: 500 });
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'fixedMonthlyExpenses'));
    const expenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(expenses, { status: 200 });
  } catch (error) {
    console.error('Error fetching fixed expenses:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch fixed expenses', details: errorMessage }, { status: 500 });
  }
}
