

import { Suspense } from "react";
import { AdministracionPageComponent } from "./components/page-component";
import { Loader2 } from "lucide-react";

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
