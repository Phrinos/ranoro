
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff, User } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@root/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';


const IVA_RATE = 0.16;

// =======================================
// ===          CATEGORÍAS Y PROVEEDORES          ===
// =======================================
export let placeholderCategories: InventoryCategory[] = [];

export let placeholderSuppliers: Supplier[] = [];

// =======================================
// ===          INVENTARIO          ===
// =======================================
export let placeholderInventory: InventoryItem[] = [];

// =======================================
// ===          VEHÍCULOS          ===
// =======================================
export let placeholderVehicles: Vehicle[] = [];

// =======================================
// ===          PERSONAL          ===
// =======================================
export let placeholderTechnicians: Technician[] = [];

export let placeholderAdministrativeStaff: AdministrativeStaff[] = [];

// =======================================
// ===          USUARIOS Y ROLES         ===
// =======================================
export const defaultSuperAdmin: User = {
  id: 'RaMVBO4UZeTeNW1BZlmwWMg9Na32',
  name: 'Arturo Valdelamar',
  email: 'arturo@ranoro.mx',
  role: 'Superadmin',
  password: 'CA1abaza',
  phone: '4493930914'
};

export const newUserAdmin: User = {
  id: 'KTZCiJCsOiTm1RVCTSQ9zdNcdxm2',
  name: 'Panda Computacion',
  email: 'pandacomputacion@gmail.com',
  role: 'Admin',
  password: 'CA1abaza',
};

export const dianaArriagaUser: User = {
  id: 'd1AnAArr1agaAdm1nRan0r0MX2025',
  name: 'Diana Arriaga',
  email: 'diana.arriaga@ranoro.mx',
  role: 'Admin',
  password: 'Ranoro2025',
};

export let placeholderUsers: User[] = [defaultSuperAdmin, newUserAdmin, dianaArriagaUser]; // This will be hydrated from Firestore
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
    { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
    { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
    { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
];

export let placeholderAppRoles: AppRole[] = [];

// =======================================
// ===          OPERACIONES          ===
// =======================================

// --- SERVICIOS ---
export let placeholderServiceRecords: ServiceRecord[] = [];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = [];

// --- VENTAS (POS) ---
export let placeholderSales: SaleReceipt[] = [];

// --- GASTOS FIJOS ---
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];

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
};

/**
 * Loads all application data from a single Firestore document.
 * This function is now more resilient to read failures.
 */
