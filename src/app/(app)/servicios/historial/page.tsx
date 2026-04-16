"use client";

import { withSuspense } from "@/lib/withSuspense";
import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useServiciosSharedState } from "../components/useServiciosSharedState";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";

const HistorialTabContent = lazy(() => import("../components/tab-historial"));

function PageInner() {
  const {
    vehicles,
    personnel,
    currentUser,
    isLoading,
    isShareDialogOpen,
    recordForSharing,
    isTicketDialogOpen,
    serviceForTicket,
    handleShowShareDialog,
    handleShowTicketDialog,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Historial de Servicios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Base de datos de todos los servicios pasados finalizados.</p>
        </div>
        <HistorialTabContent
          vehicles={vehicles}
          personnel={personnel}
          onShowShareDialog={handleShowShareDialog}
          currentUser={currentUser}
          onDelete={handleDeleteService}
          onShowTicket={handleShowTicketDialog}
        />
      </div>

      <Suspense fallback={null}>
        {(recordForSharing || serviceForTicket) && (
          <TicketPreviewModal
            open={isShareDialogOpen || isTicketDialogOpen}
            onOpenChange={handleCloseModals}
            service={recordForSharing || serviceForTicket || null}
            vehicle={vehicles.find(
              (v) => v.id === (recordForSharing || serviceForTicket)?.vehicleId
            )}
          />
        )}
      </Suspense>
    </Suspense>
  );
}

export default withSuspense(PageInner, null);
