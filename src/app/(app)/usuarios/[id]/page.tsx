// src/app/(app)/usuarios/[id]/page.tsx
"use client";

/**
 * /usuarios/[id] — User detail / editor page
 * 
 * Reuses the exact UserForm component from personal-old but:
 * - Routes back to /usuarios instead of /personal?tab=usuarios
 * - Is the canonical location for system user management
 */

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { adminService } from "@/lib/services";
import type { User as AppUser, AppRole } from "@/types";
import type { UserFormValues } from "@/schemas/user-form-schema";
import { useToast } from "@/hooks/use-toast";
import { syncFirebaseAuthUser } from "@/app/(app)/usuarios/actions";
import { Loader2, ArrowLeft, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import dynamic from "next/dynamic";
import Link from "next/link";

const UserForm = dynamic(
  () => import("@/app/(app)/usuarios/components/user-form").then((m) => ({ default: m.UserForm })),
  { ssr: false, loading: () => <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);

export default function UsuarioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const idParam = decodeURIComponent((params?.id as string) ?? "");
  const isNew = idParam === "nuevo";

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [allRoles, setAllRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authStr = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authStr) { try { setCurrentUser(JSON.parse(authStr)); } catch { /* ignore */ } }

    const unsubs: (() => void)[] = [];

    unsubs.push(adminService.onRolesUpdate((roles) => { setAllRoles(roles); }));

    if (!isNew && idParam) {
      unsubs.push(adminService.onUsersUpdate((users) => {
        const found = users.find((u) => u.id === idParam);
        if (found) setTargetUser(found);
        setIsLoading(false);
      }));
    } else {
      setTargetUser(null);
      setIsLoading(false);
    }

    return () => unsubs.forEach((u) => u());
  }, [idParam, isNew]);

  const assignableRoles = useMemo(() => {
    if (currentUser?.role === "Superadministrador") return allRoles;
    if (currentUser?.role === "Admin") return allRoles.filter((r) => r.name !== "Superadministrador");
    return [];
  }, [currentUser, allRoles]);

  const onSubmit = async (values: UserFormValues) => {
    if (!currentUser) return;
    try {
      const authUserId = await syncFirebaseAuthUser({
        id: isNew ? undefined : targetUser?.id,
        email: values.email,
        name: values.name,
        password: values.password,
      });

      const userData: Partial<AppUser> & { password?: string; _isNew?: boolean } = {
        id: targetUser?.id || authUserId,
        role: values.role,
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
        isArchived: values.isArchived ?? false,
        functions: values.functions ?? [],
        monthlySalary: values.monthlySalary,
        commissionRate: values.commissionRate,
        hireDate: values.hireDate ? values.hireDate.toISOString() : undefined,
        signatureDataUrl: values.signatureDataUrl,
        _isNew: isNew,
      };

      await adminService.saveUser(userData as any, currentUser);
      toast({ title: `Usuario ${isNew ? "creado" : "actualizado"}` });
      router.push("/usuarios");
    } catch (error: any) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    }
  };

  const handleArchive = async (archive: boolean) => {
    if (!currentUser || !targetUser?.id) return;
    try {
      await adminService.archiveUser(targetUser.id, archive, currentUser);
      toast({ title: archive ? "Usuario archivado" : "Usuario restaurado" });
      router.push("/usuarios");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <Link href="/usuarios" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Volver a Usuarios
        </Link>
        <h1 className="text-2xl font-black">{isNew ? "Nuevo Usuario" : "Editar Usuario"}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isNew ? "Crea un nuevo acceso al sistema." : "Ajusta los permisos y rol del usuario."}
        </p>
      </div>

      {/* Archive actions */}
      {!isNew && targetUser && (
        <div className="flex justify-between items-center">
          <Button variant={targetUser.isArchived ? "secondary" : "outline-solid"} onClick={() => handleArchive(!targetUser.isArchived)}>
            {targetUser.isArchived ? <><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</> : <><Archive className="mr-2 h-4 w-4" />Archivar</>}
          </Button>
          <Button type="submit" form="user-detail-form">Guardar Cambios</Button>
        </div>
      )}
      {isNew && (
        <div className="flex justify-end">
          <Button type="submit" form="user-detail-form">Crear Usuario</Button>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border rounded-2xl shadow-xs p-6 md:p-8">
        <UserForm
          id="user-detail-form"
          initialData={targetUser}
          roles={assignableRoles}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
