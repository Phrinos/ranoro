

import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const AdministracionPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.AdministracionPageComponent }))
);


export default function AdministracionPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AdministracionPageComponent searchParams={searchParams} />
        </Suspense>
    );
}
