
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Clock, CheckCircle, Wrench, CalendarCheck, Share2, Loader2 } from "lucide-react";
import { ServiceDialog } from "./components/service-dialog";
import type { ServiceRecord, Vehicle, Technician, QuoteRecord, InventoryItem } from "@/types";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { isValid, parseISO, compareDesc } from "date-fns";
import { es } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, limit, startAfter, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { nanoid } from 'nanoid';
import { format } from 'date-fns';

const PAGE_SIZE = 15; // Load 15 services at a time

async function createPublicService(service: ServiceRecord, vehicle: Vehicle | undefined): Promise<string> {
  const publicId = service.publicId || `srv_${nanoid(15)}`;
  if (!db) throw new Error("La conexión con la base de datos no está configurada.");
  if (!vehicle) throw new Error("No se encontró el vehículo asociado a este servicio.");
  
  const publicDocRef = doc(db, 'publicServices', publicId);
  const publicData = { ...service, vehicle };
  await setDoc(publicDocRef, publicData);
  return publicId;
}

export default function ServiciosPage() {
  const { toast } = useToast();
  
  // States for holding data from Firestore
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [technicians, setTechnicians] = useState<Technician[]>([]); 
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); 
  
  // State for pagination
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  // Real-time listener for secondary data (vehicles, techs, inventory)
  useEffect(() => {
    if (!db) return;
    const collectionsToListen = [
        { name: 'vehicles', setter: setVehicles },
        { name: 'technicians', setter: setTechnicians },
        { name: 'inventory', setter: setInventoryItems },
    ];
    
    const unsubscribes = collectionsToListen.map(({ name, setter }) => 
        onSnapshot(collection(db, name), (snapshot) => {
            setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        }, (error) => console.error(`Error al escuchar ${name}: `, error))
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Real-time listener for the FIRST PAGE of services
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const q = query(collection(db, "serviceRecords"), orderBy("serviceDate", "desc"), limit(PAGE_SIZE));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const initialServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
      setServices(initialServices);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar servicios iniciales: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Function to load more services for pagination
  const loadMoreServices = useCallback(async () => {
    if (!hasMore || loading || !lastVisible) return;
    
    setLoading(true);
    const q = query(
      collection(db, "serviceRecords"),
      orderBy("serviceDate", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );

    const documentSnapshots = await getDocs(q);
    const newServices = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
    
    setServices(prev => [...prev, ...newServices]);
    setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
    setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
    setLoading(false);
  }, [lastVisible, hasMore, loading]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreServices();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loadMoreServices]);


  const handleShareService = async (service: ServiceRecord) => {
    try {
      const vehicle = vehicles.find(v => v.id === service.vehicleId);
      const publicId = await createPublicService(service, vehicle);
      
      const serviceDocRef = doc(db, 'serviceRecords', service.id!);
      await setDoc(serviceDocRef, { publicId }, { merge: true });

      const publicUrl = `${window.location.origin}/s/${publicId}`;
      navigator.clipboard.writeText(publicUrl);
      
      toast({
        title: "Enlace Compartido",
        description: "El enlace a la hoja de servicio ha sido copiado al portapapeles.",
      });

    } catch (error) {
      console.error("Error al compartir el servicio:", error);
      toast({
        title: "Error al Compartir",
        description: `No se pudo crear el enlace. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (service: ServiceRecord | null = null) => {
    setEditingService(service);
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = async (data: ServiceRecord | QuoteRecord) => {
    if (!db) return toast({ title: "Error de base de datos", variant: "destructive" });
    if (!('status' in data)) return toast({ title: "Error de tipo", description: "Se intentó guardar una cotización como servicio.", variant: "destructive" });

    const serviceData = data as ServiceRecord;
    const isNew = !serviceData.id;
    const docId = serviceData.id || nanoid();
    
    try {
      await setDoc(doc(db, "serviceRecords", docId), { ...serviceData, id: docId }, { merge: true });
      toast({
        title: isNew ? "Servicio Creado" : "Servicio Actualizado",
        description: `El servicio para ${vehicles.find(v => v.id === serviceData.vehicleId)?.licensePlate} ha sido guardado.`,
      });
    } catch (error) {
      console.error("Error guardando servicio: ", error);
      toast({ title: "Error al Guardar", variant: "destructive" });
    }

    setIsServiceDialogOpen(false);
    setEditingService(null);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!db) return toast({ title: "Error de base de datos", variant: "destructive" });
    try {
      await deleteDoc(doc(db, "serviceRecords", serviceId));
      toast({ title: "Servicio Eliminado", description: `El servicio con ID ${serviceId} ha sido eliminado.` });
    } catch (error) {
      console.error("Error eliminando servicio: ", error);
      toast({ title: "Error al Eliminar", variant: "destructive" });
    }
  };

  const sortedServicesForList = useMemo(() => {
    return [...services].sort((a, b) => {
      const statusOrder = { "Agendado": 1, "Reparando": 2, "Completado": 3, "Cancelado": 4 };
      const statusAVal = statusOrder[a.status as keyof typeof statusOrder] || 5;
      const statusBVal = statusOrder[b.status as keyof typeof statusOrder] || 5;

      if (statusAVal !== statusBVal) return statusAVal - statusBVal;
      
      const dateA = a.serviceDate ? parseISO(a.serviceDate) : new Date(0);
      const dateB = b.serviceDate ? parseISO(b.serviceDate) : new Date(0);

      if (isValid(dateA) && isValid(dateB)) {
         const dateComparison = compareDesc(dateA, dateB);
         if (dateComparison !== 0) return dateComparison;
      }
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [services]);

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success"; 
      case "Reparando": return "secondary"; 
      case "Cancelado": return "destructive"; 
      case "Agendado": return "default"; 
      default: return "default";
    }
  };

  return (
    <>
      <PageHeader
        title="Lista de Servicios"
        description="Visualiza, crea y actualiza las órdenes de servicio en tiempo real."
        actions={
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Servicio
            </Button>
        }
      />
      <div className="space-y-4">
        {sortedServicesForList.map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const technician = technicians.find(t => t.id === service.technicianId);
              
              const formattedDelivery = service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime))
                  ? format(parseISO(service.deliveryDateTime), "dd MMM, HH:mm", { locale: es })
                  : 'N/A';
              
              const serviceReceptionTime = service.serviceDate && isValid(parseISO(service.serviceDate)) ? format(parseISO(service.serviceDate), "HH:mm", { locale: es }) : 'N/A';

              return (
                <Card key={service.id} className="shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                        <div className="w-48 shrink-0 flex flex-col justify-center items-start text-left pl-6">
                            <p className="text-xs text-muted-foreground">ID Servicio</p>
                            <p className="font-semibold text-lg text-foreground">
                                {service.id?.substring(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Costo</p>
                            <p className="font-bold text-2xl text-foreground">
                                ${service.totalCost?.toLocaleString('es-ES') || '0'}
                            </p>
                        </div>
                        
                        <div className="flex-grow border-l border-r p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5" title="Hora de Recepción">
                                    {(service.status === 'Reparando' || service.status === 'Completado') ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
                                    <span>Recepción: {serviceReceptionTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Wrench className="h-4 w-4" />
                                    <span>{technician ? technician.name : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Fecha de Entrega">
                                    {service.status === 'Completado' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarCheck className="h-4 w-4" />}
                                    <span>Entrega: {formattedDelivery}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-base">
                                        {vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : `Vehículo ID: ${service.vehicleId}`}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {service.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                             <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center">{service.status}</Badge>
                            <div className="flex">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(service)} title="Editar Servicio">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleShareService(service)} title="Compartir Enlace">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Eliminar Servicio">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar Servicio?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este servicio?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteService(service.id!)} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        <div ref={loaderRef} className="flex justify-center items-center p-4">
            {loading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {!loading && !hasMore && <p className="text-muted-foreground">Fin de los resultados.</p>}
        </div>
      </div>
      
      {isServiceDialogOpen && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={editingService} 
          vehicles={vehicles} 
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveService}
          onVehicleCreated={(newVehicle) => {
              if (!db) return;
              setDoc(doc(db, 'vehicles', newVehicle.id), newVehicle);
          }}
          mode="service"
        />
      )}
    </>
  );
}
