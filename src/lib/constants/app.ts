// src/lib/constants/app.ts
// ── Application-wide constants ──

import type { AppRole } from '@/types';
import { ALL_PERMISSIONS } from '../permissions';

export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

// =======================================
// ===     DEFAULT TICKET SETTINGS     ===
// =======================================
export interface TicketSettings {
  name?: string; nameBold?: boolean;
  phone?: string; phoneBold?: boolean;
  addressLine1?: string; addressLine1Bold?: boolean;
  addressLine2?: string; addressLine2Bold?: boolean;
  cityState?: string; cityStateBold?: boolean;
  logoUrl?: string;
  logoWidth?: number;
  headerFontSize?: number;
  bodyFontSize?: number;
  itemsFontSize?: number;
  totalsFontSize?: number;
  footerFontSize?: number;
  blankLinesTop?: number;
  blankLinesBottom?: number;
  footerLine1?: string; footerLine1Bold?: boolean;
  footerLine2?: string; footerLine2Bold?: boolean;
  fixedFooterText?: string; fixedFooterTextBold?: boolean;
}

export const defaultTicketSettings: Required<Pick<
  TicketSettings,
  | 'name' | 'phone' | 'addressLine1' | 'addressLine2' | 'cityState'
  | 'logoUrl' | 'logoWidth'
  | 'headerFontSize' | 'bodyFontSize' | 'itemsFontSize' | 'totalsFontSize' | 'footerFontSize'
  | 'blankLinesTop' | 'blankLinesBottom'
  | 'footerLine1' | 'footerLine2' | 'fixedFooterText'
>> & Partial<TicketSettings> = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
  logoWidth: 120,
  headerFontSize: 10,
  bodyFontSize: 10,
  itemsFontSize: 10,
  totalsFontSize: 10,
  footerFontSize: 10,
  blankLinesTop: 0,
  blankLinesBottom: 0,
  footerLine1: "¡Gracias por su preferencia!",
  footerLine2: "Para dudas o aclaraciones, no dude en contactarnos.",
  fixedFooterText: "© 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
};

// =======================================
// ===        DEFAULT APP ROLES        ===
// =======================================
export const placeholderAppRoles: AppRole[] = [
  {
    id: "superadmin_role",
    name: "Superadministrador",
    permissions: ALL_PERMISSIONS.map(p => p.id),
  },
  {
    id: "asesor_role",
    name: "Asesor",
    permissions: [
      'inventory:view',
      'services:view', 'services:create', 'services:edit',
      'pos:view_sales', 'pos:create_sale',
      'fleet:view', 'fleet:create', 'fleet:edit',
      'purchases:view',
    ],
  },
  {
    id: "tech_role",
    name: "Técnico",
    permissions: [
      'services:view', 'services:edit',
      'inventory:view',
    ],
  },
  {
    id: "recepcion_role",
    name: "Recepcionista",
    permissions: [
      'services:view', 'services:create',
      'pos:view_sales', 'pos:create_sale',
      'inventory:view',
      'fleet:view', 'fleet:create',
    ],
  },
  {
    id: "cajero_role",
    name: "Cajero",
    permissions: [
      'pos:view_sales', 'pos:create_sale',
      'inventory:view',
      'services:view',
    ],
  },
];
