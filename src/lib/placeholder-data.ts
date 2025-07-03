

import type {
  Vehicle,
  ServiceRecord,
  Technician,
  InventoryItem,
  DashboardMetrics,
  SaleReceipt,
  ServiceSupply,
  TechnicianMonthlyPerformance,
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
export let placeholderCategories: InventoryCategory[] = [];
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
];

export let placeholderAppRoles: AppRole[] = [];

// =======================================
// ===          OPERACIONES              ===
// =======================================

// --- SERVICIOS ---
export let placeholderServiceRecords: ServiceRecord[] = [];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = [];

// --- VENTAS (POS) ---
export let placeholderSales: SaleReceipt[] = [];

// --- GASTOS FIJOS ---
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];

// --- LISTA DE PRECIOS ---
export let placeholderVehiclePriceLists: VehiclePriceList[] = [];

// --- REPORTES PUBLICOS ---
export let placeholderPublicOwnerReports: PublicOwnerReport[] = [];

// --- DATOS SIMULADOS (BORRAR O REEMPLAZAR) ---
export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 0,
  technicianEarnings: 0,
  dailyRevenue: 0,
  lowStockAlerts: 0,
};

export let placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [];

// =======================================
// ===  LÓGICA DE PERSISTENCIA DE DATOS  ===
// =======================================

const DB_PATH = 'database/main'; // The single document in Firestore to hold all data

const DATA_ARRAYS = {
  categories: placeholderCategories,
  suppliers: placeholderSuppliers,
  inventory: placeholderInventory,
  vehicles: placeholderVehicles,
  technicians: placeholderTechnicians,
  administrativeStaff: placeholderAdministrativeStaff,
  users: placeholderUsers,
  serviceRecords: placeholderServiceRecords,
  quotes: placeholderQuotes,
  sales: placeholderSales,
  fixedExpenses: placeholderFixedMonthlyExpenses,
  technicianPerformance: placeholderTechnicianMonthlyPerformance,
  appRoles: placeholderAppRoles,
  vehiclePriceLists: placeholderVehiclePriceLists,
  drivers: placeholderDrivers,
  rentalPayments: placeholderRentalPayments,
  publicOwnerReports: placeholderPublicOwnerReports,
  ownerWithdrawals: placeholderOwnerWithdrawals,
  vehicleExpenses: placeholderVehicleExpenses,
};

type DataKey = keyof typeof DATA_ARRAYS;

// --------------------------------------------------------------------------------
// Hydration helpers
// --------------------------------------------------------------------------------
let resolveHydration: () => void;
/**
 * Promise que se resuelve cuando la app terminó de hidratar sus datos, útil
 * para deshabilitar acciones (como Registrar Venta) hasta que el inventario
 * esté disponible.
 */
export const hydrateReady = new Promise<void>((res) => {
  resolveHydration = res;
});

/**
 * Removes properties with `undefined` values from an object, recursively.
 * This is necessary because Firestore does not support `undefined`.
 * @param obj The object to sanitize.
 * @returns A new object with `undefined` values removed.
 */
export function sanitizeObjectForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectForFirestore(item));
  }

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


/**
 * Loads all application data from a single Firestore document.
 */
