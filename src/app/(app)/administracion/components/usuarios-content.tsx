

"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { UserDialog } from './user-dialog';

const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string({ required_error: "Seleccione un rol." }).min(1, "Debe seleccionar un rol."),
  monthlySalary: z.coerce.number().optional(),
  commissionRate: z.coerce.number().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export function UsuariosPageContent({ currentUser, initialUsers, initialRoles }: { currentUser: User | null, initialUsers: User[], initialRoles: AppRole[] }) {
  const { toast } = useToast();
  const users = initialUsers;
  const availableRoles = initialRoles;
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    } else {
      setEditingUser(null);
    }
    setIsFormOpen(true);
  }, []);

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
    } catch (error: any) {
        toast({ title: "Error al guardar", description: error.message, variant: 'destructive'});
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!currentUser) return;
    try {
        await adminService.deleteUser(userId, currentUser);
        toast({ title: "Usuario eliminado." });
    } catch (error: any) {
        toast({ title: "Error al eliminar", description: error.message, variant: 'destructive'});
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Lista de Usuarios</h2>
                <p className="text-muted-foreground">Usuarios registrados en el sistema. Los sueldos y comisiones se configuran aquí.</p>
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
              className="w-full rounded-lg bg-card pl-8 md:w-1/2 lg:w-1/3"
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
                      <TableRow><TableHead className="text-white">Nombre</TableHead><TableHead className="text-white">Email</TableHead><TableHead className="text-white hidden sm:table-cell">Teléfono</TableHead><TableHead className="text-white hidden sm:table-cell">Rol</TableHead><TableHead className="text-right text-white">Acciones</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="hidden sm:table-cell">{user.phone || 'N/A'}</TableCell>
                          <TableCell className="hidden sm:table-cell"><span className={`px-2 py-1 text-xs rounded-full font-medium ${ user.role === 'Superadministrador' ? 'bg-red-100 text-red-700' : user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>{user.role}</span></TableCell>
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
            <UserDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                user={editingUser}
                roles={assignableRoles}
                onSave={onSubmit}
            />
        )}
    </div>
  );
}
