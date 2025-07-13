// src/app/(app)/servicios/components/ServiceFormLayout.tsx

'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Wrench, CheckCircle, ShieldCheck, Ban, Camera } from 'lucide-react';
import type { ServiceRecord } from '@/types';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface ServiceFormHeaderProps {
  onPreview: () => void;
  isReadOnly?: boolean;
  status?: ServiceRecord['status'];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function ServiceFormHeader({ onPreview, isReadOnly, status, activeTab, onTabChange }: ServiceFormHeaderProps) {
  const showAdv = status && ['En Taller', 'Entregado', 'Cancelado'].includes(status);
  
  const tabs = [
    { value: 'servicio', label: 'Detalles', icon: Wrench, show: true },
    { value: 'recepcion', label: 'Rec./Ent.', icon: CheckCircle,  show: showAdv },
    { value: 'reporte', label: 'Fotos', icon: Camera, show: showAdv },
    { value: 'seguridad', label: 'Revisión',   icon: ShieldCheck,  show: showAdv },
  ].filter((t) => t.show);

  // Define grid class based on number of tabs to avoid dynamic class generation
  const gridColsClass = 
    tabs.length === 4 ? 'grid-cols-4' :
    tabs.length === 3 ? 'grid-cols-3' :
    tabs.length === 2 ? 'grid-cols-2' :
    'grid-cols-1';

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 pt-2 pb-2 border-b">
        <div className="flex justify-between items-center">
          <TabsList className={cn('grid w-full mb-0', gridColsClass)}>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm flex items-center gap-2">
                <t.icon className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.slice(0, 5)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {!isReadOnly && (
            <Button type="button" onClick={onPreview} variant="ghost" size="icon" title="Vista previa">
              <Eye className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </Tabs>
  );
}


interface ServiceFormFooterProps {
    isEditing: boolean;
    isReadOnly?: boolean;
    isSubmitting: boolean;
    status?: ServiceRecord['status'];
    onClose: () => void;
    onCancelService?: (reason: string) => void;
    onDelete?: () => void;
}
  
export function ServiceFormFooter({
    isEditing,
    isReadOnly,
    isSubmitting,
    status,
    onClose,
    onCancelService,
    onDelete,
}: ServiceFormFooterProps) {
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
  
    const canBeCancelled = isEditing && status !== 'Cancelado' && status !== 'Entregado';
  
    return (
      <div className="flex justify-between items-center mt-8">
        <div>
          {canBeCancelled && onCancelService && (
            <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" type="button" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                  <Ban className="mr-2 h-4 w-4" /> Cancelar Servicio
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro de cancelar este servicio?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer. El estado se cambiará a "Cancelado".</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea placeholder="Motivo de la cancelación (opcional)..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCancellationReason('')}>Cerrar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { onCancelService(cancellationReason); onClose(); }} className="bg-destructive hover:bg-destructive/90">
                    Sí, Cancelar Servicio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isEditing && onDelete && (
            <ConfirmDialog
              triggerButton={<Button variant="destructive" type="button" className="ml-2">Eliminar</Button>}
              title="¿Eliminar Registro?"
              description="Esta acción no se puede deshacer y eliminará permanentemente este registro. ¿Está seguro?"
              onConfirm={onDelete}
            />
          )}
        </div>
        <div className="flex gap-2">
          {isReadOnly ? (
            <Button variant="outline" type="button" onClick={onClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </>
          )}
        </div>
      </div>
    );
}