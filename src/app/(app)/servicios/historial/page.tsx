// src/app/(app)/servicios/historial/page.tsx
"use client";

import React from "react";
import { withSuspense } from "@/lib/withSuspense";
import { HistoryList } from "../components/lists/history-list";
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Historial de Servicios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro completo de servicios entregados y cancelados con reportes exportables.
          </p>
        </div>

        <HistoryList
          vehicles={vehicles}
          personnel={personnel}
          currentUser={currentUser}
          onView={openShareDialog}
          onShowTicket={openShareDialog}
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
