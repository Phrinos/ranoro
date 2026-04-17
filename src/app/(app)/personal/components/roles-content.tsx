// src/app/(app)/personal/components/roles-content.tsx

"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppRole, User } from '@/types';
import { PlusCircle, Trash2, Edit, Search, Shield, AlertTriangle, Lock, Info } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminService } from '@/lib/services';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';

const roleFormSchema = z.object({
  name: z.string().min(2, "El nombre del rol debe tener al menos 2 caracteres."),
  permissions: z.array(z.string()).optional(),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

// Permission IDs enforced at UI-level as Superadmin-only
const SUPERADMIN_ONLY_IDS = new Set([
  'inventory:delete',
  'inventory:manage_categories',
  'services:delete',
  'vehicles:delete',
  'pos:delete_sale',
  'purchases:delete',
  'fleet:delete',
  'fleet:delete_rentals',
  'finances:delete_entries',
  'admin:manage_users_roles',
  'admin:view_audit',
  'admin:settings',
]);

// Permissions requiring extra caution
const HIGH_RISK_IDS = new Set([
  'finances:manage_manual_entries',
  'finances:view',
  'billing:manage',
  'fleet:manage_rentals',
  'reports:view_payroll',
  'inventory:view_costs',
  'services:view_profits',
]);

function PermissionBadge({ permissionId }: { permissionId: string }) {
  if (SUPERADMIN_ONLY_IDS.has(permissionId)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 cursor-help leading-none">
            <Lock className="h-2.5 w-2.5" /> Solo Superadmin
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          Esta acción está protegida en la interfaz y solo puede ser ejercida por un Superadministrador, independientemente de los permisos del rol.
        </TooltipContent>
      </Tooltip>
    );
  }
  if (HIGH_RISK_IDS.has(permissionId)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 cursor-help leading-none">
            <AlertTriangle className="h-2.5 w-2.5" /> Alto impacto
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          Permiso de alto impacto financiero. Asigna únicamente a roles de confianza.
        </TooltipContent>
      </Tooltip>
    );
  }
  return null;
}

