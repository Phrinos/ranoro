
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User, AppRole } from '@/types';
import { PlusCircle, Trash2, Edit, Search, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capitalizeWords } from '@/lib/utils';
import { adminService } from '@/lib/services/admin.service';

const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string({ required_error: "Seleccione un rol." }).min(1, "Debe seleccionar un rol."),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UsuariosPageContent({ currentUser, initialUsers, initialRoles }: { currentUser: User | null, initialUsers: User[], initialRoles: AppRole[] }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>(initialRoles);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const formCardRef = useRef<HTMLDivElement>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: '', email: '', phone: '', role: 'Tecnico' },
  });

  useEffect(() => {
    setUsers(initialUsers);
    setAvailableRoles(initialRoles);
  }, [initialUsers, initialRoles]);
  
  useEffect(() => {
    if (isFormOpen && formCardRef.current) {
        formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isFormOpen]);
  
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);
  
  const canEditOrDelete = (user: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Superadministrador') return user.id !== currentUser.id;
    if (currentUser.role === 'Admin') return user.role !== 'Superadministrador' && user.id !== currentUser.id;
    return false;
  };
  
  const assignableRoles = useMemo(() => {
    if (currentUser?.role === 'Superadministrador') return availableRoles;
    if (currentUser?.role === 'Admin') return availableRoles.filter(r => r.name !== 'Superadministrador');
    return [];
  }, [currentUser, availableRoles]);

  const handleOpenForm = useCallback((userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        phone: userToEdit.phone || '',
        role: userToEdit.role,
      });
    } else {
      setEditingUser(null);
      form.reset({ name: '', email: '', phone: '', role: 'Tecnico' });
    }
    setIsFormOpen(true);
  }, [form]);

  const onSubmit = async (data: UserFormValues) => {
    if (!currentUser) return;
    const isEditing = !!editingUser;
    
    const userData: Partial<User> = {
        id: editingUser?.id, // Pass ID for update, will be undefined for create
        ...data,
    };
    
    try {
        await adminService.saveUser(userData, currentUser);
        
        toast({ title: `Usuario ${isEditing ? 'actualizado' : 'creado'}` });
        setIsFormOpen(false);
        // The parent will refetch data, causing this component to re-render
        window.dispatchEvent(new CustomEvent('databaseUpdated'));
    } catch (error: any) {
        toast({ title: "Error al guardar", description: error.message, variant: 'destructive'});
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!currentUser) return;
    try {
        await adminService.deleteUser(userId, currentUser);
        toast({ title: "Usuario eliminado." });
        window.dispatchEvent(new CustomEvent('databaseUpdated'));
    } catch (error: any) {
        toast({ title: "Error al eliminar", description: error.message, variant: 'destructive'});
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Lista de Usuarios</h2>
                <p className="text-muted-foreground">Usuarios registrados en el sistema.</p>
            </div>
            <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Usuario
            </Button>
        </div>
        
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre o email..."
              className="w-full rounded-lg bg-background pl-8 md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <Card>
            <CardContent className="pt-6">
                {filteredUsers.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-black">
                      <TableRow><TableHead className="text-white">Nombre</TableHead><TableHead className="text-white">Email</TableHead><TableHead className="text-white">Teléfono</TableHead><TableHead className="text-white">Rol</TableHead><TableHead className="text-right text-white">Acciones</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.phone || 'N/A'}</TableCell>
                          <TableCell><span className={`px-2 py-1 text-xs rounded-full font-medium ${ user.role === 'Superadministrador' ? 'bg-red-100 text-red-700' : user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>{user.role}</span></TableCell>
                          <TableCell className="text-right">
                            {canEditOrDelete(user) && ( <> <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)} className="mr-2"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle><AlertDialogDescription>¿Seguro que quieres eliminar a "{user.name}"? Esta acción es permanente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Users className="h-12 w-12 mb-2" /><h3 className="text-lg font-semibold text-foreground">No se encontraron usuarios</h3><p className="text-sm">Intente cambiar su búsqueda o agregue un nuevo usuario.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {isFormOpen && (
            <Card className="mt-8" ref={formCardRef}>
                <CardHeader><CardTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</CardTitle><CardDescription>{editingUser ? `Para cambiar la contraseña, debe hacerse directamente en Firebase Authentication por seguridad.` : 'La contraseña se establecerá en la consola de Firebase después de crear el usuario.'}</CardDescription></CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Nombre completo" {...field} onChange={e => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} disabled={!!editingUser} /></FormControl><FormDescription>El email se usará para iniciar sesión y no se puede cambiar después de la creación.</FormDescription><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input placeholder="4491234567" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Rol</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl><SelectContent>{assignableRoles.map(role => ( <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                                <Button type="submit">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
