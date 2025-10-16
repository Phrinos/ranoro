

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
  role: "superadmin",
  isArchived: false,
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
    id: "admin_role",
    name: "Asesor",
    permissions: [
      'dashboard:view',
      'services:create', 'services:edit', 'services:view_history',
      'inventory:manage', 'inventory:view_public_info',
      'pos:create_sale', 'pos:view_sales',
      'fleet:manage', 'rentals:view', 'rentals:manage',
      'finances:view_report',
      'vehicles:manage',
      'personnel:manage',
      'billing:manage',
      'messaging:manage',
      'audits:view',
      'ticket_config:manage',
      'workshop:manage',
    ],
  },
  {
    id: "tech_role",
    name: "Tecnico",
    permissions: [
      "dashboard:view",
      "services:edit",
      "services:view_history",
      "inventory:view_public_info",
    ],
  },
  {
    id: "recepcion_role",
    name: "Asesor",
    permissions: [
      "dashboard:view",
      "services:create",
      "services:view_history",
      "inventory:view_public_info",
      "pos:create_sale",
      "pos:view_sales",
      "vehicles:manage"
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
