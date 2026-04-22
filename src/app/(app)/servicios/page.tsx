// src/app/(app)/servicios/page.tsx
"use client";

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ActiveServicesList } from "./components/lists/active-services-list";
import { QuotesList } from "./components/lists/quotes-list";
import { HistoryList } from "./components/lists/history-list";
import { useServicesData } from "./components/hooks/use-services-data";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";
import { PaymentDetailsDialog } from "@/components/shared/PaymentDetailsDialog";
import { TiposDeServicioPageContent } from "./components/service-types-content";

type Tab = "activos" | "cotizaciones" | "historial" | "categorias";

const TABS: { value: Tab; label: string }[] = [
  { value: "activos", label: "Activos" },
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "historial", label: "Historial" },
  { value: "categorias", label: "Categorías" },
];

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

        {/* Tab pills */}
        <div className="flex gap-1 p-1.5 bg-muted/70 backdrop-blur-xs rounded-xl overflow-x-auto ring-1 ring-muted mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "shrink-0 flex-1 min-w-[90px] px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === tab.value
                  ? "bg-red-700 text-white shadow-md scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "activos" && (
            <ActiveServicesList
              vehicles={vehicles}
              personnel={personnel}
              currentUser={currentUser}
              onView={openShareDialog}
              onShowTicket={openShareDialog}
              onComplete={openPaymentDialog}
            />
          )}
          {activeTab === "cotizaciones" && (
            <QuotesList
              vehicles={vehicles}
              personnel={personnel}
              currentUser={currentUser}
              onView={openShareDialog}
              onDelete={deleteService}
            />
          )}
          {activeTab === "historial" && (
            <HistoryList
              vehicles={vehicles}
              personnel={personnel}
              currentUser={currentUser}
              onView={openShareDialog}
              onShowTicket={openShareDialog}
              onDelete={deleteService}
            />
          )}
          {activeTab === "categorias" && (
            <TiposDeServicioPageContent serviceTypes={serviceTypes} />
          )}
        </div>
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
