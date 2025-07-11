

import type {
  Vehicle,
  ServiceRecord,
  Technician,
  InventoryItem,
  DashboardMetrics,
  SaleReceipt,
  ServiceSupply,
  InventoryCategory,
  Supplier,
  SaleItem,
  PaymentMethod,
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
  VehiclePaperwork,
  CashDrawerTransaction,
  InitialCashBalance,
  AuditLog,
  ServiceTypeRecord,
} from '@/types';
import {
  format,
  subMonths,
  addDays,
  getYear,
  getMonth,
  setHours,
  setMinutes,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const IVA_RATE = 0.16;

// =======================================
// ===          CATEGORÍAS Y PROVEEDORES ===
// =======================================
export let placeholderCategories: InventoryCategory[] = [
    { id: 'CAT001', name: 'Filtros' },
    { id: 'CAT002', name: 'Aceites y Lubricantes' },
    { id: 'CAT003', name: 'Frenos' },
    { id: 'CAT004', name: 'Suspensión' },
    { id: 'CAT005', name: 'Eléctrico' },
];
export let placeholderServiceTypes: ServiceTypeRecord[] = [
    { id: 'st_1', name: 'Servicio General' },
    { id: 'st_2', name: 'Cambio de Aceite' },
    { id: 'st_3', name: 'Pintura' },
];
export let placeholderSuppliers: Supplier[] = [
    { id: 'SUP001', name: 'Refaccionaria GDL', contactPerson: 'Juan Hernandez', phone: '333-123-4567', email: 'ventas@refaccionariagdl.com' },
    { id: 'SUP002', name: 'AutoZone Aguascalientes', contactPerson: 'Sofia Ramirez', phone: '449-987-6543', email: 'gerencia.ags@autozone.com' },
    { id: 'SUP003', name: 'Partes y Motores de Aguascalientes', debtAmount: 2500, debtNote: 'Factura #F-9870' },
];

// =======================================
// ===          INVENTARIO               ===
// =======================================
export let placeholderInventory: InventoryItem[] = [
  { id: 'PROD001', name: 'Aceite Sintético 5W-30', brand: 'Mobil 1', sku: 'MOB-5W30-S', quantity: 50, unitPrice: 150, sellingPrice: 180, supplier: 'Refaccionaria GDL', lowStockThreshold: 10, category: 'Aceites y Lubricantes', unitType: 'liters' },
  { id: 'PROD002', name: 'Filtro de Aceite', brand: 'Gonher', sku: 'GON-FO-123', quantity: 30, unitPrice: 80, sellingPrice: 96, supplier: 'AutoZone Aguascalientes', lowStockThreshold: 5, category: 'Filtros', unitType: 'units' },
  { id: 'PROD003', name: 'Juego de Balatas Delanteras', brand: 'Brembo', sku: 'BRE-BLK-456', quantity: 15, unitPrice: 600, sellingPrice: 720, supplier: 'Refaccionaria GDL', lowStockThreshold: 3, category: 'Frenos', unitType: 'units' },
  { id: 'PROD004', name: 'Limpiaparabrisas 22"', brand: 'Bosch', sku: 'BOS-WPR-22', quantity: 25, unitPrice: 120, sellingPrice: 144, supplier: 'AutoZone Aguascalientes', lowStockThreshold: 10, category: 'Eléctrico', unitType: 'units' },
  { id: 'PROD005', name: 'Amortiguador Delantero', brand: 'Monroe', sku: 'MON-SHK-789', quantity: 8, unitPrice: 800, sellingPrice: 960, supplier: 'Partes y Motores de Aguascalientes', lowStockThreshold: 2, category: 'Suspensión', unitType: 'units' },
  { id: 'SERV001', name: 'Mano de Obra Mecánica', brand: 'Ranoro', sku: 'SERV-MO-GEN', quantity: 0, unitPrice: 250, sellingPrice: 300, supplier: 'N/A', lowStockThreshold: 0, category: 'Servicios', isService: true },
];

// =======================================
// ===          VEHÍCULOS                ===
// =======================================
export let placeholderVehicles: Vehicle[] = [
  {
    id: 'VEH002',
    make: 'Honda',
    model: 'CR-V',
    year: 2019,
    ownerName: 'Ana García',
    ownerPhone: '4492345678',
    licensePlate: 'BBB456B'
  },
  {
    id: 'VEH003',
    make: 'Ford',
    model: 'Lobo',
    year: 2022,
    ownerName: 'Carlos Martinez',
    ownerPhone: '4493456789',
    licensePlate: 'CCC789C',
    isFleetVehicle: true,
    dailyRentalCost: 450,
  }
];

// =======================================
// ===          PERSONAL                 ===
// =======================================
export let placeholderTechnicians: Technician[] = [
    { id: 'T001', name: 'Carlos Rodriguez', area: 'Mecánica General', specialty: 'Motores', isArchived: false, commissionRate: 0.05, monthlySalary: 12000, standardHoursPerDay: 8 },
    { id: 'T002', name: 'Ricardo Gomez', area: 'Eléctrico', specialty: 'Diagnóstico Electrónico', isArchived: false, commissionRate: 0.07, monthlySalary: 14000, standardHoursPerDay: 8  },
];
export let placeholderAdministrativeStaff: AdministrativeStaff[] = [
    { id: 'ADM001', name: 'Laura Mendez', roleOrArea: 'Gerente', isArchived: false, monthlySalary: 20000, commissionRate: 0.01 },
    { id: 'ADM002', name: 'Sofía Castro', roleOrArea: 'Recepción', isArchived: false, monthlySalary: 9000 },
];
export let placeholderDrivers: Driver[] = [];
export let placeholderRentalPayments: RentalPayment[] = [];
export let placeholderOwnerWithdrawals: OwnerWithdrawal[] = [];
export let placeholderVehicleExpenses: VehicleExpense[] = [];


// =======================================
// ===          USUARIOS Y ROLES         ===
// =======================================
export const defaultSuperAdmin: User = {
  id: 'RaMVBO4UZeTeNW1BZlmwWMg9Na32',
  tenantId: 'T01H858YMEG5V6V3V3V3V3V3V3',
  name: 'Arturo Valdelamar',
  email: 'arturo@ranoro.mx',
  role: 'Superadmin',
  password: 'CA1abaza',
  phone: '4493930914',
  signatureDataUrl: undefined,
};

export let placeholderUsers: User[] = []; // This will be hydrated from Firestore
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';
export const USER_LOCALSTORAGE_KEY = 'appUsers';
export const ROLES_LOCALSTORAGE_KEY = 'appRoles';

const ALL_AVAILABLE_PERMISSIONS = [
  { id: 'dashboard:view', label: 'Ver Panel Principal' },
  { id: 'services:create', label: 'Crear Servicios' },
  { id: 'services:edit', label: 'Editar Servicios' },
  { id: 'services:view_history', label: 'Ver Historial de Servicios' },
  { id: 'inventory:manage', label: 'Gestionar Inventario (Productos, Cat, Prov)' },
  { id: 'inventory:view', label: 'Ver Inventario' },
  { id: 'pos:create_sale', label: 'Registrar Ventas (POS)' },
  { id: 'pos:view_sales', label: 'Ver Registro de Ventas' },
  { id: 'finances:view_report', label: 'Ver Reporte Financiero' },
  { id: 'technicians:manage', label: 'Gestionar Técnicos' },
  { id: 'vehicles:manage', label: 'Gestionar Vehículos' },
  { id: 'fleet:manage', label: 'Gestionar Flotilla' },
  { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
  { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
  { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
  { id: 'audits:view', label: 'Ver Auditoría de Acciones (Admin)' }
];

export let placeholderAppRoles: AppRole[] = [];

// =======================================
// ===          AUDITORÍA                ===
// =======================================
export let placeholderAuditLogs: AuditLog[] = [];


// =======================================
// ===          OPERACIONES              ===
// =======================================

// --- SERVICIOS ---
// MIGRATED DATA - This data now follows the standardized ServiceRecord structure.
export let placeholderServiceRecords: ServiceRecord[] = [];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = []; // This is now obsolete, quotes are ServiceRecords with status 'Cotizacion'

// --- VENTAS (POS) ---
export let placeholderSales: SaleReceipt[] = [];

// --- GASTOS FIJOS Y CAJA ---
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];
export let placeholderCashDrawerTransactions: CashDrawerTransaction[] = [];
export let placeholderInitialCashBalance: InitialCashBalance | null = null;


// --- LISTA DE PRECIOS ---
export let placeholderVehiclePriceLists: VehiclePriceList[] = [];

// --- REPORTES PUBLICOS ---
export let placeholderPublicOwnerReports: PublicOwnerReport[] = [];


// --- DATA PERSISTENCE & HYDRATION ---

const DATA_ARRAYS = {
    vehicles: placeholderVehicles,
    serviceRecords: placeholderServiceRecords,
    technicians: placeholderTechnicians,
    inventory: placeholderInventory,
    categories: placeholderCategories,
    suppliers: placeholderSuppliers,
    sales: placeholderSales,
    appRoles: placeholderAppRoles,
    fixedExpenses: placeholderFixedMonthlyExpenses,
    administrativeStaff: placeholderAdministrativeStaff,
    vehiclePriceLists: placeholderVehiclePriceLists,
    drivers: placeholderDrivers,
    rentalPayments: placeholderRentalPayments,
    ownerWithdrawals: placeholderOwnerWithdrawals,
    vehicleExpenses: placeholderVehicleExpenses,
    cashDrawerTransactions: placeholderCashDrawerTransactions,
    initialCashBalance: placeholderInitialCashBalance,
    auditLogs: placeholderAuditLogs,
    serviceTypes: placeholderServiceTypes,
    users: placeholderUsers,
};


const LOCALSTORAGE_DB_KEY = 'ranoroLocalDatabase';

let resolveHydration: () => void;
export const hydrateReady = new Promise<void>((res) => {
  resolveHydration = res;
});

export function sanitizeObjectForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObjectForFirestore(item));
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = sanitizeObjectForFirestore(value);
      }
    }
  }
  return newObj;
}