export async function hydrateFromFirestore() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    return;
  }

  if (!db) {
    console.warn('Hydration skipped: Firebase not configured. App running in demo mode.');
    (window as any).__APP_HYDRATED__ = true;
    resolveHydration?.();
    return;
  }

  console.log('Attempting to hydrate application data from Firestore...');
  const docRef = doc(db, DB_PATH);
  let docSnap;
  let changesMade = false;

  try {
    docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('Firestore document found. Hydrating from snapshot.');
      const firestoreData = docSnap.data();
      for (const key in DATA_ARRAYS) {
        if (firestoreData[key] && Array.isArray(firestoreData[key])) {
          const targetArray = DATA_ARRAYS[key as DataKey];
          targetArray.splice(0, targetArray.length, ...firestoreData[key]);
        }
      }
    } else {
      // Document doesn't exist. Check if any local arrays have data from a previous session.
      const hasLocalData = Object.values(DATA_ARRAYS).some((arr) => arr.length > 0);

      if (hasLocalData) {
        console.warn('No database document found, but local data exists. Persisting local data to new document to prevent loss.');
        changesMade = true; // Mark to trigger persistence of all data
      } else {
        console.warn('No database document found. Seeding the app with initial default data.');
        // Seed with default data only if there's no local data either
        placeholderFixedMonthlyExpenses.splice(0, placeholderFixedMonthlyExpenses.length, ...[
          { id: 'exp_1', name: 'Renta del Local', amount: 12000 },
          { id: 'exp_2', name: 'Servicio de Internet', amount: 800 },
          { id: 'exp_3', name: 'Servicio de Luz', amount: 2500 },
          { id: 'exp_4', name: 'Servicio de Agua', amount: 600 },
        ]);

        const adminPermissions = ALL_AVAILABLE_PERMISSIONS.filter((p) => !['users:manage', 'roles:manage'].includes(p.id)).map((p) => p.id);

        const defaultRoles: AppRole[] = [
          {
            id: 'role_superadmin_default',
            name: 'Superadmin',
            permissions: ALL_AVAILABLE_PERMISSIONS.map((p) => p.id),
          },
          { id: 'role_admin_default', name: 'Admin', permissions: adminPermissions },
          {
            id: 'role_tecnico_default',
            name: 'Tecnico',
            permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:view', 'vehicles:manage', 'pos:view_sales'],
          },
          {
            id: 'role_ventas_default',
            name: 'Ventas',
            permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view', 'vehicles:manage'],
          },
        ];
        placeholderAppRoles.splice(0, placeholderAppRoles.length, ...defaultRoles);
        changesMade = true;
      }
    }
  } catch (error) {
    console.error('Error reading from Firestore:', error);
    console.warn('Could not read from Firestore. This might be due to Firestore rules. The app will proceed with in-memory data for this session.');
  }

  // --- ONE-TIME DATA MIGRATION: Assign completed services to a specific technician ---
  const technicianToAssign = placeholderTechnicians.find(t => t.name === 'Guillermo Martinez Lozano');
  if (technicianToAssign) {
    let servicesUpdatedCount = 0;
    placeholderServiceRecords.forEach(service => {
      if (service.status === 'Completado') {
        // Update only if it's not already assigned to him
        if(service.technicianId !== technicianToAssign.id) {
          service.technicianId = technicianToAssign.id;
          service.technicianName = technicianToAssign.name;
          servicesUpdatedCount++;
        }
      }
    });
    if (servicesUpdatedCount > 0) {
        console.log(`[MIGRATION] Assigned ${servicesUpdatedCount} completed services to ${technicianToAssign.name}.`);
        changesMade = true;
    }
  } else {
      console.warn("[MIGRATION SKIPPED] Could not find technician 'Guillermo Martinez Lozano'.");
  }


  // --- DATA INTEGRITY CHECKS ---
  if (!placeholderUsers.some((u) => u.id === defaultSuperAdmin.id)) {
    placeholderUsers.unshift(defaultSuperAdmin);
    changesMade = true;
    console.log(`Default user '${defaultSuperAdmin.email}' was missing and has been added to the current session.`);
  }
  
  // Ensure roles have all available permissions after hydrating
  const superAdminRole = placeholderAppRoles.find(r => r.name === 'Superadmin');
  const allPermissionIds = ALL_AVAILABLE_PERMISSIONS.map(p => p.id);
  if (superAdminRole && superAdminRole.permissions.length < allPermissionIds.length) {
    console.log("Updating Superadmin role with latest permissions...");
    superAdminRole.permissions = allPermissionIds;
    changesMade = true;
  }
  
  const adminRole = placeholderAppRoles.find(r => r.name === 'Admin');
  const adminPermissions = ALL_AVAILABLE_PERMISSIONS.filter(p => !['users:manage', 'roles:manage'].includes(p.id)).map(p => p.id);
  if (adminRole && adminRole.permissions.length < adminPermissions.length) {
      console.log("Updating Admin role with latest permissions...");
      adminRole.permissions = adminPermissions;
      changesMade = true;
  }


  (window as any).__APP_HYDRATED__ = true;
  resolveHydration?.();
  console.log('Hydration process complete.');

  // If the document didn't exist or we had to make integrity changes, persist back to Firestore.
  if (changesMade && db) {
    console.log('Attempting to persist initial/updated data to Firestore in the background...');
    const keysToPersist = Object.keys(DATA_ARRAYS) as DataKey[];
    persistToFirestore(keysToPersist).catch((err) => {
      console.error('Background persistence failed:', err);
    });
  }
}

/**
 * Saves specific parts of the application state from memory to a single Firestore document.
 * @param keysToUpdate An array of keys corresponding to the data arrays to be updated.
 */
export async function persistToFirestore(keysToUpdate?: DataKey[]) {
  if (!db) {
    console.warn('Persist skipped: Firebase not configured.');
    return;
  }
  if (typeof window === 'undefined' || !(window as any).__APP_HYDRATED__) {
    console.warn('Persist skipped: App not yet hydrated.');
    return;
  }

  const keys = keysToUpdate && keysToUpdate.length > 0 ? keysToUpdate : (Object.keys(DATA_ARRAYS) as DataKey[]);

  console.log(`Persisting granular data to Firestore for keys: ${keys.join(', ')}`);

  const dataToPersist: { [key in DataKey]?: any[] } = {} as any;

  for (const key of keys) {
    if (DATA_ARRAYS[key]) {
      dataToPersist[key] = DATA_ARRAYS[key];
    }
  }
  
  const sanitizedData = sanitizeObjectForFirestore(dataToPersist);

  try {
    // Use setDoc with merge:true to only update the specified fields in the document
    await setDoc(doc(db, DB_PATH), sanitizedData, { merge: true });
    console.log('Data successfully persisted to Firestore.');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('databaseUpdated'));
    }
  } catch (e) {
    console.error('Error persisting data to Firestore:', e);
  }
}

// =======================================
// ===          FUNCIONES HELPER         ===
// =======================================
export const getCurrentMonthRange = () => {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
};

export const getLastMonthRange = () => {
  const now = new Date();
  const lastMonthDate = subMonths(now, 1);
  return { from: startOfMonth(lastMonthDate), to: endOfMonth(lastMonthDate) };
};

export const getTodayRange = () => {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now) };
};

export const getYesterdayRange = () => {
  const now = new Date();
  const yesterday = subDays(now, 1);
  return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
};

/**
 * Calculates the profit of a POS sale.
 * Profit = Total Sale Amount - Total Cost of Goods Sold.
 */
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
  
  const profit = sale.totalAmount - totalCost;
  
  return isFinite(profit) ? profit : 0;
};


/**
 * Crea un ServiceRecord listo para imprimir sustituyendo el unitPrice de supplies
 * por su sellingPrice.
 */
export const enrichServiceForPrinting = (
  service: ServiceRecord,
  inventory: InventoryItem[],
): ServiceRecord => {
  if (!service || !service.suppliesUsed) return service;

  const enrichedSupplies = service.suppliesUsed.map((supply) => {
    const inventoryItem = inventory.find((item) => item.id === supply.supplyId);
    return {
      ...supply,
      unitPrice: inventoryItem?.sellingPrice ?? supply.unitPrice ?? 0,
    };
  });

  return {
    ...service,
    suppliesUsed: enrichedSupplies,
  };
};
