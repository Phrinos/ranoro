
"use client";

import React from 'react';
import type { ServiceRecord } from '@/types';
import { QuoteSheetContent } from './QuoteSheetContent';
import { ServiceOrderContent } from './ServiceOrderContent';
import { useToast } from '@/hooks/use-toast';

interface ServiceSheetContentProps {
  record: any;
  onSignClick?: () => void;
  isSigning?: boolean;
  activeTab: string;
}

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ record, onSignClick, isSigning, activeTab }, ref) => {
    const { toast } = useToast();
    const isQuoteOrScheduled = record.status === 'Cotizacion' || record.status === 'Agendado';

    const handleViewImage = (url: string) => {
        // This function could be enhanced to open a modal
        window.open(url, '_blank');
        toast({ title: 'Abriendo imagen en nueva pestaña' });
    };

    if (isQuoteOrScheduled) {
      return <QuoteSheetContent ref={ref} quote={record} />;
    }
    
    return <ServiceOrderContent ref={ref} service={record} onViewImage={handleViewImage} isPublicView={record.isPublicView} onSignClick={onSignClick} isSigning={isSigning} activeTab={activeTab} />;
  }
);

ServiceSheetContent.displayName = "ServiceSheetContent";
