
"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { PrintTicketDialog } from "@/components/ui/print-ticket-dialog";
import { QuoteContent } from "@/components/quote-content";
import {
  placeholderVehicles,
  placeholderInventory,
  placeholderQuotes,
  persistToFirestore
} from "@/lib/placeholder-data";
import type {
  QuoteRecord,
  Vehicle,
  ServiceRecord,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, Copy } from "lucide-react";


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

  /* ---------- Redirección al cerrar ---------- */
  useEffect(() => {
    if (dialogStep === "closed") {
      router.push("/cotizaciones/historial");
    }
  }, [dialogStep, router]);

  /* --------------------------------------------------
     1. Crear cotización y pasar a vista previa
  -------------------------------------------------- */
  const handleQuoteCreated = async (data: ServiceRecord | QuoteRecord) => {
    if (!("estimatedTotalCost" in data)) {
      // This case should ideally not be hit with the new logic, but serves as a safeguard.
      return;
    }
    
    const newQuote = data as QuoteRecord;

    // The form now handles the main toast notifications.
    // This handler's job is to update local state for the UI and persist.
    // Note: The form's onSubmit already includes persistence logic via its own call.
    // To avoid duplication, we ensure this only adds to the local array for immediate UI update.
    if (!placeholderQuotes.find(q => q.id === newQuote.id)) {
      placeholderQuotes.unshift(newQuote);
      await persistToFirestore(['quotes']);
    }

    setCurrentQuoteForPdf(newQuote);
    setCurrentVehicleForPdf(
      vehicles.find((v) => v.id === newQuote.vehicleId) || null
    );
    
    setDialogStep("print_preview");
  };

  const handleDownloadPdf = async () => {
    if (!quoteContentRef.current || !currentQuoteForPdf) {
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
      return;
    }
    const html2pdf = (await import('html2pdf.js')).default;
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

  const handleCopyAsImage = async () => {
    if (!quoteContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido para copiar.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(quoteContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5,
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen de la cotización ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta descargar el PDF.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen.", variant: "destructive" });
    }
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
    
    if (!currentQuoteForPdf.publicId) {
        toast({ title: "Enlace no disponible", description: "La cotización aún no tiene un enlace público para compartir.", variant: "default" });
        return;
    }

    const shareUrl = `${window.location.origin}/c/${currentQuoteForPdf.publicId}`;
    const { ownerName = "Cliente", make, model, year } = currentVehicleForPdf;

    const message = `Hola ${ownerName}:
Le enviamos su cotización folio ${currentQuoteForPdf.id} para su ${make} ${model} ${year}. Puede consultarla aquí: 

${shareUrl}

Quedamos a sus ordenes y a la espera de poder atender su vehiculo. Gracias por confiar en Ranoro.`;

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
          onSave={handleQuoteCreated}
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
              <Button variant="outline" onClick={handleCopyAsImage}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Imagen
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
            workshopInfo={currentQuoteForPdf.workshopInfo}
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
