
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { HistorialServiciosPageComponent } from './components/page-component';

export default function HistorialServiciosPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const status = searchParams?.status as string | undefined;

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <HistorialServiciosPageComponent status={status} />
    </Suspense>
  );
}
