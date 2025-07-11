
import type {
  Vehicle,
  ServiceRecord,
  Technician,
  InventoryItem,
  SaleReceipt,
  InventoryCategory,
  Supplier,
  AppRole,
  QuoteRecord,
  MonthlyFixedExpense,
  AdministrativeStaff,
  User,
  VehiclePriceList,
  Driver,
  RentalPayment,
  PublicOwnerReport,
  OwnerWithdrawal,
  VehicleExpense,
  CashDrawerTransaction,
  InitialCashBalance,
  AuditLog,
  ServiceTypeRecord,
} from '@/types';

export const IVA_RATE = 0.16;
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

// =======================================
// ===    DEFAULT SUPERADMIN CONFIG    ===
// =======================================
export const defaultSuperAdmin: User = {
  id: 'H0XVkuViOFM7zt729AyAK531iIj2',
  name: 'Arturo Valdelamar',
  email: 'arturo@ranoro.mx',
  role: 'Superadmin',
};

// =======================================
// ===          UTILITIES              ===
// =======================================

export function logAudit(
  actionType: AuditLog['actionType'],
  description: string,
  details: { entityType?: AuditLog['entityType']; entityId?: string; } = {}
): AuditLog {
    let userId = 'system';
    let userName = 'Sistema';
    try {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) {
        const currentUser: User = JSON.parse(authUserString);
        userId = currentUser.id;
        userName = currentUser.name;
      }
    } catch (e) { console.error("Could not get user for audit log:", e); }

  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: new Date().toISOString(),
    userId,
    userName,
    actionType,
    description,
    entityType: details.entityType,
    entityId: details.entityId,
  };
  return newLog;
}

export const calculateSaleProfit = (
  sale: SaleReceipt,
  inventory: InventoryItem[]
): number => {
  if (!sale?.items?.length) return 0;

  const inventoryMap = new Map<string, InventoryItem>(inventory.map((i) => [i.id, i]));
  let totalCost = 0;

  for (const saleItem of sale.items) {
    const inventoryItem = inventoryMap.get(saleItem.inventoryItemId);
    if (inventoryItem && !inventoryItem.isService) {
      totalCost += (inventoryItem.unitPrice || 0) * saleItem.quantity;
    }
  }
  
  const totalAmountPreTax = sale.totalAmount / (1 + IVA_RATE);
  const profit = totalAmountPreTax - totalCost;
  
  return isFinite(profit) ? profit : 0;
};
