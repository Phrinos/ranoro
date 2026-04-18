// src/app/(app)/servicios/components/dialogs/signature-dialog.tsx
"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  description?: string;
}

export function SignatureDialog({
  open,
  onOpenChange,
  onSave,
  title = "Panel de Firma",
  description = "Firme en el recuadro a continuación.",
}: SignatureDialogProps) {
  const sigCanvas = useRef<any>(null);
  const { toast } = useToast();

  const handleClear = () => sigCanvas.current?.clear();

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast({ title: "Firma requerida", description: "Por favor, provea una firma.", variant: "destructive" });
      return;
    }
    const data = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (data) onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 space-y-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="w-full h-48 border bg-gray-50 dark:bg-zinc-900 rounded-md">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{ className: "w-full h-full" }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClear}>
            <Eraser className="mr-2 h-4 w-4" /> Limpiar
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Guardar Firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
