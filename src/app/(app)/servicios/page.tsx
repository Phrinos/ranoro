// src/app/(app)/servicios/page.tsx
"use client";

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wrench, FileText, Clock } from "lucide-react";
import Link from "next/link";
import { ActiveServicesList } from "./components/lists/active-services-list";
import { QuotesList } from "./components/lists/quotes-list";
import { HistoryList } from "./components/lists/history-list";
import { useServicesData } from "./components/hooks/use-services-data";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";
import { PaymentDetailsDialog } from "@/components/shared/PaymentDetailsDialog";
import { TiposDeServicioPageContent } from "./components/service-types-content";
import type { ServiceRecord } from "@/types";

type Tab = "activos" | "cotizaciones" | "historial" | "categorias";

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
    deleteService,
    serviceTypes,
  } = useServicesData();

  const [activeTab, setActiveTab] = useState<Tab>("activos");

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Servicios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Panel centralizado de todos los servicios del taller.
            </p>
          </div>
          <Link href="/servicios/nuevo">
            <Button className="shrink-0 group">
              <PlusCircle className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Nuevo Servicio
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-3 sm:w-fit sm:grid-cols-none sm:flex h-10 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger value="activos" className="flex items-center gap-1.5 text-sm">
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Activos</span>
            </TabsTrigger>
            <TabsTrigger value="cotizaciones" className="flex items-center gap-1.5 text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cotizaciones</span>
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Historial</span>
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-1.5 text-sm">
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Categorías</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activos" className="pt-4">
            <ActiveServicesList
              vehicles={vehicles}
              personnel={personnel}
              currentUser={currentUser}
              onView={openShareDialog}
              onShowTicket={openShareDialog}
              onComplete={openPaymentDialog}
            />
          </TabsContent>

          <TabsContent value="cotizaciones" className="pt-4">
            <QuotesList
              vehicles={vehicles}
              personnel={personnel}
              currentUser={currentUser}
              onView={openShareDialog}
              onDelete={deleteService}
            />
          </TabsContent>

          <TabsContent value="historial" className="pt-4">
            <HistoryList
              vehicles={vehicles}
              personnel={personnel}
              currentUser={currentUser}
              onView={openShareDialog}
              onShowTicket={openShareDialog}
              onDelete={deleteService}
            />
          </TabsContent>

          <TabsContent value="categorias" className="pt-4">
            <TiposDeServicioPageContent serviceTypes={serviceTypes} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Shared Modals */}
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
          onConfirm={(_id, details) => confirmCompletion(paymentDialog.data!, details)}
          recordType="service"
          isCompletionFlow={true}
        />
      )}
    </>
  );
}

export default withSuspense(PageInner, null);
