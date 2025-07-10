
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppRole } from '@/types';
import { PlusCircle, Trash2, Edit, Search, Shield } from 'lucide-react';
import { placeholderAppRoles, persistToFirestore } from '@/lib/placeholder-data';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL_AVAILABLE_PERMISSIONS = [
    { id: 'dashboard:view', label: 'Ver Panel Principal' },
    { id: 'services:create', label: 'Crear Servicios/Cotizaciones' },
    { id: 'services:edit', label: 'Editar Servicios' },
    { id: 'services:view_history', label: 'Ver Historial de Servicios' },
    { id: 'inventory:manage', label: 'Gestionar Inventario (Añadir/Editar/Borrar)' },
    { id: 'inventory:view', label: 'Ver Inventario' },
    { id: 'pos:create_sale', label: 'Registrar Ventas (POS)' },
    { id: 'pos:view_sales', label: 'Ver Registro de Ventas' },
    { id: 'finances:view_report', label: 'Ver Reporte Financiero' },
    { id: 'technicians:manage', label: 'Gestionar Personal (Técnicos/Admin)' },
    { id: 'vehicles:manage', label: 'Gestionar Vehículos' },
    { id: 'fleet:manage', label: 'Gestionar Flotilla (Vehículos y Conductores)' },
    { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
    { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
    { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
    { id: 'audits:view', label: 'Ver Auditoría de Acciones (Admin)' },
];

const roleFormSchema = z.object({
  name: z.string().min(2, "El nombre del rol debe tener al menos 2 caracteres."),
  permissions: z.array(z.string()).optional(), 
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

export function RolesPageContent() {
    const { toast } = useToast();
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [editingRole, setEditingRole] = useState<AppRole | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const formCardRef = useRef<HTMLDivElement>(null);
    
    const form = useForm<RoleFormValues>({ 
      resolver: zodResolver(roleFormSchema), 
      defaultValues: { name: '', permissions: [] } 
    });

    useEffect(() => { setRoles(placeholderAppRoles); }, []);
    
    useEffect(() => { 
        if (isFormOpen && formCardRef.current) {
            formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        }
    }, [isFormOpen]);
    
    const filteredRoles = useMemo(() => roles.filter(role => role.name.toLowerCase().includes(searchTerm.toLowerCase())), [roles, searchTerm]);
    
    const handleOpenForm = (roleToEdit?: AppRole) => {
        if (roleToEdit) {
            setEditingRole(roleToEdit);
            form.reset({ name: roleToEdit.name, permissions: roleToEdit.permissions });
        } else {
            setEditingRole(null);
            form.reset({ name: '', permissions: [] });
        }
        setIsFormOpen(true);
    };
    
    const onSubmit = async (data: RoleFormValues) => {
        const isNew = !editingRole;
        const newRole: AppRole = {
            id: isNew ? `role_${Date.now()}` : editingRole!.id,
            name: data.name,
            permissions: data.permissions || [],
        };
        
        if (isNew) {
            placeholderAppRoles.push(newRole);
        } else {
            const index = placeholderAppRoles.findIndex(r => r.id === newRole.id);
            if (index > -1) placeholderAppRoles[index] = newRole;
        }

        await persistToFirestore(['appRoles']);
        setRoles([...placeholderAppRoles]);
        toast({ title: `Rol ${isNew ? 'creado' : 'actualizado'} con éxito.` });
        setIsFormOpen(false);
    };
    
    const handleDeleteRole = async (roleId: string) => {
        const index = placeholderAppRoles.findIndex(r => r.id === roleId);
        if (index > -1) {
            placeholderAppRoles.splice(index, 1);
            await persistToFirestore(['appRoles']);
            setRoles([...placeholderAppRoles]);
            toast({ title: 'Rol eliminado.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Lista de Roles</h2>
                    <p className="text-muted-foreground">Roles definidos en el sistema.</p>
                </div>
                <Button onClick={() => handleOpenForm()}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Rol</Button>
            </div>
            
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nombre de rol..."
                    className="w-full rounded-lg bg-background pl-8 md:w-1/2 lg:w-1/3"
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
                                    <TableRow>
                                        <TableHead className="text-white">Nombre del Rol</TableHead>
                                        <TableHead className="text-white">Permisos</TableHead>
                                        <TableHead className="text-right text-white">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRoles.map(role => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{role.permissions.length} permisos activos</TableCell>
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
                    <CardHeader><CardTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</CardTitle></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre del Rol</FormLabel><FormControl><Input placeholder="Ej: Recepcionista" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="permissions" render={() => (
                                    <FormItem>
                                        <FormLabel>Permisos</FormLabel>
                                        <Card>
                                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                {ALL_AVAILABLE_PERMISSIONS.map((permission) => (
                                                    <FormField key={permission.id} control={form.control} name="permissions" render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
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
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{permission.label}</FormLabel>
                                                        </FormItem>
                                                    )}/>
                                                ))}
                                            </CardContent>
                                        </Card>
                                        <FormDescription>Seleccione los permisos para este rol.</FormDescription>
                                    </FormItem>
                                )}/>
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
    );
}
