

import type {
  User,
  AppRole,
} from '@/types';
import { ALL_PERMISSIONS } from './permissions';

export const IVA_RATE = 0.16;
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

// =======================================
// ===    DEFAULT SUPERADMIN CONFIG    ===
// =======================================
export const defaultSuperAdmin: User = {
  id: "superadmin",
  name: "Super Admin",
  email: "admin@example.com",
  role: "Superadministrador",
  isArchived: false,
};

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
// ===        PLACEHOLDER DATA         ===
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
      // Inventario — puede ver e imprimir pero no editar costos
      'inventory:view',
      // Servicios — acceso completo al flujo de servicio
      'services:view', 'services:create', 'services:edit',
      // POS — puede cobrar y ver ventas
      'pos:view_sales', 'pos:create_sale',
      // Vehículos — puede ver y crear
      'fleet:view', 'fleet:create', 'fleet:edit',
      // Compras — puede ver historial
      'purchases:view',
    ],
  },
  {
    id: "tech_role",
    name: "Técnico",
    permissions: [
      // Solo puede ver servicios y editarlos (actualizar progreso)
      'services:view', 'services:edit',
      // Puede ver inventario (para saber qué insumos hay)
      'inventory:view',
    ],
  },
  {
    id: "recepcion_role",
    name: "Recepcionista",
    permissions: [
      // Servicios — puede crear y ver
      'services:view', 'services:create',
      // POS — puede cobrar y ver ventas
      'pos:view_sales', 'pos:create_sale',
      // Inventario — puede ver precios
      'inventory:view',
      // Vehículos — puede registrar
      'fleet:view', 'fleet:create',
    ],
  },
  {
    id: "cajero_role",
    name: "Cajero",
    permissions: [
      // POS — acceso completo a ventas
      'pos:view_sales', 'pos:create_sale',
      // Inventario — puede ver precios
      'inventory:view',
      // Servicios — puede ver para cobrar
      'services:view',
    ],
  },
];

// =======================================
// ===           UTILITIES           ===
// =======================================

import type { InventoryItem } from '@/types';

type LegacySale = {
  items: { inventoryItemId: string; unitPrice: number; quantity: number; isService?: boolean }[];
  totalAmount: number;
  cardCommission?: number;
};

type SimplifiedSale = {
  items: { itemId: string; itemName: string; quantity: number; total: number }[];
  totalAmount: number;
  payments?: { method: any; amount: number }[];
};

export function calculateSaleProfit(
  sale: LegacySale | SimplifiedSale,
  allInventory: InventoryItem[]
): number {
  const isSimplified = !('unitPrice' in (sale.items[0] ?? {}));
  if (isSimplified) {
    const items = (sale as SimplifiedSale).items;
    const cost = items.reduce((sum, it: any) => {
      const inv = allInventory.find(x => x.id === it.itemId);
      const unitCost = inv?.unitPrice ?? 0;
      return sum + unitCost * (it.quantity ?? 1);
    }, 0);
    return (sale as SimplifiedSale).totalAmount - cost;
  }
  // Formato legacy original
  const legacy = sale as LegacySale;
  const cost = legacy.items.reduce((sum, it) => {
    const inv = allInventory.find(x => x.id === it.inventoryItemId);
    const unitCost = inv?.unitPrice ?? 0;
    return sum + unitCost * it.quantity;
  }, 0);
  const cardCommission = 'cardCommission' in legacy ? legacy.cardCommission ?? 0 : 0;
  return legacy.totalAmount - cost - cardCommission;
}
