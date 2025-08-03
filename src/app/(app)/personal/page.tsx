
"use client";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PersonalPageComponent } from './components/page-component';
import { useSearchParams } from 'next/navigation';

function PersonalPage() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    return <PersonalPageComponent tab={tab || "rendimiento"} />;
}

export default function PersonalPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PersonalPage />
    </Suspense>
  );
}
