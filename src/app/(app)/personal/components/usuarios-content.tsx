// src/app/(app)/personal/components/usuarios-content.tsx

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import type { User, AppRole } from "@/types";
import { PlusCircle, Search, Users, Eye, EyeOff } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { adminService } from '@/lib/services/admin.service';
import { UserDialog } from './user-dialog';
import type { UserFormValues } from './user-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { useTableManager } from '@/hooks/useTableManager';
import { Badge } from '@/components/ui/badge';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';

export function UsuariosPageContent({ currentUser, initialUsers, initialRoles }: { currentUser: User | null, initialUsers: User[], initialRoles: AppRole[] }) {
  const { toast } = useToast();
  const users = initialUsers;
  const availableRoles = initialRoles;
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  const {
    filteredData,
    ...tableManager
  } = useTableManager<User>({
    initialData: users,
    searchKeys: ['name', 'email', 'role'],
    dateFilterKey: 'hireDate',
    initialSortOption: 'name_asc'
  });

  const finalData = useMemo(() => {
    return filteredData.filter(user => showArchived ? true : !user.isArchived);
  }, [filteredData, showArchived]);


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
  
  const handleArchiveUser = async (userId: string, archive: boolean) => {
    if (!currentUser) return;
    try {
        await adminService.archiveUser(userId, archive, currentUser);
        toast({ title: `Usuario ${archive ? 'archivado' : 'restaurado'}.` });
        setIsFormOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: 'destructive'});
    }
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nombre, email o rol..."
                    className="w-full rounded-lg bg-card pl-8"
                    value={tableManager.searchTerm}
                    onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
                />
            </div>
            <div className="flex w-full sm:w-auto gap-2">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowArchived(!showArchived)}>
                    {showArchived ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showArchived ? 'Ocultar Archivados' : 'Ver Archivados'}
                </Button>
                <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Integrante
                </Button>
            </div>
        </div>
        
        <Card>
            <CardContent className="pt-6">
                {finalData.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-black">
                      <TableRow className="hover:bg-transparent">
                          <SortableTableHeader sortKey="name" label="Nombre" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                          <SortableTableHeader sortKey="role" label="Rol" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                          <SortableTableHeader sortKey="hireDate" label="Fecha Contratación" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                          <SortableTableHeader sortKey="monthlySalary" label="Sueldo Base" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                          <SortableTableHeader sortKey="commissionRate" label="% Comisión" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finalData.map(user => {
                        const hireDate = user.hireDate ? parseDate(user.hireDate) : null;
                        return (
                          <TableRow 
                            key={user.id} 
                            onClick={() => handleOpenForm(user)} 
                            className={cn("cursor-pointer hover:bg-muted/50", user.isArchived && "bg-gray-100/80 dark:bg-gray-800/20 text-muted-foreground")}
                          >
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {user.name}
                                  {user.isArchived && <Badge variant="secondary">Archivado</Badge>}
                                </div>
                            </TableCell>
                            <TableCell><span className={`px-2 py-1 text-xs rounded-full font-medium ${ user.role === 'Superadministrador' ? 'bg-red-100 text-red-700' : user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>{user.role}</span></TableCell>
                            <TableCell>{hireDate ? format(hireDate, "dd MMM, yyyy", { locale: es }) : 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(user.monthlySalary)}</TableCell>
                            <TableCell>{user.commissionRate || 0}%</TableCell>
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
                onArchive={handleArchiveUser}
            />
        )}
    </div>
  );
}
