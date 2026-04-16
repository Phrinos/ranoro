import { useState, useEffect, useCallback } from "react";
import type { ServiceRecord, Vehicle, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { inventoryService, adminService, serviceService } from "@/lib/services";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export function useServiciosSharedState() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [recordForSharing, setRecordForSharing] = useState<ServiceRecord | null>(null);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [serviceForTicket, setServiceForTicket] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const authUserString =
      typeof window !== "undefined"
        ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY)
        : null;
    if (authUserString) {
      try {
        setCurrentUser(JSON.parse(authUserString));
      } catch (e) {
        console.error("Error parsing auth user", e);
      }
    }

    setIsLoading(true);
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      adminService.onUsersUpdate((users) => {
        setPersonnel(users);
        setIsLoading(false);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const handleShowShareDialog = useCallback((service: ServiceRecord) => {
    setRecordForSharing(service);
    setIsShareDialogOpen(true);
  }, []);

  const handleShowTicketDialog = useCallback((service: ServiceRecord) => {
    setServiceForTicket(service);
    setIsTicketDialogOpen(true);
  }, []);

  const handleOpenCompletionDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleConfirmCompletion = useCallback(
    async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
      if (!db)
        return toast({ title: "Error de base de datos", variant: "destructive" });
      try {
        const batch = writeBatch(db);
        await serviceService.completeService(
          service,
          { ...paymentDetails, nextServiceInfo },
          batch
        );
        await batch.commit();
        toast({ title: "Servicio Completado" });
        const updatedService = {
          ...service,
          ...paymentDetails,
          status: "Entregado",
          deliveryDateTime: new Date().toISOString(),
        } as ServiceRecord;
        setRecordForSharing(updatedService);
        setIsShareDialogOpen(true);
      } catch (e) {
        toast({
          title: "Error",
          description: "No se pudo completar el servicio.",
          variant: "destructive",
        });
      } finally {
        setIsPaymentDialogOpen(false);
      }
    },
    [toast]
  );

  const handleDeleteService = async (serviceId: string) => {
    try {
      await serviceService.deleteService(serviceId);
      toast({
        title: "Servicio Eliminado",
        description: `El registro ha sido eliminado permanentemente.`,
      });
    } catch (e) {
      toast({
        title: "Error al Eliminar",
        description: `No se pudo eliminar el servicio. ${
          e instanceof Error ? e.message : ""
        }`,
        variant: "destructive",
      });
    }
  };

  const handleCloseModals = useCallback((open: boolean) => {
    if (!open) {
      setIsShareDialogOpen(false);
      setIsTicketDialogOpen(false);
    }
  }, []);

  return {
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
  };
}
