
// src/app/(app)/vehiculos/components/VehicleInfoCard.tsx
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Fingerprint, Cog, FileText, User, Phone, Car, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from "@/hooks/usePermissions";

interface VehicleInfoCardProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function VehicleInfoCard({ vehicle, onEdit }: VehicleInfoCardProps) {
  const userPermissions = usePermissions();

  const vehicleInfo = [
    { icon: Car, label: "Marca", value: vehicle.make },
    { icon: Car, label: "Modelo", value: vehicle.model },
    { icon: Calendar, label: "Año", value: vehicle.year },
    { icon: Cog, label: "Tipo Motor", value: (vehicle as unknown as any).engine || 'N/A' },
    { icon: Fingerprint, label: "Número Motor", value: vehicle.engineSerialNumber || 'N/A' },
    { icon: Car, label: "Color", value: vehicle.color },
  ];

  const ownerInfo = [
    { icon: User, label: "Propietario", value: vehicle.ownerName },
    { icon: Phone, label: "Teléfono", value: vehicle.ownerPhone },
  ];

  const hasNotes = Boolean(vehicle.notes && vehicle.notes.trim() !== "");

  return (
    <Card className="overflow-hidden border-0 shadow-lg relative bg-card">
      {/* Cabecera Glassmorphism / Dark Gradient */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-6 sm:p-8 overflow-hidden text-white border-b border-red-800/50">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                <Car className="w-6 h-6 text-white" />
              </div>
              <Badge variant="secondary" className="bg-black/20 text-white hover:bg-black/30 border-0 pointer-events-none px-2.5">
                {vehicle.licensePlate || 'SIN PLACA'}
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm flex items-center gap-2">
              {vehicle.make} <span className="text-slate-300 font-medium">{vehicle.model}</span>
            </h2>
          </div>
          {userPermissions.has('fleet:edit') && (
            <Button 
              onClick={onEdit} 
              variant="outline" 
              className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white transition-all shadow-sm group"
            >
              <Edit className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <CardContent className="p-6 sm:p-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Ficha Técnica */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm tracking-widest text-muted-foreground uppercase flex items-center gap-2 mb-4">
              <Cog className="w-4 h-4" /> Detalle Técnico
            </h4>
            <div className="space-y-3">
              {vehicleInfo.map(item => (
                <div key={item.label} className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="p-1.5 rounded-md bg-background border shadow-sm group-hover:border-primary/20 group-hover:text-primary transition-colors">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="font-semibold text-sm text-foreground text-right">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Propietario */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm tracking-widest text-muted-foreground uppercase flex items-center gap-2 mb-4">
              <User className="w-4 h-4" /> Propietario
            </h4>
            <div className="space-y-3">
              {ownerInfo.map(item => (
                <div key={item.label} className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="p-1.5 rounded-md bg-background border shadow-sm group-hover:border-primary/20 group-hover:text-primary transition-colors">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="font-semibold text-sm text-foreground text-right">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notas Generales */}
          <div className="space-y-4 lg:col-span-1 md:col-span-2">
            <h4 className="font-bold text-sm tracking-widest text-muted-foreground uppercase flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" /> Notas 
            </h4>
            {hasNotes ? (
              <div className="text-sm text-foreground/90 p-4 bg-muted/30 border border-muted-foreground/10 rounded-xl min-h-[140px] shadow-inner whitespace-pre-wrap break-words italic leading-relaxed">
                "{vehicle.notes}"
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-muted/10 border border-dashed rounded-xl min-h-[140px]">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground text-center">No hay notas adicionales registradas.</p>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
