

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { FinanzasPageComponent } from './components/page-component';

export default function FinanzasPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
    return (
        <Suspense fallback={<div className="flex h-64 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FinanzasPageComponent searchParams={searchParams} />
        </Suspense>
    );
}
