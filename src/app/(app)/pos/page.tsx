

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Copy, MessageSquare, Share2, Wallet } from "lucide-react";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User, InventoryCategory, Supplier } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { operationsService, inventoryService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import { VentasPosContent } from "./components/ventas-pos-content";
import html2canvas from 'html2canvas';

export default function PosPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'ventas');
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // States for UI control
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleReceipt | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    const authUserString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
    if (authUserString) {
      try { setCurrentUser(JSON.parse(authUserString)); } catch (e) { console.error("Error parsing auth user", e); }
    }

    unsubs.push(operationsService.onSalesUpdate(setAllSales));
    unsubs.push(inventoryService.onItemsUpdate(setAllInventory));
    unsubs.push(inventoryService.onCategoriesUpdate(setAllCategories));
    unsubs.push(inventoryService.onSuppliersUpdate(setAllSuppliers));
    unsubs.push(adminService.onUsersUpdate((users) => {
        setAllUsers(users);
        setIsLoading(false);
    }));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleReprintSale = useCallback((sale: SaleReceipt) => { setSelectedSaleForReprint(sale); setIsReprintDialogOpen(true); }, []);
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !selectedSaleForReprint) return null;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `ticket_${selectedSaleForReprint.id}.png`, { type: 'image/png' });
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
  }, [selectedSaleForReprint, toast]);
  
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
           toast({ title: 'Error al compartir', variant: 'destructive' });
        }
      }
    } else {
        handleCopySaleForWhatsapp(selectedSaleForReprint!);
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  const handleCopySaleForWhatsapp = useCallback((sale: SaleReceipt) => {
    const workshopName = workshopInfo?.name || 'nuestro taller';
    const message = `Hola ${sale.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${sale.id}
Total: ${formatCurrency(sale.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [toast, workshopInfo]);
  
  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-primary-foreground/80 mt-1">Registra ventas y gestiona las transacciones de mostrador.</p>
      </div>
      <VentasPosContent 
        allSales={allSales} 
        allInventory={allInventory} 
        allUsers={allUsers}
        allCategories={allCategories}
        allSuppliers={allSuppliers}
        currentUser={currentUser}
        onReprintTicket={handleReprintSale}
      />

      <PrintTicketDialog
        open={isReprintDialogOpen && !!selectedSaleForReprint}
        onOpenChange={setIsReprintDialogOpen}
        title="Reimprimir Ticket"
        footerActions={<>
          <Button onClick={() => handleCopyAsImage()} variant="outline" size="icon" title="Copiar Imagen"><Copy className="h-4 w-4"/></Button>
          <Button onClick={handleShare} variant="outline" size="icon" title="Compartir Ticket"><Share2 className="h-4 w-4" /></Button>
          <Button onClick={handlePrint} variant="outline" size="icon" title="Imprimir"><Printer className="h-4 w-4"/></Button>
        </>}
      >
        <div id="printable-ticket">
          {selectedSaleForReprint && <TicketContent ref={ticketContentRef} sale={selectedSaleForReprint} previewWorkshopInfo={workshopInfo || undefined} />}
        </div>
      </PrintTicketDialog>
    </>
  );
}