export async function logAudit(
  actionType: AuditLog['actionType'],
  description: string,
  details: { entityType?: AuditLog['entityType']; entityId?: string; userId?: string; userName?: string; } = {}
) {
  let userId = details.userId;
  let userName = details.userName;
  if (!userId || !userName) {
    try {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) {
        const currentUser: User = JSON.parse(authUserString);
        userId = userId || currentUser.id;
        userName = userName || currentUser.name;
      }
    } catch (e) { console.error("Could not get user for audit log:", e); }
  }
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: new Date().toISOString(),
    userId: userId || 'system',
    userName: userName || 'Sistema',
    actionType, description, entityType: details.entityType, entityId: details.entityId,
  };
  placeholderAuditLogs.unshift(newLog);
  await persistToFirestore(['auditLogs']);
}

export async function hydrateFromFirestore(tenantId: string) {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    resolveHydration?.();
    return;
  }
  
  const docRef = doc(db, 'tenants', tenantId);
  const userListDocRef = doc(db, 'users', tenantId); // Assumes users are stored under a doc named after the tenantId

  try {
    const tenantDocSnap = await getDoc(docRef);
    const userListSnap = await getDoc(userListDocRef); // This might be wrong, depends on user structure

    if (tenantDocSnap.exists()) {
      const firestoreData = tenantDocSnap.data();
      // Assign data to placeholders
      Object.keys(DATA_ARRAYS).forEach(key => {
        if (key !== 'users' && firestoreData[key]) {
          const placeholder = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
          if (Array.isArray(placeholder)) {
            placeholder.splice(0, placeholder.length, ...firestoreData[key]);
          } else {
             // Handle non-array placeholders like initialCashBalance
             if (placeholder) Object.assign(placeholder, firestoreData[key]);
             else DATA_ARRAYS[key as keyof typeof DATA_ARRAYS] = firestoreData[key];
          }
        }
      });
      // Handle user list separately if needed from a different document
      // if (userListSnap.exists()) {
      //     placeholderUsers.splice(0, placeholderUsers.length, ...userListSnap.data().users);
      // }

    } else {
      console.warn('No database document found for tenant. Seeding with initial data.');
      // Persist all data if document is new
      await persistToFirestore(undefined, tenantId);
    }
  } catch (error) {
    console.error('Error reading from Firestore, using local fallback:', error);
  }

  // Ensure default roles exist if the app roles are empty
  const superAdminRoleExists = placeholderAppRoles.some(r => r.name === 'Superadmin');
  if(!superAdminRoleExists) {
      placeholderAppRoles.push({
          id: 'role_superadmin',
          name: 'Superadmin',
          permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id)
      });
      await persistToFirestore(['appRoles'], tenantId);
  }

  (window as any).__APP_HYDRATED__ = true;
  resolveHydration?.();
  console.log('Hydration process complete.');
}


