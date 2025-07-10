
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
    id: 'VEH001',
    make: 'Nissan',
    model: 'Versa',
    year: 2020,
    ownerName: 'Juan Perez',
    ownerPhone: '4491234567',
    licensePlate: 'AAA123A',
  },
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

export let placeholderUsers: User[] = [
  { id: 'diana_user_id', name: 'Diana Arriaga', email: 'diana@ranoro.mx', role: 'Admin' }
]; // This will be hydrated from Firestore
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
// MIGRATED DATA - This data now follows the standardized ServiceRecord structure.
export let placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'SER001',
    publicId: 's_qwert12345',
    vehicleId: 'VEH001',
    vehicleIdentifier: 'AAA123A',
    serviceDate: subDays(new Date(), 10).toISOString(),
    deliveryDateTime: subDays(new Date(), 9).toISOString(),
    serviceType: 'Cambio de Aceite',
    description: 'Cambio de aceite y filtro.',
    technicianId: 'T001',
    technicianName: 'Carlos Rodriguez',
    serviceItems: [
      {
        id: 'item_ser001_1',
        name: 'Cambio de aceite y filtro',
        price: 850,
        suppliesUsed: [
          { supplyId: 'PROD001', supplyName: 'Aceite Sintético 5W-30', quantity: 4.5, unitPrice: 150, sellingPrice: 180 },
          { supplyId: 'PROD002', supplyName: 'Filtro de Aceite', quantity: 1, unitPrice: 80, sellingPrice: 96 },
        ]
      }
    ],
    totalCost: 850,
    totalSuppliesCost: 755, // (4.5 * 150) + 80
    serviceProfit: 95, // 850 - 755
    subTotal: 732.76,
    taxAmount: 117.24,
    status: 'Entregado',
    mileage: 75000,
    serviceAdvisorId: 'diana_user_id',
    serviceAdvisorName: 'Diana Arriaga',
    appointmentStatus: 'Confirmada',
  },
  {
    id: 'SER002',
    publicId: 's_zxcvbnm123',
    vehicleId: 'VEH002',
    vehicleIdentifier: 'BBB456B',
    serviceDate: subDays(new Date(), 5).toISOString(),
    serviceType: 'Servicio General',
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
    totalSuppliesCost: 500, // 2 * 250
    serviceProfit: 700, // 1200 - 500
    subTotal: 1034.48,
    taxAmount: 165.52,
    status: 'En Taller',
    mileage: 89000,
    serviceAdvisorId: 'diana_user_id',
    serviceAdvisorName: 'Diana Arriaga',
    appointmentStatus: 'Confirmada',
  },
  {
    id: 'SER003',
    publicId: 's_asdfghj456',
    vehicleId: 'VEH003',
    vehicleIdentifier: 'CCC789C',
    serviceDate: new Date().toISOString(),
    serviceType: 'Servicio General',
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
    totalSuppliesCost: 0,
    serviceProfit: 1800,
    subTotal: 1551.72,
    taxAmount: 248.28,
    status: 'Agendado',
    mileage: 15000,
    serviceAdvisorId: 'diana_user_id',
    serviceAdvisorName: 'Diana Arriaga',
    appointmentStatus: 'Creada',
  },
  {
    id: 'SER_mcxpk73o',
    publicId: 's_vbnmkl345',
    vehicleId: 'VEH002',
    vehicleIdentifier: 'BBB456B',
    serviceDate: subMonths(new Date(), 1).toISOString(),
    deliveryDateTime: subMonths(new Date(), 1).toISOString(),
    serviceType: 'Servicio General',
    description: 'Reparación de suspensión.',
    technicianId: 'T001',
    technicianName: 'Carlos Rodriguez',
    serviceItems: [
      {
        id: 'item_ser_mcxpk73o_1',
        name: 'Cambio de amortiguadores',
        price: 2500,
        suppliesUsed: [
          { supplyId: 'PROD005', supplyName: 'Amortiguador Delantero', quantity: 2, unitPrice: 800, sellingPrice: 960 },
        ]
      }
    ],
    totalCost: 2500,
    totalSuppliesCost: 1600,
    serviceProfit: 900,
    subTotal: 2155.17,
    taxAmount: 344.83,
    status: 'Entregado',
    mileage: 85000,
    serviceAdvisorId: 'diana_user_id',
    serviceAdvisorName: 'Diana Arriaga',
    appointmentStatus: 'Confirmada',
  },
];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = []; // This is now obsolete, quotes are ServiceRecords with status 'Cotizacion'

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

// =======================================
// ===  LÓGICA DE PERSISTENCIA DE DATOS  ===
// =======================================

// IMPORTANT: Set this to `true` to enable local persistence without affecting the database.
const DEV_MODE_LOCAL_ONLY = false;

