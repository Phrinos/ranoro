
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
// Use the authenticated client for all Firestore operations in this file
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sanitizeObjectForFirestore } from './utils';

export const IVA_RATE = 0.16;

// =======================================
// ===          CATEGORÍAS Y PROVEEDORES ===
// =======================================
export let placeholderCategories: InventoryCategory[] = [];
export let placeholderServiceTypes: ServiceTypeRecord[] = [];
export let placeholderSuppliers: Supplier[] = [];

// =======================================
// ===          INVENTARIO               ===
// =======================================
export let placeholderInventory: InventoryItem[] = [];

// =======================================
// ===          VEHÍCULOS                ===
// =======================================
export let placeholderVehicles: Vehicle[] = [];

// =======================================
// ===          PERSONAL                 ===
// =======================================
export let placeholderTechnicians: Technician[] = [];
export let placeholderAdministrativeStaff: AdministrativeStaff[] = [];
export let placeholderDrivers: Driver[] = [];
export let placeholderRentalPayments: RentalPayment[] = [];
export let placeholderOwnerWithdrawals: OwnerWithdrawal[] = [];
export let placeholderVehicleExpenses: VehicleExpense[] = [];


// =======================================
// ===          USUARIOS Y ROLES         ===
// =======================================
export const defaultSuperAdmin: User = {
  id: 'RaMVBO4UZeTeNW1BZlmwWMg9Na32',
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
const DATA_STORE_ID = "main"; // Simplified ID

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

let resolveHydration: () => void;
export const hydrateReady = new Promise<void>((res) => {
  resolveHydration = res;
});

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
  // Do not persist audit logs on their own to avoid circular dependencies with other functions
}

export async function hydrateFromFirestore() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    resolveHydration?.();
    return;
  }
  
  if (!db) {
    console.error("Hydration skipped: Firestore client is not available.");
    resolveHydration?.();
    return;
  }
  
  const docRef = doc(db, 'database', DATA_STORE_ID);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const firestoreData = docSnap.data();
      Object.keys(DATA_ARRAYS).forEach(key => {
        if (firestoreData[key] !== undefined) {
          const placeholder = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
          if (Array.isArray(placeholder)) {
            placeholder.splice(0, placeholder.length, ...firestoreData[key]);
          } else if (placeholder !== null) {
            Object.assign(placeholder, firestoreData[key]);
          } else {
             // For cases where the placeholder is null, like initialCashBalance
             DATA_ARRAYS[key as keyof typeof DATA_ARRAYS] = firestoreData[key];
          }
        }
      });
      // Ensure the default superadmin exists in the user list if it's missing,
      // which is crucial for the very first login.
      if (!placeholderUsers.some(u => u.id === defaultSuperAdmin.id)) {
          placeholderUsers.push(defaultSuperAdmin);
          // Don't persist here, let the first user action do it.
      }
      console.log('Data successfully hydrated from Firestore.');
    } else {
      console.warn('Main data document not found. App will start with empty data. First save will create it.');
       Object.keys(DATA_ARRAYS).forEach(key => {
           const placeholder = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
           if (Array.isArray(placeholder)) {
               placeholder.length = 0;
           } else {
               DATA_ARRAYS[key as keyof typeof DATA_ARRAYS] = null;
           }
       });
       // Ensure default roles and the superadmin user exist for first-time use
       placeholderAppRoles.splice(0, placeholderAppRoles.length, 
          { id: 'role_superadmin', name: 'Superadmin', permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id) },
          { id: 'role_admin', name: 'Admin', permissions: ALL_AVAILABLE_PERMISSIONS.filter(p => !p.id.includes(':manage')).map(p => p.id) },
          { id: 'role_tecnico', name: 'Tecnico', permissions: ['services:view_history', 'services:edit'] }
        );
       placeholderUsers.push(defaultSuperAdmin);
    }
  } catch (error) {
    console.error('Error reading from Firestore, using local fallback:', error);
  }

  (window as any).__APP_HYDRATED__ = true;
  resolveHydration?.();
  console.log('Hydration process complete.');
}


export async function persistToFirestore(
  keysToUpdate?: (keyof typeof DATA_ARRAYS)[]
) {
  if (!db) {
    console.warn('Persist skipped: Firebase not configured.');
    return;
  }
  
  const keys = keysToUpdate && keysToUpdate.length > 0 ? keysToUpdate : Object.keys(DATA_ARRAYS) as (keyof typeof DATA_ARRAYS)[];
  
  const dataToPersist: { [key: string]: any } = {};
  for (const key of keys) {
    if (DATA_ARRAYS[key] !== undefined) {
      dataToPersist[key] = DATA_ARRAYS[key];
    }
  }
  
  const sanitizedData = sanitizeObjectForFirestore(dataToPersist);
  try {
    const docRef = doc(db, 'database', DATA_STORE_ID);
    await setDoc(docRef, sanitizedData, { merge: true });
    
    console.log(`Data successfully persisted to Firestore on keys: ${keys.join(', ')}`);
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