export function RolesPageContent({ currentUser, initialRoles }: { currentUser: User | null, initialRoles: AppRole[] }) {
  const { toast } = useToast();
  const roles = initialRoles;
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const formCardRef = useRef<HTMLDivElement>(null);
  const [sortOption, setSortOption] = useState('name_asc');

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', permissions: [] }
  });

  useEffect(() => {
    if (isFormOpen && formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isFormOpen]);

  const filteredRoles = useMemo(() => {
    const [key, direction] = sortOption.split('_');
    return roles
      .filter(role => role.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const valA = a[key as keyof AppRole] || '';
        const valB = b[key as keyof AppRole] || '';
        const comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
      });
  }, [roles, searchTerm, sortOption]);

  const handleOpenForm = useCallback((roleToEdit?: AppRole) => {
    if (roleToEdit) {
      setEditingRole(roleToEdit);
      form.reset({ name: roleToEdit.name, permissions: roleToEdit.permissions });
    } else {
      setEditingRole(null);
      form.reset({ name: '', permissions: [] });
    }
    setIsFormOpen(true);
  }, [form]);

  const onSubmit = async (data: RoleFormValues) => {
    if (!currentUser) return toast({ title: "No autenticado", variant: "destructive" });
    try {
      await adminService.saveRole({ ...data, permissions: data.permissions || [] }, currentUser, editingRole?.id);
      toast({ title: `Rol ${editingRole ? 'actualizado' : 'creado'} con éxito.` });
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error al guardar rol", description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!currentUser) return toast({ title: "No autenticado", variant: "destructive" });
    if (roleId === 'superadmin_role' || roleId === 'admin_role' || roleId === 'tech_role') {
      return toast({ title: "Rol protegido", description: "No se pueden eliminar los roles base.", variant: 'destructive' });
    }
    try {
      await adminService.deleteRole(roleId, currentUser);
      toast({ title: 'Rol eliminado.' });
    } catch (error: any) {
      toast({ title: 'Error al eliminar rol', description: error.message, variant: 'destructive' });
    }
  };

  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Lista de Roles</h2>
            <p className="text-muted-foreground">Roles definidos en el sistema y su matriz de permisos.</p>
          </div>
          <Button onClick={() => handleOpenForm()}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Rol</Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs border rounded-lg p-3 bg-muted/30">
          <span className="font-semibold text-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Leyenda:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-semibold">
            <Lock className="h-3 w-3" /> Solo Superadmin
          </span>
          <span className="text-muted-foreground">La UI limita esta acción al rol Superadministrador sin importar permisos.</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
            <AlertTriangle className="h-3 w-3" /> Alto impacto
          </span>
          <span className="text-muted-foreground">Permiso financiero de alto riesgo.</span>
          <code className="font-mono bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-600">modulo:accion</code>
          <span className="text-muted-foreground">Identificador técnico del permiso.</span>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre de rol..."
            className="w-full rounded-lg bg-card pl-8 md:w-1/2 lg:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            {filteredRoles.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-black">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHeader sortKey="name" label="Nombre del Rol" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                      <SortableTableHeader sortKey="permissions" label="Permisos" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                      <TableHead className="text-right text-white">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map(role => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <Badge variant="secondary">{role.permissions.length} permisos</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(role)} className="mr-2"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Shield className="h-12 w-12 mb-2" />
                <h3 className="text-lg font-semibold text-foreground">No se encontraron roles</h3>
                <p className="text-sm">Intente cambiar su búsqueda o agregue un nuevo rol.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isFormOpen && (
          <Card className="mt-8" ref={formCardRef}>
            <CardHeader>
              <CardTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</CardTitle>
              <CardDescription>
                Asigna un nombre y configura los permisos. Los marcados{' '}
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1 rounded bg-red-100 text-red-700 border border-red-200">
                  <Lock className="h-2.5 w-2.5" /> Solo Superadmin
                </span>{' '}
                están bloqueados en la UI independientemente de lo que selecciones aquí.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Rol</FormLabel>
                      <FormControl><Input placeholder="Ej: Recepcionista" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Matriz de Permisos</Label>
                    <Card>
                      <CardContent className="p-0">
                        <Accordion type="multiple" className="w-full" defaultValue={PERMISSION_GROUPS.map(g => g.groupName)}>
                          {PERMISSION_GROUPS.map((group) => {
                            const groupPermissionIds = group.permissions.map(p => p.id);
                            const selectedPermissions = form.watch('permissions') || [];
                            const selectedCount = groupPermissionIds.filter(id => selectedPermissions.includes(id)).length;
                            const areAllSelected = groupPermissionIds.every(id => selectedPermissions.includes(id));

                            const handleSelectAll = (checked: boolean) => {
                              const currentPermissions = form.getValues('permissions') || [];
                              let newPermissions: string[];
                              if (checked) {
                                newPermissions = [...new Set([...currentPermissions, ...groupPermissionIds])];
                              } else {
                                newPermissions = currentPermissions.filter(id => !groupPermissionIds.includes(id));
                              }
                              form.setValue('permissions', newPermissions, { shouldDirty: true });
                            };

                            return (
                              <AccordionItem value={group.groupName} key={group.groupName}>
                                <div className="flex items-center px-4 py-2 hover:bg-muted/50">
                                  <Checkbox
                                    id={`select-all-${group.groupName}`}
                                    checked={areAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    className="mr-4 shrink-0"
                                  />
                                  <AccordionTrigger className="w-full p-0 hover:no-underline">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-base">{group.groupName}</span>
                                      <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="text-xs">
                                        {selectedCount}/{group.permissions.length}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                </div>
                                <AccordionContent className="p-0 border-t">
                                  <div className="divide-y">
                                    {group.permissions.map((permission) => (
                                      <FormField key={permission.id} control={form.control} name="permissions" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 hover:bg-muted/20 transition-colors">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(permission.id)}
                                              onCheckedChange={(checked) => {
                                                const currentPermissions = field.value || [];
                                                const newPermissions = checked
                                                  ? [...currentPermissions, permission.id]
                                                  : currentPermissions.filter(value => value !== permission.id);
                                                return field.onChange(newPermissions);
                                              }}
                                              className="mt-0.5"
                                            />
                                          </FormControl>
                                          <div className="flex flex-col gap-1 leading-none min-w-0">
                                            <div className="flex items-center flex-wrap gap-1.5">
                                              <FormLabel className="font-medium text-sm cursor-pointer">{permission.label}</FormLabel>
                                              <PermissionBadge permissionId={permission.id} />
                                            </div>
                                            <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit border">
                                              {permission.id}
                                            </code>
                                          </div>
                                        </FormItem>
                                      )} />
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingRole ? 'Actualizar Rol' : 'Crear Rol'}</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