export async function persistToFirestore(keysToUpdate?: (keyof typeof DATA_ARRAYS)[], forceTenantId?: string) {
  if (!db) {
    console.warn('Persist skipped: Firebase not configured.');
    return;
  }
  
  let tenantId = forceTenantId;

  if (!tenantId) {
      const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
      tenantId = currentUser?.tenantId;
  }
  
  if (!tenantId) {
      console.error('Persist skipped: No tenantId found.');
      return;
  }
  
  const keys = keysToUpdate && keysToUpdate.length > 0 ? keysToUpdate : Object.keys(DATA_ARRAYS) as (keyof typeof DATA_ARRAYS)[];
  
  const dataToPersist: { [key: string]: any } = {};
  for (const key of keys) {
    // Special handling for 'users' to avoid storing it inside the tenant document
    if (key === 'users') continue;
    
    if (DATA_ARRAYS[key] !== undefined) {
      dataToPersist[key] = DATA_ARRAYS[key];
    }
  }
  
  const sanitizedData = sanitizeObjectForFirestore(dataToPersist);
  try {
    const docRef = doc(db, 'tenants', tenantId);
    await setDoc(docRef, sanitizedData, { merge: true });
    
    console.log(`Data successfully persisted to Firestore for tenant ${tenantId} on keys: ${keys.join(', ')}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('databaseUpdated'));
    }
  } catch (e) {
    console.error('Error persisting data to Firestore:', e);
  }
}

export const calculateSaleProfit = (
  sale: SaleReceipt,
  inventory: InventoryItem[]
): number => {
  if (!sale?.items?.length) return 0;

  const inventoryMap = new Map<string, InventoryItem>(
    inventory.map((i) => [i.id, i])
  );

  let totalCost = 0;

  for (const saleItem of sale.items) {
    const inventoryItem = inventoryMap.get(saleItem.inventoryItemId);

    if (inventoryItem && !inventoryItem.isService) {
      const costPricePerUnit = Number(
        String(inventoryItem.unitPrice ?? '0').replace(',', '.')
      );
      const quantitySold = Number(
        String(saleItem.quantity ?? '0').replace(',', '.')
      );
      if (isFinite(costPricePerUnit) && isFinite(quantitySold)) {
        totalCost += costPricePerUnit * quantitySold;
      }
    }
  }
  
  const totalAmountPreTax = sale.totalAmount / (1 + IVA_RATE);
  const profit = totalAmountPreTax - totalCost;
  
  return isFinite(profit) ? profit : 0;
};


export const enrichServiceForPrinting = (
  service: ServiceRecord,
  inventory: InventoryItem[],
): ServiceRecord => {
  if (!service || !service.serviceItems) return service;

  const enrichedServiceItems = service.serviceItems.map(item => {
    const enrichedSupplies = (item.suppliesUsed || []).map((supply) => {
      const inventoryItem = inventory.find((invItem) => invItem.id === supply.supplyId);
      return {
        ...supply,
        unitPrice: inventoryItem?.sellingPrice ?? supply.unitPrice ?? 0,
      };
    });
    return { ...item, suppliesUsed: enrichedSupplies };
  });

  return {
    ...service,
    serviceItems: enrichedServiceItems,
  };
};
