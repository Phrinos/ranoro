
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Archive, ArchiveRestore, Loader2, User, Phone, Home, AlertTriangle, Car, DollarSign, FileText, ExternalLink, Edit, History, LayoutDashboard, HandCoins, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { personnelService, inventoryService } from '@/lib/services';
import type { Driver, Vehicle } from '@/types';
import { cn, formatCurrency, capitalizeWords } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import Link from 'next/link';

import { HistoryTabContent } from '../../components/HistoryTabContent';
import { EditContactInfoDialog } from '../../components/EditContactInfoDialog';
import { EditFinancialInfoDialog } from '../../components/EditFinancialInfoDialog';
import { DocumentsCard } from '../../components/DocumentsCard';
import { ContractGeneratorCard } from '../../components/ContractGeneratorCard';
import { RegisterPaymentDialog, type PaymentFormValues } from '../../components/RegisterPaymentDialog';
import { AddManualChargeDialog, type ManualChargeFormValues } from '../../components/AddManualChargeDialog';

export default function DriverProfilePageV2() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isFinancialDialogOpen, setIsFinancialDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    setIsLoading(true);
    const unsub = personnelService.onDriversUpdate((list) => {
      const d = list.find(x => x.id === driverId);
      if (d) {
        setDriver(d);
        if (d.assignedVehicleId) {
          inventoryService.getVehicleById(d.assignedVehicleId).then(v => setAssignedVehicle(v || null));
        } else {
          setAssignedVehicle(null);
        }
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [driverId]);

  const handleSaveContactInfo = async (values: any) => {
    if (!driver) return;
    await personnelService.saveDriver(values, driver.id);
    toast({ title: 'Información actualizada' });
    setIsContactDialogOpen(false);
  };

  const handleSaveFinancialInfo = async (values: any) => {
    if (!driver) return;
    await personnelService.saveDriver({
      ...values,
      contractDate: values.contractDate?.toISOString(),
    }, driver.id);
    toast({ title: 'Datos financieros actualizados' });
    setIsFinancialDialogOpen(false);
  };

  const handleArchiveDriver = async () => {
    if (!driver) return;
    await personnelService.saveDriver({ isArchived: !driver.isArchived }, driver.id);
    toast({ title: `Conductor ${driver.isArchived ? 'restaurado' : 'dado de baja'}` });
  };

  const handleSavePayment = async (data: PaymentFormValues) => {
    if (!driver || !assignedVehicle) {
      toast({ title: 'Sin vehículo asignado', description: 'Asigna un vehículo primero.', variant: 'destructive' });
      return;
    }
    const { rentalService } = await import('@/lib/services/rental.service');
    await rentalService.addRentalPayment(driver, assignedVehicle, data.amount, data.note ?? '', data.paymentDate, data.paymentMethod as any);
    toast({ title: '✅ Abono Registrado' });
    setIsPaymentDialogOpen(false);
  };

  const handleSaveCharge = async (data: ManualChargeFormValues) => {
    if (!driver) return;
    const { personnelService } = await import('@/lib/services');
    await personnelService.saveManualDebt(driver.id, { ...data, date: data.date.toISOString(), note: data.note || 'Cargo manual' });
    toast({ title: '✅ Cargo Registrado' });
    setIsChargeDialogOpen(false);
  };

  const contractDate = useMemo(() => parseDate(driver?.contractDate), [driver?.contractDate]);

  if (isLoading || !driver) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const isInactive = driver.isArchived;
  const statusColor = isInactive ? 'bg-zinc-400' : 'bg-emerald-500';
  const statusLabel = isInactive ? 'Inactivo' : (assignedVehicle ? 'Activo' : 'Disponible');

  return (
    <div className="space-y-6">
      {/* ── Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-xl">
        {/* Subtle grid decoration */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0",
            isInactive ? "bg-zinc-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
          )}>
            {driver.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{driver.name}</h1>
              <Badge className={cn("text-xs font-bold px-2.5 py-0.5 border-0", isInactive ? "bg-zinc-600 text-zinc-300" : assignedVehicle ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30" : "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30")}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 inline-block", statusColor)} />
                {statusLabel}
              </Badge>
            </div>
            <p className="text-zinc-400 text-sm">Perfil de Conductor · Flotilla</p>
            {driver.phone && (
              <p className="text-zinc-300 text-sm mt-1 font-mono">{driver.phone}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {/* Payment — large green */}
            <Button
              size="default"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md gap-2 h-10 px-4"
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              <HandCoins className="h-4 w-4" /> Registrar Abono
            </Button>
            {/* Charge — large red */}
            <Button
              size="default"
              className="bg-red-500 hover:bg-red-600 text-white font-bold shadow-md gap-2 h-10 px-4"
              onClick={() => setIsChargeDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4" /> Registrar Cargo
            </Button>
            {/* Back */}
            <Button variant="outline" size="default" onClick={() => router.push('/flotillav2?tab=conductores')}
              className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:text-white h-10">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
            </Button>
            {/* Archive — white bg, black text */}
            <ConfirmDialog
              triggerButton={
                <Button size="default" className="bg-white text-zinc-900 hover:bg-zinc-100 font-semibold border-0 h-10">
                  {driver.isArchived ? <ArchiveRestore className="mr-1.5 h-4 w-4" /> : <Archive className="mr-1.5 h-4 w-4" />}
                  {driver.isArchived ? "Restaurar" : "Dar de Baja"}
                </Button>
              }
              title={`¿${driver.isArchived ? 'Restaurar' : 'Archivar'} a ${driver.name}?`}
              description={driver.isArchived ? "El conductor volverá a estar activo." : "Se marcará como inactivo y no generará cargos."}
              onConfirm={handleArchiveDriver}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border">
          <TabsTrigger value="overview" className="rounded-xl flex items-center gap-2">
            <LayoutDashboard className="h-3.5 w-3.5" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> Estado de Cuenta
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Driver Data */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Contact Info Card — Glassmorphism */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200/80 bg-white shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-purple-50/20 pointer-events-none" />
                <div className="relative p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">Información de Contacto</h3>
                        <p className="text-xs text-muted-foreground">Datos personales del conductor.</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsContactDialogOpen(true)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: User, label: "Nombre", value: driver.name },
                      { icon: Phone, label: "Teléfono", value: driver.phone },
                      { icon: AlertTriangle, label: "Emergencias", value: driver.emergencyPhone },
                      { icon: Home, label: "Dirección", value: driver.address },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-zinc-800">{value || <span className="text-muted-foreground font-normal text-xs">N/A</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Info Card */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200/80 bg-white shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 pointer-events-none" />
                <div className="relative p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">Datos Financieros</h3>
                        <p className="text-xs text-muted-foreground">Acuerdo económico y depósitos.</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFinancialDialogOpen(true)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: FileText, label: "Fecha de Contrato", value: contractDate && isValid(contractDate) ? capitalizeWords(format(contractDate, "dd 'de' MMMM, yyyy", { locale: es })) : null },
                      { icon: DollarSign, label: "Depósito Requerido", value: driver.requiredDepositAmount ? formatCurrency(driver.requiredDepositAmount) : null },
                      { icon: DollarSign, label: "Depósito Entregado", value: driver.depositAmount ? formatCurrency(driver.depositAmount) : null },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-zinc-800">{value || <span className="text-muted-foreground font-normal text-xs">N/A</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <DocumentsCard driver={driver} />
            </div>

            {/* Right: Vehicle Card + Contract */}
            <div className="space-y-5">
              {/* Vehicle Card — Premium */}
              <div className={cn(
                "relative rounded-2xl overflow-hidden border shadow-sm",
                assignedVehicle ? "border-indigo-200/60 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900" : "border-zinc-200 bg-zinc-50"
              )}>
                {assignedVehicle && (
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                )}
                <div className="relative p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", assignedVehicle ? "bg-white/20" : "bg-zinc-200")}>
                      <Car className={cn("h-4 w-4", assignedVehicle ? "text-white" : "text-zinc-500")} />
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-sm", assignedVehicle ? "text-white" : "text-zinc-700")}>Vehículo Vinculado</h3>
                      <p className={cn("text-xs", assignedVehicle ? "text-indigo-300" : "text-zinc-400")}>Unidad asignada actualmente.</p>
                    </div>
                  </div>
                  {assignedVehicle ? (
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Placa</p>
                        <p className="text-white text-2xl font-black font-mono tracking-wider">{assignedVehicle.licensePlate}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/10 rounded-xl p-3">
                          <p className="text-white/60 text-[10px] uppercase mb-1">Marca</p>
                          <p className="text-white text-sm font-semibold">{assignedVehicle.make}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                          <p className="text-white/60 text-[10px] uppercase mb-1">Año</p>
                          <p className="text-white text-sm font-semibold">{assignedVehicle.year}</p>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/60 text-[10px] uppercase mb-1">Modelo</p>
                        <p className="text-white text-sm font-semibold">{assignedVehicle.model}</p>
                      </div>
                      {assignedVehicle.dailyRentalCost && (
                        <div className="bg-emerald-500/20 rounded-xl p-3 border border-emerald-500/30">
                          <p className="text-emerald-300 text-[10px] uppercase mb-1">Renta Diaria</p>
                          <p className="text-emerald-100 text-lg font-black font-mono">{formatCurrency(assignedVehicle.dailyRentalCost)}</p>
                        </div>
                      )}
                      <Button asChild variant="outline" size="sm" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                        <Link href={`/flotillav2/vehiculos/${assignedVehicle.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-2" /> Ver Perfil del Vehículo
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Car className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Sin vehículo asignado</p>
                      <p className="text-zinc-400 text-xs mt-1">Asigna un vehículo desde la pestaña Vehículos.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Generator */}
              <ContractGeneratorCard driver={driver} vehicle={assignedVehicle} onEdit={() => setIsFinancialDialogOpen(true)} />
            </div>
          </div>
        </TabsContent>

        {/* ── HISTORY TAB */}
        <TabsContent value="history" className="mt-6">
          <HistoryTabContent driver={driver} vehicle={assignedVehicle} />
        </TabsContent>
      </Tabs>

      <EditContactInfoDialog
        open={isContactDialogOpen}
        onOpenChange={setIsContactDialogOpen}
        driver={driver}
        onSave={handleSaveContactInfo}
      />
      <EditFinancialInfoDialog
        open={isFinancialDialogOpen}
        onOpenChange={setIsFinancialDialogOpen}
        driver={driver}
        onSave={handleSaveFinancialInfo}
      />
      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onSave={handleSavePayment}
      />
      <AddManualChargeDialog
        open={isChargeDialogOpen}
        onOpenChange={setIsChargeDialogOpen}
        onSave={handleSaveCharge}
      />
    </div>
  );
}
