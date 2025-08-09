// This file is no longer used for service previews in the main app
// and has been replaced by ShareServiceDialog. It is kept for historical
// reference in case its functionality is needed elsewhere, but can likely be deleted.

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UnifiedPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  documentType: 'text' | 'html';
  textContent: string;
}

export function UnifiedPreviewDialog({ 
  open, 
  onOpenChange, 
  title, 
  documentType, 
  textContent 
}: UnifiedPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Vista previa del documento.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 bg-muted/30 pb-6">
          <div className="bg-white mx-auto my-4 shadow-lg p-8 w-full max-w-[8.5in]">
            {documentType === 'html' || documentType === 'text' ? (
              <div dangerouslySetInnerHTML={{ __html: textContent }} />
            ) : (
              <p>Formato de documento no soportado para vista previa.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
