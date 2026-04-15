"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, ShieldAlert, Plus } from "lucide-react";
import { adminService } from "@/lib/services/admin.service";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { AppRole, User } from "@/types";
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin } from "@/lib/placeholder-data";
import { useRoles } from "@/lib/contexts/roles-context";

export function RolesContent() {
  const { toast } = useToast();
  // Roles desde contexto centralizado—sin listener propio
  const roles = useRoles();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const authString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authString) {
      try { setCurrentUser(JSON.parse(authString)); } 
      catch { setCurrentUser(defaultSuperAdmin); }
    } else {
      setCurrentUser(defaultSuperAdmin);
    }
  }, []);

  const openNewRoleDialog = () => {
    setEditingRole(null);
    setRoleName("");
    setSelectedPermissions([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: AppRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions || []);
    setIsDialogOpen(true);
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!currentUser) return;
    if (roleName === "Superadministrador") {
      toast({ title: "Acción Denegada", description: "No puedes eliminar el rol de Superadministrador.", variant: "destructive" });
      return;
    }
    try {
      await adminService.deleteRole(roleId, currentUser);
      toast({ title: "Rol Eliminado", description: `El rol ${roleName} fue eliminado exitosamente.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSaveRole = async () => {
    if (!currentUser) return;
    if (!roleName.trim()) {
      toast({ title: "Faltan datos", description: "El nombre del rol es obligatorio.", variant: "destructive" });
      return;
    }
    if (editingRole?.name === "Superadministrador") {
      toast({ title: "Acción Denegada", description: "No puedes editar el rol Base de Superadministrador.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingRole?.id) {
        await adminService.saveRole({ name: roleName.trim(), permissions: selectedPermissions }, currentUser, editingRole.id);
        toast({ title: "Rol Actualizado", description: "Los permisos fueron guardados." });
      } else {
        await adminService.saveRole({ name: roleName.trim(), permissions: selectedPermissions }, currentUser);
        toast({ title: "Rol Creado", description: "El nuevo rol está listo para ser asignado." });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom direction-normal duration-500 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Roles y Permisos</h2>
          <p className="text-muted-foreground mt-1">Crea roles a medida y controla qué módulos pueden ver y utilizar tus empleados.</p>
        </div>
        <Button onClick={openNewRoleDialog}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Rol
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <Card key={role.id} className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{role.name}</CardTitle>
                <div className="flex gap-1">
                  {role.name !== "Superadministrador" && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(role)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      triggerButton={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title={`¿Eliminar el rol "${role.name}"?`}
                      description="Esta acción no se puede deshacer. Los usuarios con este rol asignado quedarán sin permisos hasta que se les asigne uno nuevo."
                      onConfirm={() => { if (role.id) handleDeleteRole(role.id, role.name); }}
                    />
                  </>
                 )}
                </div>
              </div>
              <CardDescription>{role.permissions?.length || 0} Permisos asignados</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 h-48 overflow-y-auto">
              {role.name === "Superadministrador" ? (
                  <div className="flex flex-col items-center justify-center text-center h-full text-muted-foreground">
                      <ShieldAlert className="h-8 w-8 text-yellow-500 mb-2" />
                      <p className="text-sm">Acceso total e irrestricto al sistema. No modificable.</p>
                  </div>
              ) : (
                <ul className="space-y-1">
                  {role.permissions?.map(permId => {
                    const found = PERMISSION_GROUPS.flatMap(g => g.permissions).find(p => p.id === permId);
                    return (
                      <li key={permId} className="text-sm flex items-start text-muted-foreground">
                        <span className="mr-2 mt-1 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                        <span className="line-clamp-1">{found ? found.label : permId}</span>
                      </li>
                    );
                  })}
                  {(!role.permissions || role.permissions.length === 0) && (
                      <p className="text-sm text-muted-foreground italic text-center w-full">Sin permisos activos</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
            <DialogTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</DialogTitle>
            <DialogDescription>
              Ajusta los permisos detalladamente para controlar lo que este rol puede y no puede hacer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nombre del Rol</Label>
              <Input 
                id="roleName" 
                placeholder="Ej. Técnico Avanzado, Recepcionista, etc." 
                value={roleName} 
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            
            <div>
              <Label className="mb-4 block text-base border-b pb-2">Matriz de Permisos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.groupName} className="space-y-3 bg-card border rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-foreground mb-3">{group.groupName}</h4>
                    {group.permissions.map((perm) => (
                      <div key={perm.id} className="flex items-start space-x-3">
                        <Checkbox 
                          id={`perm-${perm.id}`} 
                          checked={selectedPermissions.includes(perm.id)}
                          onCheckedChange={() => handleTogglePermission(perm.id)}
                          className="mt-0.5"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label 
                            htmlFor={`perm-${perm.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {perm.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
