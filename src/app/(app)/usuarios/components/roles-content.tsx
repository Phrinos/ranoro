// src/app/(app)/usuarios/components/roles-content.tsx
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import type { User, AppRole } from '@/types';
import { adminService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, ShieldAlert, Lock } from 'lucide-react';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

interface RolesPageContentProps {
  currentUser: User | null;
  initialRoles: AppRole[];
}

type PermGroup = { group: string; permissions: typeof ALL_PERMISSIONS };

const PERMISSION_GROUPS = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
  const [group] = p.id.split(':');
  if (!acc[group]) acc[group] = [];
  acc[group].push(p);
  return acc;
}, {});

const PERM_GROUPS_LIST: PermGroup[] = Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => ({
  group,
  permissions,
}));

export function RolesPageContent({ currentUser, initialRoles }: RolesPageContentProps) {
  const { toast } = useToast();
  const permissions = usePermissions();
  const hasPermission = (id: string) => permissions.has(id);
  const isSuperAdmin = currentUser?.role === 'Superadministrador';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<AppRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPerms(new Set());
    setIsDialogOpen(true);
  };

  const openEdit = (role: AppRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPerms(new Set(role.permissions));
    setIsDialogOpen(true);
  };

  const togglePerm = (id: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!roleName.trim()) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    setIsSaving(true);
    try {
      const roleData: Partial<AppRole> = {
        id: editingRole?.id,
        name: roleName.trim(),
        permissions: Array.from(selectedPerms),
      };
      await adminService.saveRole(roleData as any, currentUser!);
      toast({ title: editingRole ? 'Rol actualizado' : 'Rol creado' });
      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await adminService.deleteRole(deleteConfirm.id, currentUser!);
      toast({ title: 'Rol eliminado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Roles y Permisos</h2>
          <p className="text-sm text-muted-foreground">Configura qué puede hacer cada rol en el sistema.</p>
        </div>
        {isSuperAdmin && (
          <Button size="sm" onClick={openNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Rol
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialRoles.map(role => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  {role.name}
                </CardTitle>
                {isSuperAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(role)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(role)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription>{role.permissions.length} permiso(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 6).map(p => (
                  <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                ))}
                {role.permissions.length > 6 && (
                  <Badge variant="outline" className="text-[10px]">+{role.permissions.length - 6} más</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? `Editar: ${editingRole.name}` : 'Nuevo Rol'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="role-name">Nombre del Rol</Label>
              <Input id="role-name" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Ej: Supervisor de Taller" className="mt-1" />
            </div>
            <div className="space-y-4">
              <Label>Permisos</Label>
              {PERM_GROUPS_LIST.map(({ group, permissions }) => (
                <div key={group} className="border rounded-lg p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{group}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {permissions.map(p => (
                      <label key={p.id} className={cn("flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors", (p as any).restricted && "border border-destructive/30 bg-destructive/5")}>
                        <Checkbox
                          checked={selectedPerms.has(p.id)}
                          onCheckedChange={() => togglePerm(p.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{p.label}</span>
                            {(p as any).restricted && <Lock className="h-3 w-3 text-destructive shrink-0" />}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{p.id}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Rol'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Eliminar Rol"
        description={`¿Estás seguro de eliminar el rol "${deleteConfirm?.name}"? Los usuarios con este rol podrían perder acceso.`}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  );
}
