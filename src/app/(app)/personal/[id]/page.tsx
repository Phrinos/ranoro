// src/app/(app)/personal/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { useStaffData } from "../hooks/use-staff-data";
import { DocumentsTab } from "@/components/shared/documents-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, User, Phone, Mail, Calendar,
  DollarSign, Percent, FileText, LayoutDashboard,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";

const ROLE_COLORS: Record<string, string> = {
  Superadministrador: "bg-purple-100 text-purple-800 border-purple-300",
  Administrador: "bg-blue-100 text-blue-800 border-blue-300",
  Asesor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Técnico: "bg-amber-100 text-amber-800 border-amber-300",
  Recepcionista: "bg-pink-100 text-pink-800 border-pink-300",
};

function StaffProfilePage() {
  const params = useParams();
  const memberId = params.id as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const { staff, archivedStaff } = useStaffData();
  const allStaff = [...staff, ...archivedStaff];
  const member = allStaff.find((s) => s.id === memberId) ?? null;

  if (!member && staff.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Miembro del equipo no encontrado.</p>
        <Button variant="outline" onClick={() => router.push("/personal")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const hireDate = member.hireDate ? new Date(member.hireDate) : null;

  const infoItems = [
    { icon: User, label: "Nombre", value: member.name },
    { icon: Phone, label: "Teléfono", value: member.phone },
    { icon: Mail, label: "Email", value: member.email },
    { icon: Calendar, label: "Fecha de Contratación", value: hireDate && isValid(hireDate) ? format(hireDate, "dd 'de' MMMM, yyyy", { locale: es }) : null },
    { icon: DollarSign, label: "Salario Mensual", value: member.monthlySalary ? formatCurrency(member.monthlySalary) : null },
    { icon: Percent, label: "Comisión", value: member.commissionRate != null ? `${member.commissionRate}%` : null },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-5 sm:p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight">{member.name}</h1>
              <Badge className={cn("text-xs font-bold px-2.5 py-1 border", ROLE_COLORS[member.role] ?? "bg-zinc-600 text-white border-0")}>
                {member.role}
              </Badge>
              {member.isArchived && (
                <Badge className="text-xs bg-zinc-600 text-zinc-300 border-0">Inactivo</Badge>
              )}
            </div>
            <p className="text-zinc-400 text-sm">Perfil de Empleado · Personal</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/personal")}
            className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:text-white shrink-0"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border">
          <TabsTrigger value="overview" className="rounded-xl gap-2">
            <LayoutDashboard className="h-3.5 w-3.5" /> Información
          </TabsTrigger>
          <TabsTrigger value="docs" className="rounded-xl gap-2">
            <FileText className="h-3.5 w-3.5" /> Documentos
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {infoItems.map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-800">{value}</span>
                  </div>
                ) : null)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="docs" className="mt-6">
          <DocumentsTab
            context="staff"
            person={{
              name: member.name,
              phone: member.phone,
              role: member.role,
              hireDate: member.hireDate,
              monthlySalary: member.monthlySalary,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withSuspense(StaffProfilePage);
