

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import type { User, AppRole } from '@/types';
import { PlusCircle, Trash2, Edit, Search, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminService } from '@/lib/services/admin.service';
import { UserDialog } from '../../administracion/components/user-dialog';
import type { UserFormValues } from '../../administracion/components/user-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';

export function UsuariosPageContent({ currentUser, initialUsers, initialRoles }: { currentUser: User | null, initialUsers: User[], initialRoles: AppRole[] }) {
  const { toast } = useToast();
  const users = initialUsers;
  const availableRoles = initialRoles;
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const {
    filteredData,
    ...tableManager
  } = useTableManager<User>({
    initialData: users,
    searchKeys: ['name', 'email', 'role'],
    dateFilterKey: 'hireDate',
    initialSortOption: 'name_asc'
  });

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
        <div className="flex justify-end">
            <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Integrante
            </Button>
        </div>
        
        <TableToolbar
          {...tableManager}
          searchPlaceholder="Buscar por nombre, email o rol..."
          sortOptions={[
              { value: 'name_asc', label: 'Nombre (A-Z)' },
              { value: 'name_desc', label: 'Nombre (Z-A)' },
              { value: 'role_asc', label: 'Rol (A-Z)' },
              { value: 'role_desc', label: 'Rol (Z-A)' },
              { value: 'hireDate_desc', label: 'Contratación (Más Reciente)' },
              { value: 'hireDate_asc', label: 'Contratación (Más Antiguo)' },
          ]}
        />
        
        <Card>
            <CardContent className="pt-6">
                {filteredData.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-black">
                      <TableRow>
                          <TableHead className="text-white">Nombre</TableHead>
                          <TableHead className="text-white">Rol</TableHead>
                          <TableHead className="text-white">Fecha Contratación</TableHead>
                          <TableHead className="text-white">Sueldo Base</TableHead>
                          <TableHead className="text-white">% Comisión</TableHead>
                          <TableHead className="text-right text-white">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map(user => {
                        const hireDate = user.hireDate ? parseDate(user.hireDate) : null;
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell><span className={`px-2 py-1 text-xs rounded-full font-medium ${ user.role === 'Superadministrador' ? 'bg-red-100 text-red-700' : user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>{user.role}</span></TableCell>
                            <TableCell>{hireDate ? format(hireDate, "dd MMM, yyyy", { locale: es }) : 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(user.monthlySalary)}</TableCell>
                            <TableCell>{user.commissionRate || 0}%</TableCell>
                            <TableCell className="text-right">
                              {canEditOrDelete(user) && ( <> 
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)} className="mr-2"><Edit className="h-4 w-4" /></Button>
                                  <ConfirmDialog
                                    triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                    title="¿Eliminar Usuario?"
                                    description={`¿Seguro que quieres eliminar a "${user.name}"? Esta acción es permanente.`}
                                    onConfirm={() => handleDeleteUser(user.id)}
                                  />
                              </>)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
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
