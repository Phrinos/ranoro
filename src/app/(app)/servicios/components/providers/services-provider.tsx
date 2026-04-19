// src/app/(app)/servicios/components/providers/services-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ServiceRecord, Vehicle, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { inventoryService, adminService, serviceService } from "@/lib/services";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

interface DialogState<T> {
  open: boolean;
  data: T | null;
}

interface ServicesContextType {
  vehicles: Vehicle[];
  personnel: User[];
  serviceTypes: import('@/types').ServiceTypeRecord[];
  currentUser: User | null;
  isLoading: boolean;
  shareDialog: DialogState<ServiceRecord>;
  paymentDialog: DialogState<ServiceRecord>;
  ticketDialog: DialogState<ServiceRecord>;
  openShareDialog: (service: ServiceRecord) => void;
  openPaymentDialog: (service: ServiceRecord) => void;
  openTicketDialog: (service: ServiceRecord) => void;
  closeAllDialogs: () => void;
  setPaymentDialogOpen: (open: boolean) => void;
  confirmCompletion: (service: ServiceRecord, details: any, nextServiceInfo?: any) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
}

const ServicesContext = createContext<ServicesContextType | null>(null);

const CLOSED_DIALOG = { open: false, data: null };

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [serviceTypes, setServiceTypes] = useState<import('@/types').ServiceTypeRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [shareDialog, setShareDialog] = useState<DialogState<ServiceRecord>>(CLOSED_DIALOG);
  const [paymentDialog, setPaymentDialog] = useState<DialogState<ServiceRecord>>(CLOSED_DIALOG);
  const [ticketDialog, setTicketDialog] = useState<DialogState<ServiceRecord>>(CLOSED_DIALOG);

  useEffect(() => {
    const authUserString =
      typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    if (authUserString) {
      try {
        setCurrentUser(JSON.parse(authUserString));
      } catch {
        /* ignore */
      }
    }

    setIsLoading(true);
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      inventoryService.onServiceTypesUpdate(setServiceTypes),
      adminService.onUsersUpdate((users) => {
        setPersonnel(users);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const openShareDialog = useCallback((service: ServiceRecord) => {
    setShareDialog({ open: true, data: service });
  }, []);

  const openPaymentDialog = useCallback((service: ServiceRecord) => {
    setPaymentDialog({ open: true, data: service });
  }, []);

  const openTicketDialog = useCallback((service: ServiceRecord) => {
    setTicketDialog({ open: true, data: service });
  }, []);

  const closeAllDialogs = useCallback((open?: boolean) => {
    if (open === true) return; // called by onOpenChange with true — ignore
    setShareDialog(CLOSED_DIALOG);
    setTicketDialog(CLOSED_DIALOG);
  }, []);

  const setPaymentDialogOpen = useCallback((open: boolean) => {
    setPaymentDialog((prev) => ({ ...prev, open }));
  }, []);

  const confirmCompletion = useCallback(
    async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
      if (!db) { toast({ title: "Error de base de datos", variant: "destructive" }); return; }
      try {
        const batch = writeBatch(db);
        await serviceService.completeService(service, { ...paymentDetails, nextServiceInfo }, batch);
        await batch.commit();
        toast({ title: "Servicio Completado" });
        const updated = {
          ...service,
          ...paymentDetails,
          status: "Entregado",
          deliveryDateTime: new Date().toISOString(),
        } as ServiceRecord;
        setShareDialog({ open: true, data: updated });
      } catch {
        toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive" });
      } finally {
        setPaymentDialog(CLOSED_DIALOG);
      }
    },
    [toast]
  );

  const deleteService = useCallback(
    async (id: string) => {
      try {
        await serviceService.deleteService(id);
        toast({ title: "Servicio Eliminado" });
      } catch (e) {
        toast({
          title: "Error al Eliminar",
          description: e instanceof Error ? e.message : "",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  return (
    <ServicesContext.Provider
      value={{
        vehicles,
        personnel,
        serviceTypes,
        currentUser,
        isLoading,
        shareDialog,
        paymentDialog,
        ticketDialog,
        openShareDialog,
        openPaymentDialog,
        openTicketDialog,
        closeAllDialogs,
        setPaymentDialogOpen,
        confirmCompletion,
        deleteService,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServicesContext(): ServicesContextType {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServicesContext must be used within <ServicesProvider>");
  return ctx;
}
