
// src/hooks/usePermissions.ts
"use client";

import * as React from 'react';
import { adminService } from '@/lib/services';
import type { User, AppRole } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ALL_PERMISSIONS } from '@/lib/permissions';

/**
 * Hook personalizado para obtener los permisos del usuario actual.
 * Devuelve un Set con los IDs de los permisos para una verificación rápida.
 * @returns {Set<string>} Un Set que contiene todos los permisos del usuario.
 */
export const usePermissions = (): Set<string> => {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  
  // 1. Cargar el usuario actual del localStorage y suscribirse a los roles
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
    
    const unsub = adminService.onRolesUpdate(setRoles);
    return () => unsub();
  }, []);

  // 2. Calcular el conjunto de permisos del usuario
  const userPermissions = React.useMemo(() => {
    if (!currentUser) {
      // Si no hay usuario, no hay permisos
      return new Set<string>();
    }
    
    // El Superadministrador tiene todos los permisos por defecto
    if (currentUser.role === 'Superadministrador') {
      return new Set(ALL_PERMISSIONS.map(p => p.id));
    }
    
    // Buscar el rol del usuario en la lista de roles de la app
    const userRole = roles.find(r => r && r.name === currentUser.role);
    
    // Devolver los permisos de ese rol, o un conjunto vacío si no se encuentra
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);

  return userPermissions;
};
