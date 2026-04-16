"use client";

import { withSuspense } from "@/lib/withSuspense";
import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useServiciosSharedState } from "./components/useServiciosSharedState";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";

const ActivosTabContent = lazy(() => import("./components/tab-activos"));
const PaymentDetailsDialog = lazy(() =>
  import("@/components/shared/PaymentDetailsDialog").then((module) => ({
    default: module.PaymentDetailsDialog,
  }))
);

function PageInner() {
  const {
    vehicles,
    personnel,
    currentUser,
    isLoading,
    isShareDialogOpen,
    recordForSharing,
    isPaymentDialogOpen,
    serviceToComplete,
    isTicketDialogOpen,
    serviceForTicket,
    handleShowShareDialog,
    handleShowTicketDialog,
    handleOpenCompletionDialog,
    handleConfirmCompletion,
    handleDeleteService,
    handleCloseModals,
    setIsPaymentDialogOpen,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Servicios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Controla y da seguimiento a los servicios activos de pago o mantenimiento en curso.</p>
        </div>
        <ActivosTabContent
          vehicles={vehicles}
          personnel={personnel}
          onShowShareDialog={handleShowShareDialog}
          onCompleteService={handleOpenCompletionDialog}
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
        {serviceToComplete && (
          <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={serviceToComplete}
            onConfirm={(id, details) =>
              handleConfirmCompletion(
                serviceToComplete,
                details,
                serviceToComplete.nextServiceInfo
              )
            }
            recordType="service"
            isCompletionFlow={true}
          />
        )}
      </Suspense>
    </Suspense>
  );
}

export default withSuspense(PageInner, null);
