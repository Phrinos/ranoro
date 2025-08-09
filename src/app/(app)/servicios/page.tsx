

"use client";
import { ServiciosPageComponent } from "./components/page-component";
import { useSearchParams } from 'next/navigation';
import { Suspense } from "react";

function ServiciosPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  return <ServiciosPageComponent tab={tab || undefined} />;
}

export default function ServiciosPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><p>Cargando...</p></div>}>
      <ServiciosPageContent />
    </Suspense>
  );
}
