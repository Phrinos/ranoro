
// src/hooks/usePermissions.ts
"use client";

import * as React from 'react';
import { useRoles } from '@/lib/contexts/roles-context';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/lib/permissions';

// ── Build lookup maps for resolving corrupted permission data ──

/** label → id  (e.g. "Ver Inventario General" → "inventory:view") */
const LABEL_TO_ID = new Map<string, string>();
/** All valid permission IDs */
const VALID_IDS = new Set<string>();

for (const group of PERMISSION_GROUPS) {
  for (const perm of group.permissions) {
    VALID_IDS.add(perm.id);
    LABEL_TO_ID.set(perm.label, perm.id);
  }
}

/** Mapping of old/stale permission IDs to current valid ones */
const LEGACY_ID_MAP: Record<string, string[]> = {
  'dashboard:view': [],
  'services:view_history': ['services:view'],
  'inventory:manage': ['inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete'],
  'inventory:view_public_info': ['inventory:view'],
  'fleet:manage': ['fleet:view', 'fleet:create', 'fleet:edit'],
  'rentals:view': ['fleet:view'],
  'rentals:manage': ['fleet:manage_rentals'],
  'finances:view_report': ['finances:view'],
  'vehicles:manage': ['fleet:view', 'fleet:create', 'fleet:edit'],
  'personnel:manage': ['admin:manage_users_roles'],
  'audits:view': ['admin:view_audit'],
  'ticket_config:manage': ['admin:settings'],
  'workshop:manage': ['admin:settings'],
  'messaging:manage': [],
};

/**
 * Normalizes a set of permission strings (which may be IDs, labels, or old IDs)
 * into a clean set of valid current permission IDs.
 */
export function normalizePermissions(raw: string[]): Set<string> {
  const resolved = new Set<string>();
  for (const perm of raw) {
    // 1. Already a valid current ID
    if (VALID_IDS.has(perm)) {
      resolved.add(perm);
      continue;
    }
    // 2. It's a label text → resolve to ID
    const fromLabel = LABEL_TO_ID.get(perm);
    if (fromLabel) {
      resolved.add(fromLabel);
      continue;
    }
    // 3. It's a stale/old ID → resolve to current IDs
    const fromLegacy = LEGACY_ID_MAP[perm];
    if (fromLegacy) {
      for (const newId of fromLegacy) resolved.add(newId);
      continue;
    }
    // 4. Unknown — ignore silently
  }
  return resolved;
}

/**
 * Hook personalizado para obtener los permisos del usuario actual.
 * Devuelve un Set con los IDs de los permisos para una verificación rápida.
 * Consume roles desde RolesContext (un solo listener compartido).
 * 
 * Includes resilience against corrupted Firestore data where permissions
 * may be stored as labels or old IDs instead of current valid IDs.
 */
export const usePermissions = (): Set<string> => {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
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
    const rawPermissions = userRole?.permissions || [];
    // Normalize to handle labels, old IDs, etc.
    return normalizePermissions(rawPermissions);
  }, [currentUser, roles]);

  return userPermissions;
};
