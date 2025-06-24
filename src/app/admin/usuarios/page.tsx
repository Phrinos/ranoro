
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { User, AppRole } from '@/types';
import { PlusCircle, Trash2, Edit, Search, ShieldQuestion, ShieldAlert } from "lucide-react";
import { useRouter } from 'next/navigation';
import { placeholderUsers, defaultSuperAdmin, AUTH_USER_LOCALSTORAGE_KEY, placeholderAppRoles } from '@/lib/placeholder-data';


const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string({ required_error: "Seleccione un rol." }).min(1, "Debe seleccionar un rol."),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
    if (data.password && data.password.length > 0) {
        if (data.password.length < 6) return false;
        return data.password === data.confirmPassword;
    }
    return true;
}, {
  message: "Las contraseñas no coinciden o tienen menos de 6 caracteres.",
  path: ["confirmPassword"],
});


type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsuariosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: '', email: '', phone: '', role: 'Tecnico', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) setCurrentUser(JSON.parse(authUserString));

      // Set local state from the global, in-memory placeholderUsers array
      setUsers(placeholderUsers);
      setAvailableRoles(placeholderAppRoles);
    }
  }, []);

  const canEditOrDelete = (user: User): boolean => {
    if (!currentUser) return false;
    // Superadmin can edit anyone except themselves.
    if (currentUser.role === 'Superadmin') return user.id !== currentUser.id;
    // Admin can edit anyone except Superadmins and themselves.
    if (currentUser.role === 'Admin') return user.role !== 'Superadmin' && user.id !== currentUser.id;
    return false;
  };
  
  const canCreateUsers = (): boolean => {
     if (!currentUser) return false;
     return currentUser.role === 'Superadmin' || currentUser.role === 'Admin';
  };


  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleOpenForm = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        phone: userToEdit.phone || '',
        role: userToEdit.role,
        password: '',
        confirmPassword: '',
      });
    } else {
      setEditingUser(null);
      form.reset({ name: '', email: '', phone: '', role: 'Tecnico', password: '', confirmPassword: '' });
    }
    setIsFormOpen(true);
  };

  const onSubmit = (data: UserFormValues) => {
    if (editingUser) {
      if (!canEditOrDelete(editingUser)) {
        toast({ title: 'Acción no permitida', description: 'No tienes permisos para editar este usuario.', variant: 'destructive' });
        return;
      }
      const updatedUser = { ...editingUser, name: data.name, email: data.email, role: data.role, phone: data.phone || undefined };
      
      const userIndex = placeholderUsers.findIndex(u => u.id === editingUser.id);
      if (userIndex !== -1) {
        placeholderUsers[userIndex] = updatedUser;
      }
      setUsers([...placeholderUsers]);
      
      toast({ title: 'Usuario Actualizado', description: `El usuario ${data.name} ha sido actualizado.` });
    } else {
      if (!canCreateUsers()) {
        toast({ title: 'Acción no permitida', description: 'No tienes permisos para crear usuarios.', variant: 'destructive' });
        return;
      }
      if (!data.password) {
        form.setError("password", {type: "manual", message: "La contraseña es obligatoria para nuevos usuarios."});
        return;
      }
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        password: data.password,
      };
      
      placeholderUsers.push(newUser);
      setUsers([...placeholderUsers]);
      
      toast({ title: 'Usuario Creado (Local)', description: `El usuario ${data.name} ha sido creado en el sistema local. Debe crearlo en Firebase.` });
    }
    setIsFormOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete || !canEditOrDelete(userToDelete)) {
         toast({ title: 'Acción no permitida', description: 'No puedes eliminar a este usuario.', variant: 'destructive' });
        return;
    }

    const userIndex = placeholderUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      placeholderUsers.splice(userIndex, 1);
    }
    setUsers([...placeholderUsers]);
    
    toast({ title: 'Usuario Eliminado (Local)', description: `El usuario ha sido eliminado. Recuerde eliminarlo de Firebase.` });
  };
  
  const assignableRoles = useMemo(() => {
    if (currentUser?.role === 'Superadmin') return availableRoles;
    if (currentUser?.role === 'Admin') return availableRoles.filter(r => r.name !== 'Superadmin');
    return [];
  }, [currentUser, availableRoles]);

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administra los roles y datos de los usuarios del sistema."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {canCreateUsers() && (
              <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Usuario
              </Button>
            )}
            {(currentUser?.role === 'Superadmin') && (
              <Button variant="outline" onClick={() => router.push('/admin/roles')}>
                <ShieldQuestion className="mr-2 h-4 w-4" /> Gestionar Roles
              </Button>
            )}
          </div>
        }
      />
      
      <Card className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader className="flex flex-row items-start gap-4">
          <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <CardTitle className="text-blue-800 dark:text-blue-300">¡Importante! Nuevo Proceso de Usuarios</CardTitle>
            <CardDescription className="text-blue-700/90 dark:text-blue-400/90">
              Con la integración de Firebase Authentication, la gestión de contraseñas y la creación inicial de usuarios ahora se realiza en la Consola de Firebase. Esta sección es para asignar roles y gestionar datos adicionales.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>


       <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre o email..."
              className="w-full rounded-lg bg-background pl-8 md:w-1/3 lg:w-1/4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>Usuarios registrados en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        user.role === 'Superadmin' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        user.role === 'Admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                        user.role === 'Tecnico' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        user.role === 'Ventas' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditOrDelete(user) && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)} className="mr-2" disabled={!canCreateUsers() && currentUser?.id !== user.id}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={!canEditOrDelete(user)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar al usuario "{user.name}"? Esto solo lo elimina del sistema local, no de Firebase.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Sí, Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {searchTerm ? "No se encontraron usuarios." : "No hay usuarios registrados."}
            </p>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (canCreateUsers() || editingUser) && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl><Input {...field} placeholder="Ej: Juan Pérez" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico (Debe coincidir con Firebase)</FormLabel>
                      <FormControl><Input type="email" {...field} placeholder="usuario@ejemplo.com" disabled={!!editingUser} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (Opcional)</FormLabel>
                      <FormControl><Input type="tel" {...field} placeholder="Ej: 4491234567" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={editingUser?.role === 'Superadmin' && currentUser?.role !== 'Superadmin'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assignableRoles.map(role => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!editingUser && (
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña (temporal, para el registro local)</FormLabel>
                          <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Confirmar Contraseña</FormLabel>
                          <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                    />
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando...' : (editingUser ? 'Actualizar Usuario' : 'Crear Usuario')}
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
