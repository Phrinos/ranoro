

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const FacturacionAdminPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.FacturacionAdminPageComponent }))
);


export default function FacturacionAdminPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <FacturacionAdminPageComponent />
    </Suspense>
  );
}
