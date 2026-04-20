
// src/components/shared/ConfirmDialog.tsx
'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  children?: React.ReactNode; // For custom content like text areas
}

export function ConfirmDialog({
  triggerButton,
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'destructive',
  isLoading: propIsLoading,
  children,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled && onOpenChange ? onOpenChange : setInternalOpen;
  
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = propIsLoading !== undefined ? propIsLoading : internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
        if (typeof onConfirm === 'function') {
            await onConfirm();
        }
    } finally {
        setInternalLoading(false);
        setDialogOpen(false); // Ensure dialog closes after action
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {triggerButton && (
        <AlertDialogTrigger asChild>
          {triggerButton}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="py-4">{children}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDialogOpen(false)} disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === 'destructive' ? "bg-destructive hover:bg-destructive/90" : ""}
            disabled={isLoading}
          >
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isLoading ? "Confirmando..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
