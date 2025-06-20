
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { AppRole } from '@/types'; // Assuming AppRole is defined in types
import { PlusCircle, Trash2, Edit, Search, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox

const ROLES_LOCALSTORAGE_KEY = 'appRoles';

// Define a more specific schema for the role form
const roleFormSchema = z.object({
  name: z.string().min(2, "El nombre del rol debe tener al menos 2 caracteres."),
  // Placeholder for permissions - in a real app, this would be more complex
  // For now, we'll manage permissions as an array of strings.
  // Example permissions for a workshop app:
  // view_dashboard, manage_services, manage_inventory, manage_users, manage_finances, etc.
  permissions: z.array(z.string()).optional(), 
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// Example permissions - these would likely come from a config or backend
const ALL_AVAILABLE_PERMISSIONS = [
    { id: 'dashboard:view', label: 'Ver Panel Principal' },
    { id: 'services:create', label: 'Crear Servicios' },
    { id: 'services:edit', label: 'Editar Servicios' },
    { id: 'services:view_history', label: 'Ver Historial de Servicios' },
    { id: 'inventory:manage', label: 'Gestionar Inventario (Productos, Cat, Prov)' },
    { id: 'inventory:view', label: 'Ver Inventario' },
    { id: 'pos:create_sale', label: 'Registrar Ventas (POS)' },
    { id: 'pos:view_sales', label: 'Ver Registro de Ventas' },
    { id: 'finances:view_report', label: 'Ver Reporte Financiero' },
    { id: 'technicians:manage', label: 'Gestionar Técnicos' },
    { id: 'vehicles:manage', label: 'Gestionar Vehículos' },
    { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
    { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
    { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
];


export default function RolesPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', permissions: [] },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRolesString = localStorage.getItem(ROLES_LOCALSTORAGE_KEY);
      const loadedRoles: AppRole[] = storedRolesString ? JSON.parse(storedRolesString) : [];
      setRoles(loadedRoles);
    }
  }, []);

  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      role.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  const handleOpenForm = (roleToEdit?: AppRole) => {
    if (roleToEdit) {
      setEditingRole(roleToEdit);
      form.reset({
        name: roleToEdit.name,
        permissions: roleToEdit.permissions || [],
      });
    } else {
      setEditingRole(null);
      form.reset({ name: '', permissions: [] });
    }
    setIsFormOpen(true);
  };

  const onSubmit = (data: RoleFormValues) => {
    let updatedRoles: AppRole[];
    if (editingRole) {
      updatedRoles = roles.map(r => r.id === editingRole.id ? { ...editingRole, ...data } : r);
      toast({ title: 'Rol Actualizado', description: `El rol ${data.name} ha sido actualizado.` });
    } else {
      const newRole: AppRole = {
        id: `role_${Date.now()}`,
        ...data,
        permissions: data.permissions || [],
      };
      updatedRoles = [...roles, newRole];
      toast({ title: 'Rol Creado', description: `El rol ${data.name} ha sido creado.` });
    }
    setRoles(updatedRoles);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROLES_LOCALSTORAGE_KEY, JSON.stringify(updatedRoles));
    }
    setIsFormOpen(false);
  };

  const handleDeleteRole = (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    // Add check: prevent deletion if role is in use by users (more complex, skip for now)
    const updatedRoles = roles.filter(r => r.id !== roleId);
    setRoles(updatedRoles);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROLES_LOCALSTORAGE_KEY, JSON.stringify(updatedRoles));
    }
    toast({ title: 'Rol Eliminado', description: `El rol "${roleToDelete?.name}" ha sido eliminado.` });
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Gestión de Roles y Permisos"
        description="Crea y administra roles de usuario y sus permisos asociados."
        actions={
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Rol
          </Button>
        }
      />

       <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre de rol..."
              className="w-full rounded-lg bg-background pl-8 md:w-1/3 lg:w-1/4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Roles</CardTitle>
          <CardDescription>Roles definidos en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRoles.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Rol</TableHead>
                  <TableHead>Permisos Asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-xs">
                        {role.permissions && role.permissions.length > 0 
                           ? role.permissions.map(pId => ALL_AVAILABLE_PERMISSIONS.find(ap => ap.id === pId)?.label || pId).join(', ') 
                           : 'Ninguno'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(role)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={role.name === 'Superadmin' || role.name === 'Admin'}> {/* Basic protection */}
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar Rol?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres eliminar el rol "{role.name}"? Esta acción no se puede deshacer. Asegúrate de que ningún usuario esté asignado a este rol.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRole(role.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Sí, Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {searchTerm ? "No se encontraron roles." : "No hay roles definidos."}
            </p>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Rol</FormLabel>
                      <FormControl><Input {...field} placeholder="Ej: Cajero, Mecánico Jefe" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permisos</FormLabel>
                      <CardDescription>Selecciona los permisos para este rol.</CardDescription>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto border p-4 rounded-md">
                        {ALL_AVAILABLE_PERMISSIONS.map((permission) => (
                          <FormField
                            key={permission.id}
                            control={form.control}
                            name="permissions"
                            render={({ field: permissionField }) => {
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={permissionField.value?.includes(permission.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? permissionField.onChange([...(permissionField.value || []), permission.id])
                                          : permissionField.onChange(
                                            (permissionField.value || []).filter(
                                                (value) => value !== permission.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {permission.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando...' : (editingRole ? 'Actualizar Rol' : 'Crear Rol')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
