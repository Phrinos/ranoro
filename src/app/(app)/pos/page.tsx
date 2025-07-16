
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PosPageComponent } from './components/page-component';

export default function POSPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab as string | undefined;

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PosPageComponent tab={tab} />
    </Suspense>
  );
}
