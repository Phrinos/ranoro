// src/app/(app)/pos/nuevo/page.tsx

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PosForm } from '../components/pos-form';
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, saleService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { DocumentPreviewDialog } from '@/components/shared/DocumentPreviewDialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
import html2canvas from 'html2canvas';
import { posFormSchema, type POSFormValues } from '@/schemas/pos-form-schema';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function NuevaVentaPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [saleForTicket, setSaleForTicket] = useState<SaleReceipt | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);

  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationIndex, setValidationIndex] = useState<number | null>(null);
  const [validationFolio, setValidationFolio] = useState('');
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});

  const methods = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: 'Cliente Mostrador',
      payments: [{ method: 'Efectivo', amount: undefined }],
    },
  });

  const { watch } = methods;

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
    ];
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleCopySaleForWhatsapp = useCallback(() => {
    if (!saleForTicket) return;
    const workshopName = workshopInfo?.name || 'nuestro taller';
    const message = `Hola ${saleForTicket.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${saleForTicket.id}
Total: ${formatCurrency(saleForTicket.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [saleForTicket, workshopInfo, toast]);


  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

    if (!currentUser) {
        toast({ title: 'Error', description: 'No se pudo identificar al usuario. Por favor, inicie sesión de nuevo.', variant: 'destructive'});
        return;
    }

    const batch = writeBatch(db);
    
    try {
      const saleId = `SALE-${nanoid(8).toUpperCase()}`;
      await saleService.registerSale(saleId, values, currentInventoryItems, currentUser, batch);
      await batch.commit();

      const totalAmount = values.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const IVA_RATE = 0.16;
      const subTotal = totalAmount / (1 + IVA_RATE);
      const tax = totalAmount - subTotal;

      const newSaleReceipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        items: values.items,
        customerName: values.customerName,
        payments: values.payments,
        subTotal, 
        tax,
        totalAmount,
        status: 'Completado',
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        cardCommission: values.cardCommission,
      };
      
      toast({ title: 'Venta Registrada', description: `La venta #${saleId} se ha completado.` });
      
      setSaleForTicket(newSaleReceipt);
      setIsTicketDialogOpen(true); // Open dialog to show ticket and actions
      
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar Venta', variant: 'destructive'});
    }
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };
  
  const handleDialogClose = () => {
    setIsTicketDialogOpen(false);
    setSaleForTicket(null);
    methods.reset(); // Reset the form for a new sale
    router.push('/pos'); // Navigate to the main POS page
  };
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !saleForTicket) return null;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `ticket_${saleForTicket.id}.png`, { type: 'image/png' });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: "Copiado", description: "La imagen ha sido copiada." });
        return null;
      }
    } catch (e) {
      console.error('Error handling image:', e);
      toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
      return null;
    }
  }, [saleForTicket, toast]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Ticket de Venta',
          text: `Ticket de tu compra en ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        if(!String(error).includes('AbortError')) {
           toast({ title: 'No se pudo compartir', description: 'Copiando texto para WhatsApp como alternativa.', variant: 'default' });
           handleCopySaleForWhatsapp();
        }
      }
    } else {
        // Fallback for desktop browsers that don't support navigator.share with files
        handleCopySaleForWhatsapp();
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };
  
  const handleOpenValidateDialog = (index: number) => {
    setValidationIndex(index);
    setValidationFolio('');
    setIsValidationDialogOpen(true);
  };

  const handleConfirmValidation = () => {
    if (validationIndex === null) return;
    const originalFolio = watch(`payments.${validationIndex}.folio`);
    
    if (validationFolio === originalFolio) {
      setValidatedFolios(prev => ({ ...prev, [validationIndex]: true }));
      toast({ title: "Folio Validado", description: "El folio coincide correctamente." });
    } else {
      setValidatedFolios(prev => {
          const newValidated = { ...prev };
          delete newValidated[validationIndex];
          return newValidated;
      });
      toast({ title: "Error de Validación", description: "Los folios no coinciden. Por favor, verifique.", variant: "destructive" });
    }
    setIsValidationDialogOpen(false);
  };

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Registrar Nueva Venta</h1>
                <p className="text-primary-foreground/80 mt-1">Añada artículos y finalice la transacción para generar el ticket.</p>
            </div>
        </div>
      </div>
      
      <FormProvider {...methods}>
        <PosForm
          inventoryItems={currentInventoryItems} 
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={handleNewInventoryItemCreated}
          categories={allCategories}
          suppliers={allSuppliers}
          onOpenValidateDialog={handleOpenValidateDialog}
          validatedFolios={validatedFolios}
        />
      </FormProvider>

      {saleForTicket && (
        <DocumentPreviewDialog
          open={isTicketDialogOpen}
          onOpenChange={handleDialogClose}
          title="Venta Completada"
          description={`Ticket para la venta #${saleForTicket.id}`}
        >
          <div id="printable-ticket">
            <TicketContent
                ref={ticketContentRef}
                sale={saleForTicket}
                previewWorkshopInfo={workshopInfo || undefined}
            />
          </div>
        </DocumentPreviewDialog>
      )}

      <AlertDialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar Folio</AlertDialogTitle>
            <AlertDialogDescription>
              Para evitar errores, por favor ingrese nuevamente el folio del voucher o referencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="folio-validation-input">Reingresar Folio</Label>
            <Input
              id="folio-validation-input"
              value={validationFolio}
              onChange={(e) => setValidationFolio(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidation}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