const DB_PATH = 'database/main'; // The single document in Firestore to hold all data
const LOCALSTORAGE_DB_KEY = 'ranoroLocalDatabase';

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
  appRoles: placeholderAppRoles,
  vehiclePriceLists: placeholderVehiclePriceLists,
  drivers: placeholderDrivers,
  rentalPayments: placeholderRentalPayments,
  publicOwnerReports: placeholderPublicOwnerReports,
  ownerWithdrawals: placeholderOwnerWithdrawals,
  vehicleExpenses: placeholderVehicleExpenses,
  auditLogs: placeholderAuditLogs,
  serviceTypes: placeholderServiceTypes,
};

type DataKey = keyof typeof DATA_ARRAYS;

const saveToLocalStorage = () => {
    try {
        const dataToSave = sanitizeObjectForFirestore(DATA_ARRAYS);
        localStorage.setItem(LOCALSTORAGE_DB_KEY, JSON.stringify(dataToSave));
    } catch (e) {
        console.error("Failed to save data to localStorage:", e);
    }
};

const hydrateFromLocalStorage = (): boolean => {
    try {
        const localDataString = localStorage.getItem(LOCALSTORAGE_DB_KEY);
        if (localDataString) {
            const localData = JSON.parse(localDataString);
            for (const key in DATA_ARRAYS) {
                if (localData[key]) {
                    const targetArray = DATA_ARRAYS[key as DataKey];
                    if (!Array.isArray(targetArray)) {
                        if (key === 'initialCashBalance') {
                            placeholderInitialCashBalance = localData[key];
                        }
                    } else if (Array.isArray(localData[key])) {
                        targetArray.splice(0, targetArray.length, ...localData[key]);
                    }
                }
            }
            console.log('Hydrated successfully from localStorage.');
            return true;
        }
    } catch (e) {
        console.error("Failed to hydrate from localStorage:", e);
    }
    return false;
};

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
    resolveHydration?.();
    return;
  }
  
  if (DEV_MODE_LOCAL_ONLY) {
    console.warn('[DEV MODE] Persistence is local. Hydrating from localStorage.');
    const hydratedFromLocal = hydrateFromLocalStorage();
    if (!hydratedFromLocal) {
        console.log('No local data found, seeding with default placeholder data.');
        // Ensure default roles and users are present if local storage is empty
        if (placeholderAppRoles.length === 0) {
            const adminPermissions = ALL_AVAILABLE_PERMISSIONS.filter(p => !['users:manage', 'roles:manage'].includes(p.id)).map(p => p.id);
            placeholderAppRoles.push(
                { id: 'role_superadmin_default', name: 'Superadmin', permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id) },
                { id: 'role_admin_default', name: 'Admin', permissions: adminPermissions },
                { id: 'role_tecnico_default', name: 'Tecnico', permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:view', 'vehicles:manage', 'pos:view_sales'] },
                { id: 'role_ventas_default', name: 'Ventas', permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view', 'vehicles:manage'] }
            );
        }
        if (!placeholderUsers.some(u => u.id === defaultSuperAdmin.id)) {
            placeholderUsers.unshift(defaultSuperAdmin);
        }
        saveToLocalStorage(); // Save the initial defaults
    }
    
    (window as any).__APP_HYDRATED__ = true;
    resolveHydration?.();
    return;
  }

  // --- Production Firestore logic ---
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
      console.warn('No database document found. Seeding the app with initial default data.');
      placeholderFixedMonthlyExpenses.splice(0, placeholderFixedMonthlyExpenses.length, ...[
        { id: 'exp_1', name: 'Renta del Local', amount: 12000 },
        { id: 'exp_2', name: 'Servicio de Internet', amount: 800 },
        { id: 'exp_3', name: 'Servicio de Luz', amount: 2500 },
        { id: 'exp_4', name: 'Servicio de Agua', amount: 600 },
      ]);
      changesMade = true;
    }
  } catch (error) {
    console.error('Error reading from Firestore:', error);
    console.warn('Could not read from Firestore. The app will proceed with in-memory data for this session.');
  }

  // --- DATA INTEGRITY CHECKS ---
  if (!placeholderUsers.some((u) => u.email.toLowerCase() === defaultSuperAdmin.email.toLowerCase())) {
    placeholderUsers.unshift(defaultSuperAdmin);
    changesMade = true;
    console.log(`Default user '${defaultSuperAdmin.email}' was missing and has been added.`);
  }
  
  const superAdminRole = placeholderAppRoles.find(r => r.name === 'Superadmin');
  if (!superAdminRole) {
    const adminPermissions = ALL_AVAILABLE_PERMISSIONS.filter(p => !['users:manage', 'roles:manage'].includes(p.id)).map(p => p.id);
    placeholderAppRoles.push(
      { id: 'role_superadmin_default', name: 'Superadmin', permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id) },
      { id: 'role_admin_default', name: 'Admin', permissions: adminPermissions },
      { id: 'role_tecnico_default', name: 'Tecnico', permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:view', 'vehicles:manage', 'pos:view_sales'] }
    );
    changesMade = true;
  }

  (window as any).__APP_HYDRATED__ = true;
  resolveHydration?.();
  console.log('Hydration process complete.');

  if (changesMade && db) {
    console.log('Attempting to persist initial/updated data to Firestore...');
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
  if (DEV_MODE_LOCAL_ONLY) { 
      saveToLocalStorage();
      console.log(`[DEV MODE] Data persisted to localStorage for keys: ${keysToUpdate?.join(', ')}`);
      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('databaseUpdated'));
      }
      return;
  }

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

  placeholderAuditLogs.unshift(newLog);
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
  
  const totalAmountPreTax = sale.totalAmount / (1 + IVA_RATE);
  const profit = totalAmountPreTax - totalCost;
  
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

