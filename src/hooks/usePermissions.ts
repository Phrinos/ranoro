
// src/hooks/usePermissions.ts
"use client";

import * as React from 'react';
import { useRoles } from '@/lib/contexts/roles-context';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ALL_PERMISSIONS } from '@/lib/permissions';

/**
 * Hook personalizado para obtener los permisos del usuario actual.
 * Devuelve un Set con los IDs de los permisos para una verificación rápida.
 * Consume roles desde RolesContext (un solo listener compartido).
 * @returns {Set<string>} Un Set que contiene todos los permisos del usuario.
 */
export const usePermissions = (): Set<string> => {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  // Roles desde el contexto centralizado — NO abre un listener propio
  const roles = useRoles();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) {
        try {
          setCurrentUser(JSON.parse(authUserString));
        } catch (e) {
          console.error("Could not parse user from localStorage", e);
        }
      }
    }
  }, []);

  const userPermissions = React.useMemo(() => {
    if (!currentUser) return new Set<string>();
    if (currentUser.role === 'Superadministrador') {
      return new Set(ALL_PERMISSIONS.map(p => p.id));
    }
    const userRole = roles.find(r => r && r.name === currentUser.role);
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);

  return userPermissions;
};
