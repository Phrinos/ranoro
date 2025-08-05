

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const InventarioPageComponent = lazy(() => 
  import('./components/page-component')
);


export default function InventarioPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <InventarioPageComponent searchParams={searchParams} />
    </Suspense>
  );
}
