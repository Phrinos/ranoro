
// src/app/(app)/servicios/components/service-dialog.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// This component is now a simple wrapper that redirects to the new service page.
// The modal form logic has been moved to the new dedicated pages.

interface ServiceDialogProps {
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  trigger?: React.ReactNode;
}

export function ServiceDialog({ open, onOpenChange, trigger }: ServiceDialogProps) {
  const router = useRouter();

  const handleRedirect = () => {
    router.push('/servicios/nuevo');
  };

  React.useEffect(() => {
    if (open) {
      handleRedirect();
      // It's good practice to call onOpenChange to signal the dialog should close
      // after the redirect has been initiated.
      onOpenChange?.(false);
    }
  }, [open, onOpenChange]);

  // If the dialog is triggered by a button, this will open it,
  // then the useEffect will immediately redirect.
  if (trigger) {
    return (
      <div onClick={handleRedirect}>
        {trigger}
      </div>
    );
  }

  // If used programmatically, it will just handle the redirect.
  // We render null because the redirect will take over.
  return null;
}
