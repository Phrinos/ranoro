// src/app/(app)/flotilla/conductores/[id]/page.tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { withSuspense } from "@/lib/withSuspense";
import {
  ArrowLeft, Archive, ArchiveRestore, Loader2, User, Phone,
  Home, AlertTriangle, Car, DollarSign, FileText, ExternalLink,
  Edit, History, LayoutDashboard, HandCoins, PlusCircle,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency, capitalizeWords } from "@/lib/utils";
import { personnelService } from "@/lib/services";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { useFleetData } from "../../hooks/use-fleet-data";
import { DriverStatement } from "../../components/driver-statement";
import { EditDriverDialog, type EditDriverFormValues } from "../../components/dialogs/edit-driver-dialog";
import { PaymentDialog, type PaymentFormValues } from "../../components/dialogs/payment-dialog";
import { ChargeDialog, type ChargeFormValues } from "../../components/dialogs/charge-dialog";
import { rentalService } from "@/lib/services/rental.service";

function DriverProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);

  const fleetData = useFleetData();
  const driver = fleetData.drivers.find(d => d.id === driverId) ?? null;
  const vehicle = driver ? fleetData.getDriverVehicle(driver.id) : null;

  const canManage = permissions.has("fleet:manage_rentals");

  if (fleetData.isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  if (!driver) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Conductor no encontrado.</p>
        <Button variant="outline" onClick={() => router.push("/flotilla?tab=conductores")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const isInactive = driver.isArchived;
  const statusLabel = isInactive ? "Inactivo" : vehicle ? "Activo" : "Disponible";

  const handleSaveEdit = async (values: EditDriverFormValues) => {
    await personnelService.saveDriver({
      ...values,
      contractDate: values.contractDate ? new Date(values.contractDate).toISOString() : undefined,
    }, driver.id);
    toast({ title: "Conductor actualizado" });
    setEditOpen(false);
  };

  const handleArchiveToggle = async () => {
    await personnelService.saveDriver({ isArchived: !driver.isArchived }, driver.id);
    toast({ title: driver.isArchived ? "Conductor restaurado" : "Conductor dado de baja" });
  };

  const handlePaymentSave = async (values: PaymentFormValues) => {
    if (!vehicle) { toast({ title: "Sin vehículo asignado", variant: "destructive" }); return; }
    await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note ?? "", values.paymentDate, values.paymentMethod as any);
    toast({ title: "✅ Abono Registrado" });
    setPaymentOpen(false);
  };

  const handleChargeSave = async (values: ChargeFormValues) => {
    await personnelService.saveManualDebt(driver.id, { date: new Date(values.date).toISOString(), amount: values.amount, note: values.note });
    toast({ title: "✅ Cargo Registrado" });
    setChargeOpen(false);
  };

  const contractDate = driver.contractDate ? new Date(driver.contractDate) : null;

  return (
    <div className="space-y-6">
      {/* ── Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-5 sm:p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0",
            isInactive ? "bg-zinc-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
          )}>
            {driver.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{driver.name}</h1>
              <Badge className={cn("text-xs font-bold px-2.5 py-0.5 border-0",
                isInactive ? "bg-zinc-600 text-zinc-300"
                : vehicle ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 inline-block",
                  isInactive ? "bg-zinc-400" : vehicle ? "bg-emerald-500" : "bg-amber-500"
                )} />
                {statusLabel}
              </Badge>
            </div>
            <p className="text-zinc-400 text-sm">Perfil de Conductor · Flotilla</p>
            {driver.phone && <p className="text-zinc-300 text-sm mt-1 font-mono">{driver.phone}</p>}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {canManage && (
              <>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2" onClick={() => setPaymentOpen(true)}>
                  <HandCoins className="h-4 w-4" /> Abono
                </Button>
                <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white font-bold gap-2" onClick={() => setChargeOpen(true)}>
                  <PlusCircle className="h-4 w-4" /> Cargo
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/flotilla?tab=conductores")} className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:text-white">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
            </Button>
            <Button variant="ghost" size="sm" className="bg-white/5 border border-white/20 text-white hover:bg-white/15 hover:text-white" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              triggerButton={
                <Button size="sm" className="bg-white text-zinc-900 hover:bg-zinc-100 font-semibold border-0">
                  {driver.isArchived ? <ArchiveRestore className="mr-1.5 h-4 w-4" /> : <Archive className="mr-1.5 h-4 w-4" />}
                  {driver.isArchived ? "Restaurar" : "Dar de Baja"}
                </Button>
              }
              title={`¿${driver.isArchived ? "Restaurar" : "Archivar"} a ${driver.name}?`}
              description={driver.isArchived ? "El conductor volverá a estar activo." : "Se marcará como inactivo."}
              onConfirm={handleArchiveToggle}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border">
          <TabsTrigger value="overview" className="rounded-xl gap-2">
            <LayoutDashboard className="h-3.5 w-3.5" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl gap-2">
            <History className="h-3.5 w-3.5" /> Estado de Cuenta
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Contact info */}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
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

              {/* Financial info */}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
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
            </div>

            {/* Right: vehicle + contract */}
            <div className="space-y-5">
              {/* Vehicle card */}
              <div className={cn("relative rounded-2xl overflow-hidden border shadow-sm",
                vehicle ? "border-indigo-200/60 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900" : "border-zinc-200 bg-zinc-50"
              )}>
                {vehicle && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />}
                <div className="relative p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", vehicle ? "bg-white/20" : "bg-zinc-200")}>
                      <Car className={cn("h-4 w-4", vehicle ? "text-white" : "text-zinc-500")} />
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-sm", vehicle ? "text-white" : "text-zinc-700")}>Vehículo Vinculado</h3>
                      <p className={cn("text-xs", vehicle ? "text-indigo-300" : "text-zinc-400")}>Unidad asignada actualmente.</p>
                    </div>
                  </div>
                  {vehicle ? (
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-xl p-4"><p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Placa</p><p className="text-white text-2xl font-black font-mono tracking-wider">{vehicle.licensePlate}</p></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/10 rounded-xl p-3"><p className="text-white/60 text-[10px] uppercase mb-1">Marca</p><p className="text-white text-sm font-semibold">{vehicle.make}</p></div>
                        <div className="bg-white/10 rounded-xl p-3"><p className="text-white/60 text-[10px] uppercase mb-1">Año</p><p className="text-white text-sm font-semibold">{vehicle.year}</p></div>
                      </div>
                      {vehicle.dailyRentalCost && (
                        <div className="bg-emerald-500/20 rounded-xl p-3 border border-emerald-500/30"><p className="text-emerald-300 text-[10px] uppercase mb-1">Renta Diaria</p><p className="text-emerald-100 text-lg font-black font-mono">{formatCurrency(vehicle.dailyRentalCost)}</p></div>
                      )}
                      <Button asChild variant="outline" size="sm" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                        <Link href={`/flotilla/vehiculos/${vehicle.id}`}><ExternalLink className="h-3.5 w-3.5 mr-2" /> Ver Perfil del Vehículo</Link>
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
            </div>
          </div>
        </TabsContent>

        {/* Statement of account */}
        <TabsContent value="history" className="mt-6">
          <DriverStatement driver={driver} vehicle={vehicle} fleetData={fleetData} canManage={canManage} />
        </TabsContent>
      </Tabs>

      <EditDriverDialog open={editOpen} onOpenChange={setEditOpen} driver={driver} onSave={handleSaveEdit} />
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} onSave={handlePaymentSave} preselectedDriverId={driver.id} />
      <ChargeDialog open={chargeOpen} onOpenChange={setChargeOpen} onSave={handleChargeSave} preselectedDriverId={driver.id} />
    </div>
  );
}

export default withSuspense(DriverProfilePage);
