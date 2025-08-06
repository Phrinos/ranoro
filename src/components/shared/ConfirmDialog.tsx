
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
  triggerButton: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  children?: React.ReactNode; // For custom content like text areas
}

export function ConfirmDialog({
  triggerButton,
  title,
  description,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'destructive',
  isLoading: propIsLoading,
  children,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = propIsLoading !== undefined ? propIsLoading : internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    await onConfirm();
    setInternalLoading(false);
    // Parent component should be responsible for closing the dialog
    // by changing the 'open' state if it's controlled.
    // If not controlled, we might close it here.
    // setIsOpen(false); // Uncomment if the dialog should always close on confirm
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {triggerButton}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="py-4">{children}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
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
