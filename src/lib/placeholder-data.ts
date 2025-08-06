

import type {
  User,
  SaleReceipt,
  InventoryItem,
  Vehicle,
  Driver,
  RentalPayment,
  MonthlyFixedExpense,
  AppRole,
  InventoryCategory,
  Supplier,
  ServiceRecord,
  Technician,
  AdministrativeStaff,
  InitialCashBalance,
  CashDrawerTransaction,
  VehiclePriceList,
  VehicleExpense,
  ServiceTypeRecord,
  AuditLog
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
  role: 'Superadministrador',
};

// =======================================
// ===        PLACEHOLDER DATA         ===
// =======================================
// These arrays will be populated from Firestore or a local source
export const placeholderVehicles: Vehicle[] = [];
export const placeholderDrivers: Driver[] = [];
export const placeholderRentalPayments: RentalPayment[] = [];
export const placeholderVehicleExpenses: VehicleExpense[] = [];
export const placeholderOwnerWithdrawals: any[] = []; // Define type if used
export const placeholderServiceRecords: ServiceRecord[] = [];
export const placeholderInventory: InventoryItem[] = [];
export const placeholderSales: SaleReceipt[] = [];
export const placeholderTechnicians: Technician[] = [];
export const placeholderAdministrativeStaff: AdministrativeStaff[] = [];
export const placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];
export const placeholderAppRoles: AppRole[] = [
    {
    id: "superadmin_role",
    name: "Superadministrador",
    permissions: [
      "dashboard:view",
      "services:create",
      "services:edit",
      "services:view_history",
      "inventory:manage",
      "inventory:view",
      "pos:create_sale",
      "pos:view_sales",
      "finances:view_report",
      "technicians:manage",
      "vehicles:manage",
      "fleet:manage",
      "users:manage",
      "roles:manage",
      "ticket_config:manage",
      "audits:view",
      "workshop:manage",
      "messaging:manage",
    ],
  },
  {
    id: "admin_role",
    name: "Asesor",
    permissions: [
      "dashboard:view",
      "services:create",
      "services:edit",
      "services:view_history",
      "inventory:manage",
      "inventory:view",
      "pos:create_sale",
      "pos:view_sales",
      "finances:view_report",
      "technicians:manage",
      "vehicles:manage",
      "fleet:manage",
      "users:manage",
      "roles:manage",
      "ticket_config:manage",
      "audits:view",
      "workshop:manage",
      "messaging:manage",
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
export const placeholderCategories: InventoryCategory[] = [];
export const placeholderSuppliers: Supplier[] = [];
export const placeholderInitialCashBalance: InitialCashBalance = { date: '', amount: 0, userId: '', userName: '' };
export const placeholderCashDrawerTransactions: CashDrawerTransaction[] = [];
export const placeholderVehiclePriceLists: VehiclePriceList[] = [];
export const placeholderTechnicianMonthlyPerformance: any[] = []; // Define type if used
export const placeholderServiceTypes: ServiceTypeRecord[] = [];
export const placeholderAuditLogs: AuditLog[] = [];
export const placeholderUsers: User[] = [defaultSuperAdmin];

// =======================================
// ===         DATA HYDRATION          ===
// =======================================
// Deprecated hydrateReady logic removed. Hydration is now handled by individual page components.
export const hydrateReady: Promise<void> = Promise.resolve();


// =======================================
// ===           UTILITIES           ===
// =======================================

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
  
  // The total amount already includes tax, so we get the pre-tax amount
  const totalAmountPreTax = sale.totalAmount / (1 + IVA_RATE);

  // The profit is the pre-tax total minus the cost of goods and any card commission
  const profit = totalAmountPreTax - totalCost - (sale.cardCommission || 0);
  
  return isFinite(profit) ? profit : 0;
};


export const persistToFirestore = async (collections: string[]) => {
  console.log(`[LOCAL MODE] Simulating persistence for: ${collections.join(', ')}`);
  // This function would handle writing the placeholder arrays back to Firestore
  // in a real application. In this local-only setup, we trigger an event
  // to let other components know the data has "updated".
  window.dispatchEvent(new CustomEvent('databaseUpdated'));
  return { success: true };
};

export const logAudit = async (actionType: string, description: string, details?: any) => {
  const userString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
  const user = userString ? JSON.parse(userString) : defaultSuperAdmin;
  
  const newLog: AuditLog = {
    id: `log_${Date.now()}`,
    date: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    actionType: actionType as AuditLog['actionType'],
    description,
    ...details
  };
  placeholderAuditLogs.push(newLog);
  // In a real app, this would also be persisted to Firestore
};
