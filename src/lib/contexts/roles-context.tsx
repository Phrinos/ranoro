// src/lib/contexts/roles-context.tsx
// Centraliza el listener de Firestore para roles en un solo lugar.
// Antes, cada componente que llamaba adminService.onRolesUpdate() abría
// su propio listener independiente (sidebar, usePermissions, página opciones, etc.)
// lo que significaba 4-6 listeners simultáneos a la misma colección.

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { adminService } from "@/lib/services";
import type { AppRole } from "@/types";

interface RolesContextValue {
  roles: AppRole[];
}

const RolesContext = createContext<RolesContextValue>({ roles: [] });

export function RolesProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    const unsub = adminService.onRolesUpdate(setRoles);
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ roles }), [roles]);

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
}

/**
 * Devuelve la lista de roles de la app.
 * El listener de Firestore se abre UNA sola vez en RolesProvider.
 */
export function useRoles(): AppRole[] {
  return useContext(RolesContext).roles;
}
