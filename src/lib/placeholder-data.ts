// src/lib/placeholder-data.ts
// ── DEPRECATED: Use @/lib/constants/app instead ──
// This file re-exports from the new canonical location for backward compatibility.
export {
  AUTH_USER_LOCALSTORAGE_KEY,
  defaultTicketSettings,
  placeholderAppRoles,
  type TicketSettings,
} from './constants/app';

// Legacy: defaultSuperAdmin was removed. If you see a build error,
// use the authenticated user from localStorage instead.
import type { User } from '@/types';
export const defaultSuperAdmin: User = {
  id: "superadmin",
  name: "Super Admin",
  email: "admin@example.com",
  role: "Superadministrador",
  isArchived: false,
};