export async function hydrateFromFirestore() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    return;
  }

  console.log("Attempting to hydrate application data from Firestore...");
  const docRef = doc(db, DB_PATH);
  let docSnap;
  let changesMade = false;

  try {
    docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Firestore document found. Hydrating from snapshot.");
      const firestoreData = docSnap.data();
      for (const key in DATA_ARRAYS) {
        if (firestoreData[key] && Array.isArray(firestoreData[key])) {
          const targetArray = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
          targetArray.splice(0, targetArray.length, ...firestoreData[key]);
        }
      }
    } else {
      console.warn("No database document found. The application will be seeded with initial data.");
    }
  } catch (error) {
    console.error("Error reading from Firestore:", error);
    console.warn("Could not read from Firestore. This might be due to Firestore rules. The app will proceed with in-memory data for this session.");
  }

  // --- DATA INTEGRITY CHECKS ---
  // Always ensure default users exist in memory, regardless of what was loaded from the database.
  // This makes the app resilient to a corrupted or empty 'users' array in the DB.
  if (!placeholderUsers.some(u => u.id === defaultSuperAdmin.id)) {
    placeholderUsers.unshift(defaultSuperAdmin);
    changesMade = true;
    console.log(`Default user '${defaultSuperAdmin.email}' was missing and has been added to the current session.`);
  }
  if (!placeholderUsers.some(u => u.id === newUserAdmin.id)) {
    placeholderUsers.push(newUserAdmin);
    changesMade = true;
    console.log(`Default user '${newUserAdmin.email}' was missing and has been added to the current session.`);
  }
  if (!placeholderUsers.some(u => u.id === dianaArriagaUser.id)) {
    placeholderUsers.push(dianaArriagaUser);
    changesMade = true;
    console.log(`Default user '${dianaArriagaUser.email}' was missing and has been added to the current session.`);
  }

  // Check for AppRoles
  if (!docSnap?.exists() || !docSnap.data()?.appRoles || docSnap.data()?.appRoles.length === 0) {
      console.log("No roles found in DB, seeding default roles.");
      const adminPermissions = ALL_AVAILABLE_PERMISSIONS
          .filter(p => !['users:manage', 'roles:manage'].includes(p.id))
          .map(p => p.id);
      
      const defaultRoles: AppRole[] = [
          { id: 'role_superadmin_default', name: 'Superadmin', permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id) },
          { id: 'role_admin_default', name: 'Admin', permissions: adminPermissions },
          { id: 'role_tecnico_default', name: 'Tecnico', permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:view', 'vehicles:manage', 'pos:view_sales'] },
          { id: 'role_ventas_default', name: 'Ventas', permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view', 'vehicles:manage'] }
      ];
      placeholderAppRoles.splice(0, placeholderAppRoles.length, ...defaultRoles);
      changesMade = true;
  }
  
  (window as any).__APP_HYDRATED__ = true;
  console.log("Hydration process complete. Checking for necessary persistence...");

  // If the document didn't exist or we had to add a missing user, we should try to persist.
  if (!docSnap || !docSnap.exists() || changesMade) {
    console.log("Attempting to persist updated data to Firestore in the background...");
    // We don't await this so that the app can continue loading without waiting for the write to finish.
    // This is a "fire-and-forget" operation for faster startup.
    persistToFirestore().catch(err => {
        console.error("Background persistence failed:", err);
    });
  }
}


/**
 * Saves the entire application state from memory to a single Firestore document.
 */
export async function persistToFirestore() {
  // Do not persist if hydration hasn't occurred, to avoid overwriting cloud data with empty arrays.
  if (typeof window === 'undefined' || !(window as any).__APP_HYDRATED__) {
    console.warn("Persist skipped: App not yet hydrated.");
    return;
  }
  
  console.log("Persisting application data to Firestore...");

  const allData: { [key: string]: any[] } = {};
  for (const key in DATA_ARRAYS) {
      allData[key] = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
  }

  try {
    await setDoc(doc(db, DB_PATH), allData);
    console.log("Data successfully persisted to Firestore.");
  } catch (e) {
    console.error("Error persisting data to Firestore:", e);
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

export const calculateSaleProfit = (sale: SaleReceipt, inventory: InventoryItem[], ivaRate: number): number => {
  return sale.items.reduce((profit, saleItem) => {
      const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
      const costPrice = inventoryItem ? inventoryItem.unitPrice : 0;
      const sellingPriceSubTotal = saleItem.unitPrice / (1 + ivaRate);
      return profit + (sellingPriceSubTotal - costPrice) * saleItem.quantity;
  }, 0);
};

/**
 * Creates a new ServiceRecord object with the unitPrice of supplies
 * replaced by their sellingPrice for printing.
 * @param service The original service record.
 * @param inventory The full inventory list to look up selling prices.
 * @returns A new service record object suitable for printing.
 */
export const enrichServiceForPrinting = (service: ServiceRecord, inventory: InventoryItem[]): ServiceRecord => {
  if (!service || !service.suppliesUsed) return service;

  const enrichedSupplies = service.suppliesUsed.map(supply => {
    const inventoryItem = inventory.find(item => item.id === supply.supplyId);
    // The unitPrice for a ticket should be the selling price.
    // Fallback to the stored unitPrice (cost) if not found, though it should always be found.
    return {
      ...supply,
      unitPrice: inventoryItem?.sellingPrice || supply.unitPrice || 0,
    };
  });

  return {
    ...service,
    suppliesUsed: enrichedSupplies,
  };
};
