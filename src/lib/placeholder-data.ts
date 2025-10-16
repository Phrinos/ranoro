

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
      'inventory:manage', 'inventory:view',
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
      "inventory:view",
    ],
  },
  {
    id: "recepcion_role",
    name: "Asesor",
    permissions: [
      "dashboard:view",
      "services:create",
      "services:view_history",
      "inventory:view",
      "pos:create_sale",
      "pos:view_sales",
      "vehicles:manage"
    ],
  },
];

// =======================================
// ===           UTILITIES           ===
// =======================================

export const calculateSaleProfit = (
  sale: { items: { inventoryItemId: string; unitPrice: number; quantity: number; isService?: boolean; }[], totalAmount: number, cardCommission?: number },
  inventory: { id: string; isService?: boolean; unitPrice: number; }[]
): number => {
  if (!sale?.items?.length) return 0;

  const inventoryMap = new Map<string, { id: string; isService?: boolean; unitPrice: number; }>(
    inventory.map((i) => [i.id, i])
  );

  const totalRevenue = sale.totalAmount || 0;
  const commissionCost = sale.cardCommission || 0;
  
  let totalCostOfGoods = 0;
  for (const saleItem of sale.items) {
    const inventoryItem = inventoryMap.get(saleItem.inventoryItemId);
    const isService = saleItem.isService || (inventoryItem && inventoryItem.isService);
    
    if (!isService && inventoryItem) {
      totalCostOfGoods += (inventoryItem.unitPrice || 0) * saleItem.quantity;
    } 
    else if (isService && inventoryItem) {
      totalCostOfGoods += (inventoryItem.unitPrice || 0) * saleItem.quantity;
    }
    else if (!inventoryItem) { 
       totalCostOfGoods += (saleItem.unitPrice || 0) * saleItem.quantity;
    }
  }

  const finalProfit = totalRevenue - totalCostOfGoods - commissionCost;

  return isFinite(finalProfit) ? finalProfit : 0;
};
