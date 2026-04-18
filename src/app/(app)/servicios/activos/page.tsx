// src/app/(app)/servicios/activos/page.tsx
"use client";

import React, { Suspense } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { ActiveServicesList } from "../components/lists/active-services-list";
import { useServicesData } from "../components/hooks/use-services-data";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";
import { PaymentDetailsDialog } from "@/components/shared/PaymentDetailsDialog";

function PageInner() {
  const {
    vehicles,
    personnel,
    currentUser,
    shareDialog,
    paymentDialog,
    openShareDialog,
    openPaymentDialog,
    closeAllDialogs,
    setPaymentDialogOpen,
    confirmCompletion,
  } = useServicesData();

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Servicios Activos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Servicios en taller, agendados para hoy y entregados hoy.
            </p>
          </div>
          <Link href="/servicios/nuevo">
            <Button className="shrink-0 group">
              <PlusCircle className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Nuevo Servicio
            </Button>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <ActiveServicesList
            vehicles={vehicles}
            personnel={personnel}
            currentUser={currentUser}
            onView={openShareDialog}
            onShowTicket={openShareDialog}
            onComplete={openPaymentDialog}
          />
        </Suspense>
      </div>

      {/* Modals */}
      {shareDialog.data && (
        <TicketPreviewModal
          open={shareDialog.open}
          onOpenChange={closeAllDialogs}
          service={shareDialog.data}
          vehicle={vehicles.find((v) => v.id === shareDialog.data?.vehicleId)}
        />
      )}

      {paymentDialog.data && (
        <PaymentDetailsDialog
          open={paymentDialog.open}
          onOpenChange={setPaymentDialogOpen}
          record={paymentDialog.data}
          onConfirm={(_id, details) =>
            confirmCompletion(paymentDialog.data!, details)
          }
          recordType="service"
          isCompletionFlow={true}
        />
      )}
    </>
  );
}

export default withSuspense(PageInner, null);
