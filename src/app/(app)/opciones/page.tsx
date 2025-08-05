

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const OpcionesPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.OpcionesPageComponent }))
);


export default function OpcionesPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab as string | undefined;

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <OpcionesPageComponent tab={tab} />
    </Suspense>
  );
}
