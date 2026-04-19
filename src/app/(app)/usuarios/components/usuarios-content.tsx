// src/app/(app)/usuarios/components/usuarios-content.tsx
"use client";

import React, { useState, useMemo } from 'react';
import type { User, AppRole } from '@/types';
import { adminService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, PlusCircle, Archive, ArchiveRestore, Edit } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface UsuariosPageContentProps {
  currentUser: User | null;
  initialUsers: User[];
  initialRoles: AppRole[];
}

export function UsuariosPageContent({ currentUser, initialUsers, initialRoles }: UsuariosPageContentProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState<{ user: User; archive: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return initialUsers.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [initialUsers, search]);

  const handleArchive = async () => {
    if (!archiveConfirm || !currentUser) return;
    try {
      await adminService.archiveUser(archiveConfirm.user.id, archiveConfirm.archive, currentUser);
      toast({ title: archiveConfirm.archive ? 'Usuario archivado' : 'Usuario restaurado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setArchiveConfirm(null);
    }
  };

  const isSuperAdmin = currentUser?.role === 'Superadministrador';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuario..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isSuperAdmin && (
          <Button size="sm" asChild>
            <Link href="/usuarios/nuevo"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo</Link>
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            ) : filtered.map(user => (
              <TableRow key={user.id} className={user.isArchived ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={user.isArchived ? 'secondary' : 'default'}>
                    {user.isArchived ? 'Archivado' : 'Activo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <Link href={`/usuarios/${user.id}`}><Edit className="h-3.5 w-3.5" /></Link>
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setArchiveConfirm({ user, archive: !user.isArchived })}
                      >
                        {user.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!archiveConfirm}
        onOpenChange={() => setArchiveConfirm(null)}
        title={archiveConfirm?.archive ? 'Archivar Usuario' : 'Restaurar Usuario'}
        description={`¿${archiveConfirm?.archive ? 'Archivar' : 'Restaurar'} a ${archiveConfirm?.user.name}?`}
        onConfirm={handleArchive}
        confirmLabel={archiveConfirm?.archive ? 'Archivar' : 'Restaurar'}
        variant={archiveConfirm?.archive ? 'destructive' : 'default'}
      />
    </div>
  );
}
