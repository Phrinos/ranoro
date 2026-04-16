"use client";

import { withSuspense } from "@/lib/withSuspense";
import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useServiciosSharedState } from "../components/useServiciosSharedState";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";

const CotizacionesTabContent = lazy(() => import("../components/tab-cotizaciones"));

function PageInner() {
  const {
    vehicles,
    personnel,
    currentUser,
    isLoading,
    isShareDialogOpen,
    recordForSharing,
    handleShowShareDialog,
    handleDeleteService,
    handleCloseModals,
  } = useServiciosSharedState();

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visualiza y envía las cotizaciones generadas antes de ser aprobadas.</p>
        </div>
        <CotizacionesTabContent
          vehicles={vehicles}
          personnel={personnel}
          onShowShareDialog={handleShowShareDialog}
          currentUser={currentUser}
          onDelete={handleDeleteService}
        />
      </div>

      <Suspense fallback={null}>
        {recordForSharing && (
          <TicketPreviewModal
            open={isShareDialogOpen}
            onOpenChange={handleCloseModals}
            service={recordForSharing}
            vehicle={vehicles.find((v) => v.id === recordForSharing.vehicleId)}
          />
        )}
      </Suspense>
    </Suspense>
  );
}

export default withSuspense(PageInner, null);