// --- MIGRATION FUNCTIONS (to be removed or adapted) ---

export async function migrateVehicles(csvData: any[]): Promise<{ count: number }> {
    let vehiclesAdded = 0;
    csvData.forEach(row => {
        const licensePlate = row['Placa'] || row['placa'];
        if (licensePlate && !placeholderVehicles.find(v => v.licensePlate === licensePlate)) {
            const newVehicle: Vehicle = {
                id: `VEH_MIG_${vehiclesAdded}`,
                make: row['Marca'] || row['marca'] || 'N/A',
                model: row['Modelo'] || row['modelo'] || 'N/A',
                year: Number(row['Año'] || row['año']) || 2000,
                ownerName: row['Cliente'] || row['cliente'] || 'N/A',
                ownerPhone: String(row['Telefono'] || row['telefono'] || 'N/A'),
                licensePlate: licensePlate,
            };
            placeholderVehicles.push(newVehicle);
            vehiclesAdded++;
        }
    });
    if (vehiclesAdded > 0) await persistToFirestore(['vehicles']);
    return { count: vehiclesAdded };
}

export async function migrateProducts(csvData: any[]): Promise<{ count: number }> {
  let productsAdded = 0;
  csvData.forEach(row => {
    const sku = row['SKU'] || row['sku'] || `PROD_MIG_${productsAdded}`;
    if (sku && !placeholderInventory.find(p => p.sku === sku)) {
      const newProduct: InventoryItem = {
        id: `PROD_MIG_${productsAdded}`,
        sku: sku,
        name: row['Nombre'] || row['nombre'] || 'Producto Migrado',
        quantity: Number(row['Cantidad'] || row['cantidad'] || 0),
        unitPrice: Number(row['Precio de Compra'] || row['precio de compra'] || 0),
        sellingPrice: Number(row['Precio de Venta'] || row['precio de venta'] || 0),
        category: 'Migración',
        supplier: 'Migración',
        lowStockThreshold: 1,
      };
      placeholderInventory.push(newProduct);
      productsAdded++;
    }
  });
  if (productsAdded > 0) await persistToFirestore(['inventory']);
  return { count: productsAdded };
}


export async function migrateData(vehiclesData: any[], servicesData: any[]): Promise<{ vehicles: number, services: number }> {
    let vehiclesAdded = 0;
    vehiclesData.forEach(row => {
        const licensePlate = row['Placa'];
        if (licensePlate && !placeholderVehicles.find(v => v.licensePlate === licensePlate)) {
            const newVehicle: Vehicle = {
                id: `VEH_MIG_G_${vehiclesAdded}`,
                make: row['Marca'] || 'N/A',
                model: row['Modelo'] || 'N/A',
                year: Number(row['Año']) || 2000,
                ownerName: row['Cliente'] || 'N/A',
                ownerPhone: String(row['Telefono'] || 'N/A'),
                licensePlate: licensePlate,
            };
            placeholderVehicles.push(newVehicle);
            vehiclesAdded++;
        }
    });

    let servicesAdded = 0;
    servicesData.forEach(row => {
        const vehicle = placeholderVehicles.find(v => v.licensePlate === row['Placa']);
        if (vehicle) {
            const newService: ServiceRecord = {
                id: `SER_MIG_G_${servicesAdded}`,
                vehicleId: vehicle.id,
                vehicleIdentifier: vehicle.licensePlate,
                serviceDate: row['Fecha'] ? new Date(row['Fecha']).toISOString() : new Date().toISOString(),
                description: row['Descripción'] || 'Servicio migrado',
                totalCost: Number(row['Costo']) || 0,
                status: 'Entregado',
                technicianId: 'T001',
                serviceItems: [],
                subTotal: 0,
                taxAmount: 0,
                totalSuppliesCost: 0,
                serviceProfit: 0,
            };
            placeholderServiceRecords.push(newService);
            servicesAdded++;
        }
    });
    
    if (vehiclesAdded > 0 || servicesAdded > 0) {
        await persistToFirestore(['vehicles', 'serviceRecords']);
    }

    return { vehicles: vehiclesAdded, services: servicesAdded };
}
