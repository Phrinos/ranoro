// src/app/(app)/servicios/cotizaciones/page.tsx
"use client";

import React from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { QuotesList } from "../components/lists/quotes-list";
import { useServicesData } from "../components/hooks/use-services-data";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";

function PageInner() {
  const {
    vehicles,
    personnel,
    currentUser,
    shareDialog,
    openShareDialog,
    closeAllDialogs,
    deleteService,
  } = useServicesData();

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestiona las cotizaciones pendientes de aprobación.
            </p>
          </div>
          <Link href="/servicios/nuevo">
            <Button className="shrink-0 group">
              <PlusCircle className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Nueva Cotización
            </Button>
          </Link>
        </div>

        <QuotesList
          vehicles={vehicles}
          personnel={personnel}
          currentUser={currentUser}
          onView={openShareDialog}
          onDelete={deleteService}
        />
      </div>

      {shareDialog.data && (
        <TicketPreviewModal
          open={shareDialog.open}
          onOpenChange={closeAllDialogs}
          service={shareDialog.data}
          vehicle={vehicles.find((v) => v.id === shareDialog.data?.vehicleId)}
        />
      )}
    </>
  );
}

export default withSuspense(PageInner, null);
