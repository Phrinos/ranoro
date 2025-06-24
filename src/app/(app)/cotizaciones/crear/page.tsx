
"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { PrintTicketDialog } from "@/components/ui/print-ticket-dialog";
import { QuoteContent } from "@/components/quote-content";
import {
  placeholderVehicles,
  placeholderTechnicians,
  placeholderInventory,
  placeholderQuotes,
  persistToFirestore
} from "@/lib/placeholder-data";
import type {
  QuoteRecord,
  Vehicle,
  Technician,
  ServiceRecord,
  User,
  InventoryItem,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@root/lib/firebaseClient.js';


/* --------------------------------------------------
   TIPOS Y CONSTANTES
-------------------------------------------------- */

type DialogStep = "quote_form" | "print_preview" | "closed";

/* --------------------------------------------------
   COMPONENTE PRINCIPAL
-------------------------------------------------- */

export default function NuevaCotizacionPage() {
  const { toast } = useToast();
  const router = useRouter();

  /* ---------- Estado general ---------- */
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const inventoryItems = placeholderInventory;

  const [dialogStep, setDialogStep] = useState<DialogStep>("quote_form");
  const [currentQuoteForPdf, setCurrentQuoteForPdf] = useState<QuoteRecord | null>(
    null
  );
  const [currentVehicleForPdf, setCurrentVehicleForPdf] =
    useState<Vehicle | null>(null);
  const quoteContentRef = useRef<HTMLDivElement>(null);

  /* ---------- Info del taller (localStorage) ---------- */
  const [workshopInfo, setWorkshopInfo] = useState<{ name?: string }>({});
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("workshopTicketInfo");
      if (stored) setWorkshopInfo(JSON.parse(stored));
    }
  }, []);

  /* ---------- Redirección al cerrar ---------- */
  useEffect(() => {
    if (dialogStep === "closed") {
      router.push("/cotizaciones/historial");
    }
  }, [dialogStep, router]);

  /* --------------------------------------------------
     1. Crear cotización y pasar a vista previa
  -------------------------------------------------- */
  const handleGenerateQuotePdf = async (data: ServiceRecord | QuoteRecord) => {
    if (!("estimatedTotalCost" in data)) {
      toast({
        title: "Error de tipo",
        description: "Se esperaba un registro de cotización.",
        variant: "destructive",
      });
      return;
    }

    // Usuario actual para preparedBy
    let authUserName = "Usuario del Sistema";
    let authUserId = "system_user";
    if (typeof window !== "undefined") {
      const authUserString = localStorage.getItem("authUser");
      if (authUserString) {
        try {
          const authUser: User = JSON.parse(authUserString);
          authUserName = authUser.name;
          authUserId = authUser.id;
        } catch (e) {
          console.error("Failed to parse authUser:", e);
        }
      }
    }
    
    const publicId = `cot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;

    const newQuote: QuoteRecord = {
      ...(data as QuoteRecord),
      id: `COT_${Date.now().toString(36)}`,
      publicId: publicId,
      preparedByTechnicianId: authUserId,
      preparedByTechnicianName: authUserName,
    };

    placeholderQuotes.unshift(newQuote);
    await persistToFirestore(['quotes']);

    // Save to public collection for sharing
    if (db) {
        const vehicleForPublicQuote = vehicles.find((v) => v.id === newQuote.vehicleId);
        if (vehicleForPublicQuote) {
            const publicQuoteData = {
                ...newQuote,
                vehicle: { ...vehicleForPublicQuote },
            };
            try {
                await setDoc(doc(db, "publicQuotes", newQuote.publicId!), publicQuoteData);
            } catch (e) {
                console.error("Failed to save public quote:", e);
                toast({
                    title: "Error de Sincronización Pública",
                    description: "La cotización se guardó, pero el enlace público podría no funcionar.",
                    variant: "destructive",
                });
            }
        }
    }


    setCurrentQuoteForPdf(newQuote);
    setCurrentVehicleForPdf(
      vehicles.find((v) => v.id === newQuote.vehicleId) || null
    );
    toast({
      title: "Cotización lista",
      description: `La cotización ${newQuote.id} está lista para generar el PDF.`,
    });
    setDialogStep("print_preview");
  };

  const handleDownloadPdf = () => {
    if (!quoteContentRef.current || !currentQuoteForPdf) {
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
      return;
    }
    const element = quoteContentRef.current;
    const pdfFileName = `Cotizacion-${currentQuoteForPdf.id}.pdf`;
    const opt = {
      margin: 7.5,
      filename: pdfFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    toast({ title: "Generando PDF...", description: `Se está preparando ${pdfFileName}.` });
    html2pdf().from(element).set(opt).save();
  };


  /* --------------------------------------------------
     3. Copiar mensaje de WhatsApp
  -------------------------------------------------- */
  const handleSendWhatsApp = () => {
    if (!currentQuoteForPdf || !currentVehicleForPdf) {
      toast({
        title: "Faltan datos",
        description: "No se puede generar el mensaje sin datos.",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/c/${currentQuoteForPdf.publicId}`;
    const { ownerName = "Cliente", make, model, year } = currentVehicleForPdf;

    const message = `Hola ${ownerName}, gracias por confiar en ${
      workshopInfo?.name ?? "RANORO"
    }. Le enviamos su cotización ${currentQuoteForPdf.id} para su ${make} ${model} ${year}. Puede consultarla aquí: ${shareUrl}`;

    navigator.clipboard
      .writeText(message)
      .then(() => {
        toast({
          title: "Mensaje copiado",
          description: "El mensaje fue copiado al portapapeles.",
          duration: 2000,
        });
      })
      .catch((err: unknown) => {
        console.error("Clipboard error:", err);
        toast({
          title: "Error al copiar",
          description: "No se pudo copiar el mensaje.",
          variant: "destructive",
        });
      });
  };

  /* --------------------------------------------------
     4. Render
  -------------------------------------------------- */
  return (
    <>
      <PageHeader
        title="Generar Nueva Cotización"
        description="Complete los detalles para la nueva cotización."
      />

      {/* ---------- Paso 1: Formulario ---------- */}
      {dialogStep === "quote_form" && (
        <ServiceDialog
          open
          onOpenChange={(open) => !open && setDialogStep("closed")}
          quote={null}
          vehicles={vehicles}
          technicians={[]}
          inventoryItems={inventoryItems}
          onSave={handleGenerateQuotePdf}
          onVehicleCreated={(v) => {
            if (!vehicles.find((x) => x.id === v.id)) {
              setVehicles((prev) => [...prev, v]);
              if (!placeholderVehicles.find((x) => x.id === v.id))
                placeholderVehicles.push(v);
            }
          }}
          mode="quote"
        />
      )}

      {/* ---------- Paso 2: Vista previa ---------- */}
      {dialogStep === "print_preview" && currentQuoteForPdf && (
        <PrintTicketDialog
          open
          onOpenChange={(open) => !open && setDialogStep("closed")}
          title="Vista Previa de Cotización"
          dialogContentClassName="printable-quote-dialog"
          footerActions={
            <>
              <Button variant="outline" onClick={handleSendWhatsApp}>
                <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
              </Button>
              <Button onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </Button>
            </>
          }
          onDialogClose={() => setDialogStep("closed")}
        >
          <QuoteContent
            ref={quoteContentRef}
            quote={currentQuoteForPdf}
            vehicle={currentVehicleForPdf ?? undefined}
          />
        </PrintTicketDialog>
      )}

      {/* ---------- Paso 3: Redirección ---------- */}
      {dialogStep === "closed" && (
        <p className="text-center text-muted-foreground">Redireccionando...</p>
      )}
    </>
  );
}
