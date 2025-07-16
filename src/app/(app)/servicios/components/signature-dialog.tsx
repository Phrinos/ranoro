
"use client";

import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, Save } from 'lucide-react';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (signatureDataUrl: string) => void;
}

export function SignatureDialog({ open, onOpenChange, onSave }: SignatureDialogProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
        alert("Por favor, provea una firma.");
        return;
    }
    const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (signatureData) {
        onSave(signatureData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 space-y-4">
        <DialogHeader>
          <DialogTitle>Panel de Firma del Cliente</DialogTitle>
          <DialogDescription>
            Pídale al cliente que firme en el recuadro a continuación.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full h-48 border bg-gray-50 rounded-md my-4">
          <SignatureCanvas
            ref={sigCanvas}
            penColor='black'
            canvasProps={{ 
              className: 'w-full h-full',
              willReadFrequently: true 
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={clear}>
            <Eraser className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
