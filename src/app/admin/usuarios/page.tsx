
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
import type { User, UserRole } from '@/types';
import { PlusCircle, Trash2, Edit, Search } from "lucide-react";

const USER_LOCALSTORAGE_KEY = 'appUsers';
const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

const userSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  role: z.enum(['superadmin', 'admin', 'tecnico', 'ventas'], { required_error: "Seleccione un rol." }),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string().min(6, "Confirme la contraseña."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userSchema>;

const defaultSuperAdmin: User = {
  id: 'user_superadmin_default',
  name: 'Arturo Ranoro (Superadmin)',
  email: 'arturo@ranoro.mx',
  role: 'superadmin',
  password: 'CA1abaza' // For display/edit, not for direct login comparison without hashing in real app
};

export default function UsuariosPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', role: 'tecnico', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) setCurrentUser(JSON.parse(authUserString));

      const storedUsersString = localStorage.getItem(USER_LOCALSTORAGE_KEY);
      let loadedUsers: User[] = storedUsersString ? JSON.parse(storedUsersString) : [];
      
      // Ensure superadmin exists
      if (!loadedUsers.find(u => u.email === defaultSuperAdmin.email)) {
        loadedUsers = [defaultSuperAdmin, ...loadedUsers];
        localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(loadedUsers));
      }
      setUsers(loadedUsers);
    }
  }, []);

  const canEditOrDelete = (user: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return user.email !== currentUser.email; // Superadmin can't delete/edit self
    return false; // Other roles cannot edit/delete
  };
  
  const canCreateUsers = (): boolean => {
     if (!currentUser) return false;
     return currentUser.role === 'superadmin' || currentUser.role === 'admin';
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
        role: userToEdit.role,
        password: userToEdit.password || '', // Assuming password might be stored for edit, very insecure for demo
        confirmPassword: userToEdit.password || '',
      });
    } else {
      setEditingUser(null);
      form.reset({ name: '', email: '', role: 'tecnico', password: '', confirmPassword: '' });
    }
    setIsFormOpen(true);
  };

  const onSubmit = (data: UserFormValues) => {
    let updatedUsers: User[];
    if (editingUser) {
      updatedUsers = users.map(u => u.id === editingUser.id ? { ...editingUser, ...data } : u);
      toast({ title: 'Usuario Actualizado', description: `El usuario ${data.name} ha sido actualizado.` });
    } else {
      const newUser: User = {
        id: `user_${Date.now()}`,
        ...data,
      };
      updatedUsers = [...users, newUser];
      toast({ title: 'Usuario Creado', description: `El usuario ${data.name} ha sido creado.` });
    }
    setUsers(updatedUsers);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUsers));
    }
    setIsFormOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete || !canEditOrDelete(userToDelete)) {
         toast({ title: 'Acción no permitida', description: 'No puedes eliminar a este usuario.', variant: 'destructive' });
        return;
    }
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUsers));
    }
    toast({ title: 'Usuario Eliminado', description: `El usuario ha sido eliminado.` });
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Gestión de Usuarios"
        description="Crea, edita y elimina usuarios del sistema."
        actions={ canCreateUsers() &&
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Usuario
          </Button>
        }
      />

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
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        user.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'tecnico' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditOrDelete(user) && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)} className="mr-2" disabled={!canCreateUsers()}>
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
                                  ¿Estás seguro de que quieres eliminar al usuario "{user.name}"? Esta acción no se puede deshacer.
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

      {isFormOpen && canCreateUsers() && (
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
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl><Input type="email" {...field} placeholder="usuario@ejemplo.com" /></FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentUser?.role === 'superadmin' && <SelectItem value="superadmin">Superadmin</SelectItem>}
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="tecnico">Técnico</SelectItem>
                          <SelectItem value="ventas">Ventas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
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
