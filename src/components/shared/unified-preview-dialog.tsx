
// src/components/shared/unified-preview-dialog.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ServiceRecord } from '@/types';


interface UnifiedPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  service?: ServiceRecord; // Optional service record
}

export function UnifiedPreviewDialog({ 
  open, 
  onOpenChange, 
  title, 
  children,
  footerContent,
  service,
}: UnifiedPreviewDialogProps) {
  
  const isReceipt = service?.id ? false : true; // Heuristic to check if it's a receipt or service sheet
  
  const dialogWidthClass = isReceipt ? 'sm:max-w-xs' : 'sm:max-w-4xl';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] flex flex-col p-0 no-print", dialogWidthClass)}>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Contenido del documento listo para imprimir o compartir.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 bg-muted/30 pb-6 print:bg-white print:p-0">
          <div className="bg-white mx-auto my-4 shadow-lg w-full print:shadow-none">
            {children}
          </div>
        </div>
        {footerContent && (
            <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background sm:justify-end no-print">
                {footerContent}
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
