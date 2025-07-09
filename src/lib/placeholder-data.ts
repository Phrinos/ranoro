
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
  CashDrawerTransaction,
  InitialCashBalance,
  AuditLog,
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
export let placeholderAuditLogs: AuditLog[] = [
  {
    id: 'log_1',
    date: new Date().toISOString(),
    userId: 'user_superadmin',
    userName: 'Arturo Valdelamar',
    actionType: 'Crear',
    description: 'Creó el nuevo servicio #SER003 para el vehículo CCC789C.',
    entityType: 'Servicio',
    entityId: 'SER003'
  },
  {
    id: 'log_2',
    date: subDays(new Date(), 1).toISOString(),
    userId: 'user_admin',
    userName: 'Laura Mendez',
    actionType: 'Editar',
    description: 'Actualizó el precio del producto "Aceite Sintético 5W-30" a $180.00.',
    entityType: 'Producto',
    entityId: 'PROD001'
  }
];


// =======================================
// ===          OPERACIONES              ===
// =======================================

// --- SERVICIOS ---
export let placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'SER002',
    vehicleId: 'VEH002',
    vehicleIdentifier: 'BBB456B',
    serviceDate: subDays(new Date(), 5).toISOString(),
    description: 'Diagnóstico de sistema eléctrico.',
    technicianId: 'T002',
    technicianName: 'Ricardo Gomez',
    serviceItems: [
      {
        id: 'item_ser002_1',
        name: 'Diagnóstico de sistema eléctrico.',
        price: 1200,
        suppliesUsed: [
          { supplyId: 'SERV001', supplyName: 'Mano de Obra Mecánica', quantity: 2, unitPrice: 250, sellingPrice: 350 },
        ]
      }
    ],
    totalCost: 1200,
    totalSuppliesCost: 500,
    serviceProfit: 700,
    status: 'Reparando',
    mileage: 89000,
    serviceAdvisorId: 'user_superadmin',
    serviceAdvisorName: 'Arturo Valdelamar'
  },
  {
    id: 'SER003',
    vehicleId: 'VEH003',
    vehicleIdentifier: 'CCC789C',
    serviceDate: new Date().toISOString(),
    description: 'Mantenimiento preventivo flotilla.',
    technicianId: 'T001',
    technicianName: 'Carlos Rodriguez',
    serviceItems: [
        {
            id: 'item_ser003_1',
            name: 'Mantenimiento preventivo flotilla.',
            price: 1800,
            suppliesUsed: []
        }
    ],
    totalCost: 1800,
    status: 'Agendado',
    mileage: 15000,
    serviceAdvisorId: 'user_superadmin',
    serviceAdvisorName: 'Arturo Valdelamar'
  }
];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = [];

// --- VENTAS (POS) ---
export let placeholderSales: SaleReceipt[] = [
    {
      id: 'SALE001',
      saleDate: subDays(new Date(), 1).toISOString(),
      items: [
        { inventoryItemId: 'PROD004', itemName:'Limpiaparabrisas 22"', quantity: 2, unitPrice: 200, totalPrice: 400 },
      ],
      subTotal: 344.83,
      tax: 55.17,
      totalAmount: 400,
      paymentMethod: 'Tarjeta',
      customerName: 'Cliente Mostrador',
      status: 'Completado'
    },
];

// --- GASTOS FIJOS Y CAJA ---
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];
export let placeholderCashDrawerTransactions: CashDrawerTransaction[] = [
    { id: 'trx_1', date: new Date().toISOString(), type: 'Entrada', amount: 500, concept: 'Fondo de caja inicial', userId: 'user_superadmin', userName: 'Arturo Valdelamar' },
    { id: 'trx_2', date: new Date().toISOString(), type: 'Salida', amount: 150, concept: 'Compra de garrafón de agua', userId: 'user_superadmin', userName: 'Arturo Valdelamar' }
];
export let placeholderInitialCashBalance: InitialCashBalance | null = {
    date: new Date().toISOString(),
    amount: 500,
    userId: 'user_superadmin',
    userName: 'Arturo Valdelamar'
};


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
  cashDrawerTransactions: placeholderCashDrawerTransactions,
  initialCashBalance: placeholderInitialCashBalance,
  technicianPerformance: placeholderTechnicianMonthlyPerformance,
  appRoles: placeholderAppRoles,
  vehiclePriceLists: placeholderVehiclePriceLists,
  drivers: placeholderDrivers,
  rentalPayments: placeholderRentalPayments,
  publicOwnerReports: placeholderPublicOwnerReports,
  ownerWithdrawals: placeholderOwnerWithdrawals,
  vehicleExpenses: placeholderVehicleExpenses,
  auditLogs: placeholderAuditLogs,
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
        if (firestoreData[key]) {
           const targetArray = DATA_ARRAYS[key as DataKey];
           // Handle single object persistence (for initialCashBalance)
           if (!Array.isArray(targetArray)) {
              if (key === 'initialCashBalance') {
                 placeholderInitialCashBalance = firestoreData[key];
              }
           } else if (Array.isArray(firestoreData[key])) {
              targetArray.splice(0, targetArray.length, ...firestoreData[key]);
           }
        }
      }
    } else {
      // Document doesn't exist. Check if any local arrays have data from a previous session.
      const hasLocalData = Object.values(DATA_ARRAYS).some((arr) => Array.isArray(arr) && arr.length > 0);

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
  // DEV MODE: Disable Firestore writes by setting this to `true`.
  const DEV_MODE_SKIP_PERSISTENCE = true;
  if (DEV_MODE_SKIP_PERSISTENCE) { 
      console.log(`[DEV MODE] Persist to Firestore skipped for keys: ${keysToUpdate?.join(', ')}`);
      if (typeof window !== 'undefined') {
          // Dispatch event to keep local UI consistent with in-memory changes
          window.dispatchEvent(new CustomEvent('databaseUpdated'));
      }
      return;
  }

  // The code below is now disabled in dev mode.
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

  const dataToPersist: { [key in DataKey]?: any } = {} as any;

  for (const key of keys) {
    if (DATA_ARRAYS[key] !== undefined) {
      dataToPersist[key] = DATA_ARRAYS[key];
    }
  }
  
  const sanitizedData = sanitizeObjectForFirestore(dataToPersist);

  try {
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

/**
 * Creates and persists an audit log entry.
 */
export async function logAudit(
  actionType: AuditLog['actionType'],
  description: string,
  details: {
    entityType?: AuditLog['entityType'];
    entityId?: string;
    userId?: string;
    userName?: string;
  } = {}
) {
  // Get current user from localStorage if not provided
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
    } catch (e) {
      console.error("Could not get user for audit log:", e);
    }
  }

  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: new Date().toISOString(),
    userId: userId || 'system',
    userName: userName || 'Sistema',
    actionType,
    description,
    entityType: details.entityType,
    entityId: details.entityId,
  };

  placeholderAuditLogs.unshift(newLog); // Add to the beginning of the array
  await persistToFirestore(['auditLogs']);
}


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
