

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

export let placeholderUsers: User[] = [
  { id: 'diana_user_id', tenantId: 'T01H858YMEG5V6V3V3V3V3V3V3', name: 'Diana Arriaga', email: 'diana@ranoro.mx', role: 'Admin' }
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
export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [
    { id: 'perf_t001_1', technicianId: 'T001', monthYear: 'julio 2024', servicesCount: 12, revenueGenerated: 35000, earnings: 1750, penalties: 0 },
    { id: 'perf_t002_1', technicianId: 'T002', monthYear: 'julio 2024', servicesCount: 15, revenueGenerated: 42000, earnings: 2940, penalties: 150 },
    { id: 'perf_t001_2', technicianId: 'T001', monthYear: 'junio 2024', servicesCount: 10, revenueGenerated: 31000, earnings: 1550, penalties: 0 },
];
export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 3,
  technicianEarnings: 4690,
  dailyRevenue: 5200,
  lowStockAlerts: 2,
};

// --- DATA PERSISTENCE & HYDRATION ---

const DATA_ARRAYS = {
    vehicles: placeholderVehicles,
    serviceRecords: placeholderServiceRecords,
    technicians: placeholderTechnicians,
    inventory: placeholderInventory,
    categories: placeholderCategories,
    suppliers: placeholderSuppliers,
    sales: placeholderSales,
    users: placeholderUsers,
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

export async function hydrateFromFirestore() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    resolveHydration?.();
    return;
  }

  const superAdminExistsInPlaceholders = placeholderUsers.some(
    (u) => u.email === defaultSuperAdmin.email
  );
  if (!superAdminExistsInPlaceholders) {
    placeholderUsers.push(defaultSuperAdmin);
  }
  
  const tenantId = defaultSuperAdmin.tenantId;
  const docRef = doc(db, 'tenants', tenantId);
  let docSnap;
  let changesMade = false;

  try {
    docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const firestoreData = docSnap.data();
      Object.assign(placeholderVehicles, firestoreData.vehicles || []);
      Object.assign(placeholderServiceRecords, firestoreData.serviceRecords || []);
      Object.assign(placeholderTechnicians, firestoreData.technicians || []);
      Object.assign(placeholderInventory, firestoreData.inventory || []);
      Object.assign(placeholderCategories, firestoreData.categories || []);
      Object.assign(placeholderSuppliers, firestoreData.suppliers || []);
      Object.assign(placeholderSales, firestoreData.sales || []);
      Object.assign(placeholderUsers, firestoreData.users || [defaultSuperAdmin]);
      Object.assign(placeholderAppRoles, firestoreData.appRoles || []);
      Object.assign(placeholderFixedMonthlyExpenses, firestoreData.fixedExpenses || []);
      Object.assign(placeholderAdministrativeStaff, firestoreData.administrativeStaff || []);
      Object.assign(placeholderVehiclePriceLists, firestoreData.vehiclePriceLists || []);
      Object.assign(placeholderDrivers, firestoreData.drivers || []);
      Object.assign(placeholderRentalPayments, firestoreData.rentalPayments || []);
      Object.assign(placeholderOwnerWithdrawals, firestoreData.ownerWithdrawals || []);
      Object.assign(placeholderVehicleExpenses, firestoreData.vehicleExpenses || []);
      Object.assign(placeholderCashDrawerTransactions, firestoreData.cashDrawerTransactions || []);
      Object.assign(placeholderAuditLogs, firestoreData.auditLogs || []);
      Object.assign(placeholderServiceTypes, firestoreData.serviceTypes || []);
      if (firestoreData.initialCashBalance) {
        Object.assign(placeholderInitialCashBalance, firestoreData.initialCashBalance);
      } else {
        placeholderInitialCashBalance = null;
      }
      
    } else {
      console.warn('No database document found for tenant. Seeding with initial data.');
      changesMade = true;
    }
  } catch (error) {
    console.error('Error reading from Firestore, using local fallback:', error);
  }

  const superAdminExists = placeholderUsers.some(u => u.email === defaultSuperAdmin.email);
  if (!superAdminExists) {
      placeholderUsers.push(defaultSuperAdmin);
      changesMade = true;
  }

  const superAdminRoleExists = placeholderAppRoles.some(r => r.name === 'Superadmin');
  if(!superAdminRoleExists) {
      placeholderAppRoles.push({
          id: 'role_superadmin',
          name: 'Superadmin',
          permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id)
      });
      changesMade = true;
  }

  (window as any).__APP_HYDRATED__ = true;
  resolveHydration?.();
  console.log('Hydration process complete.');
  
  if (changesMade) {
    console.log('Persisting initial/updated data to Firestore...');
    await persistToFirestore(); // Persist all data
  }
}


export async function persistToFirestore(keysToUpdate?: (keyof typeof DATA_ARRAYS)[]) {
  if (!db) {
    console.warn('Persist skipped: Firebase not configured.');
    return;
  }
  
  const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
  const currentUser: User | null = authUserString ? JSON.parse(authUserString) : defaultSuperAdmin;
  
  if (!currentUser?.tenantId) {
      console.error('Persist skipped: No tenantId found for the current user.');
      return;
  }
  
  const tenantId = currentUser.tenantId;

  const keys = keysToUpdate && keysToUpdate.length > 0 ? keysToUpdate : Object.keys(DATA_ARRAYS) as (keyof typeof DATA_ARRAYS)[];
  
  const dataToPersist: { [key: string]: any } = {};
  for (const key of keys) {
    if (DATA_ARRAYS[key] !== undefined) {
      dataToPersist[key] = DATA_ARRAYS[key];
    }
  }
  
  const sanitizedData = sanitizeObjectForFirestore(dataToPersist);
  try {
    const docRef = doc(db, 'tenants', tenantId);
    await setDoc(docRef, sanitizedData, { merge: true });
    
    // Also update the /users collection if users were part of the update
    if (keys.includes('users')) {
        for(const user of placeholderUsers) {
            if(user.id) { // Ensure user has an ID
                const userDocRef = doc(db, 'users', user.id);
                await setDoc(userDocRef, sanitizeObjectForFirestore(user), { merge: true });
            }
        }
    }
    
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

