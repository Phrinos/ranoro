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
export const STANDARD_DEPOSIT_AMOUNT = 3500;

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
// ===     IN-MEMORY DATA ARRAYS       ===
// =======================================
export let placeholderVehicles: Vehicle[] = [
  { id: 'V001', make: 'Nissan', model: 'Versa', year: 2020, licensePlate: 'AFG-330-A', ownerName: 'Maria Garcia', ownerPhone: '4491234567', lastServiceDate: '2023-10-15T10:00:00.000Z' },
  { id: 'V002', make: 'Chevrolet', model: 'Aveo', year: 2022, licensePlate: 'XYZ-789-B', ownerName: 'Juan Perez', ownerPhone: '4497654321', lastServiceDate: '2024-01-20T11:30:00.000Z' },
  { id: 'V003', make: 'Ford', model: 'Fusion', year: 2018, licensePlate: 'FGH-456-C', ownerName: 'Pedro Ramirez', ownerPhone: '4492345678', lastServiceDate: '2023-11-05T09:00:00.000Z' },
  { 
    id: 'V004', 
    make: 'Honda', 
    model: 'CR-V', 
    year: 2021, 
    licensePlate: 'JKL-123-D', 
    ownerName: 'Arturo Valdelamar', 
    ownerPhone: '4498765432', 
    lastServiceDate: '2024-02-10T14:00:00.000Z', 
    isFleetVehicle: true, 
    dailyRentalCost: 350, 
    gpsMonthlyCost: 150, 
    adminMonthlyCost: 200, 
    insuranceMonthlyCost: 250, 
    currentMileage: 45000, 
    lastMileageUpdate: new Date().toISOString(),
    paperwork: [
      { id: 'pwk_v004_1', name: 'Verificación Vehicular', dueDate: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(), status: 'Pendiente' },
      { id: 'pwk_v004_2', name: 'Pago de Tenencia', dueDate: new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString(), status: 'Pendiente' },
    ]
  },
  { 
    id: 'V005', 
    make: 'Kia', 
    model: 'Rio', 
    year: 2023, 
    licensePlate: 'MNO-456-E', 
    ownerName: 'Arturo Valdelamar', 
    ownerPhone: '4498765432', 
    isFleetVehicle: true, 
    dailyRentalCost: 320, 
    gpsMonthlyCost: 150, 
    adminMonthlyCost: 200, 
    insuranceMonthlyCost: 250, 
    currentMileage: 22000, 
    lastMileageUpdate: new Date().toISOString(),
    paperwork: [
        { id: 'pwk_v005_1', name: 'Seguro Vehicular', dueDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(), status: 'Pendiente', notes: 'Cotizar renovación con GNP y Qualitas' },
    ]
  },
];
export let placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'S001',
    vehicleId: 'V001',
    vehicleIdentifier: 'AFG-330-A',
    serviceDate: '2023-10-15T10:00:00.000Z',
    description: 'Cambio de aceite y filtro',
    technicianId: 'T001',
    technicianName: 'Carlos Hernandez',
    status: 'Completado',
    deliveryDateTime: '2023-10-15T14:00:00.000Z',
    totalCost: 1500,
    totalSuppliesCost: 600,
    serviceProfit: 900,
    mileage: 50000,
    serviceItems: [{id: '1', name: 'Cambio de Aceite', price: 1500, suppliesUsed: [{supplyId: 'P001', supplyName: 'Aceite Sintetico 5W-30', quantity: 5, unitPrice: 120}]}],
    subTotal: 1293.10, taxAmount: 206.90,
    nextServiceInfo: { date: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(), mileage: 60000 },
    appointmentStatus: 'Confirmada',
  },
  {
    id: 'S002',
    vehicleId: 'V002',
    vehicleIdentifier: 'XYZ-789-B',
    serviceDate: '2024-01-20T11:30:00.000Z',
    description: 'Revisión de frenos y cambio de balatas',
    technicianId: 'T002',
    technicianName: 'Luisa Martinez',
    status: 'Completado',
    deliveryDateTime: '2024-01-20T16:00:00.000Z',
    totalCost: 2500,
    totalSuppliesCost: 1200,
    serviceProfit: 1300,
    mileage: 25000,
    serviceItems: [{id: '2', name: 'Cambio de Balatas', price: 2500, suppliesUsed: [{supplyId: 'P002', supplyName: 'Balatas Delanteras Ceramicas', quantity: 1, unitPrice: 1200}]}],
    subTotal: 2155.17, taxAmount: 344.83,
    appointmentStatus: 'Confirmada',
  },
  {
    id: 'S003',
    vehicleId: 'V001',
    vehicleIdentifier: 'AFG-330-A',
    serviceDate: new Date().toISOString(),
    description: 'Diagnóstico de motor',
    technicianId: 'T001',
    technicianName: 'Carlos Hernandez',
    status: 'Agendado',
    totalCost: 500,
    totalSuppliesCost: 0,
    serviceProfit: 500,
    mileage: 55000,
    serviceItems: [{id: '3', name: 'Diagnóstico con Escaner', price: 500, suppliesUsed: []}],
    subTotal: 431.03, taxAmount: 68.97,
    appointmentStatus: 'Creada',
  },
];
export let placeholderTechnicians: Technician[] = [
  { id: 'T001', name: 'Carlos Hernandez', specialty: 'Mecánica General', area: 'Mecánica' },
  { id: 'T002', name: 'Luisa Martinez', specialty: 'Electrónica Automotriz', area: 'Electrónica' },
];
export let placeholderInventory: InventoryItem[] = [
  { id: 'P001', name: 'Aceite Sintetico 5W-30', sku: 'SYN-5W30', quantity: 50, unitPrice: 120, sellingPrice: 180, lowStockThreshold: 10, supplier: 'Refaccionaria GDL', category: 'Aceites y Lubricantes' },
  { id: 'P002', name: 'Balatas Delanteras Ceramicas', sku: 'BRK-CER-F', quantity: 20, unitPrice: 1200, sellingPrice: 1600, lowStockThreshold: 5, supplier: 'Frenos y Partes MTY', category: 'Frenos' },
  { id: 'SVC01', name: 'Mano de Obra Mecánica', sku: 'SVC-MEC', quantity: 0, unitPrice: 350, sellingPrice: 350, lowStockThreshold: 0, supplier: 'Taller', category: 'Servicios', isService: true },
];
export let placeholderSales: SaleReceipt[] = [];
export let placeholderCategories: InventoryCategory[] = [ { id: 'C01', name: 'Aceites y Lubricantes' }, { id: 'C02', name: 'Frenos' }, { id: 'C03', name: 'Servicios' } ];
export let placeholderSuppliers: Supplier[] = [ { id: 'S01', name: 'Refaccionaria GDL', contactPerson: 'Juan Torres', phone: '333-444-5566' }, { id: 'S02', name: 'Frenos y Partes MTY', contactPerson: 'Ana Soto', phone: '818-222-3344' }, { id: 'S03', name: 'Taller', contactPerson: 'Interno', phone: '' } ];
export let placeholderAppRoles: AppRole[] = [
    { id: 'role1', name: 'Superadmin', permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:manage', 'inventory:view', 'pos:create_sale', 'pos:view_sales', 'finances:view_report', 'technicians:manage', 'vehicles:manage', 'fleet:manage', 'users:manage', 'roles:manage', 'ticket_config:manage', 'audits:view'] },
    { id: 'role2', name: 'Admin', permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:manage', 'inventory:view', 'pos:create_sale', 'pos:view_sales', 'finances:view_report', 'technicians:manage', 'vehicles:manage', 'fleet:manage'] },
    { id: 'role3', name: 'Tecnico', permissions: ['dashboard:view', 'services:view_history', 'inventory:view'] },
    { id: 'role4', name: 'Recepcionista', permissions: ['dashboard:view', 'services:create', 'services:view_history', 'inventory:view', 'pos:create_sale'] }
];
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [ { id: 'exp1', name: 'Renta del Local', amount: 15000 }, { id: 'exp2', name: 'Luz y Agua', amount: 3500 } ];
export let placeholderAdministrativeStaff: AdministrativeStaff[] = [ { id: 'adm1', name: 'Ana Sofía', roleOrArea: 'Recepción', monthlySalary: 12000, commissionRate: 0.01 } ];
export let placeholderUsers: User[] = [defaultSuperAdmin];
export let placeholderVehiclePriceLists: VehiclePriceList[] = [];
export let placeholderDrivers: Driver[] = [
  { id: 'DRV001', name: 'Juan Pérez', address: 'Calle Falsa 123, Aguascalientes', phone: '449-555-0101', emergencyPhone: '449-555-0199', assignedVehicleId: 'V004', depositAmount: 2500, contractDate: '2024-05-01T10:00:00Z', manualDebts: [{ id: 'md001', date: new Date().toISOString(), amount: 350, note: 'Reparación de llanta' }] },
  { id: 'DRV002', name: 'Ana Martínez', address: 'Av. Siempre Viva 742, Aguascalientes', phone: '449-555-0102', emergencyPhone: '449-555-0198', assignedVehicleId: 'V005', depositAmount: 3500, contractDate: '2024-06-15T10:00:00Z', manualDebts: [] },
];
export let placeholderRentalPayments: RentalPayment[] = [
  { id: 'PAY001', driverId: 'DRV001', driverName: 'Juan Pérez', vehicleLicensePlate: 'JKL-123-D', paymentDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), amount: 2100, daysCovered: 6 },
  { id: 'PAY002', driverId: 'DRV001', driverName: 'Juan Pérez', vehicleLicensePlate: 'JKL-123-D', paymentDate: new Date().toISOString(), amount: 350, daysCovered: 1 },
  { id: 'PAY003', driverId: 'DRV002', driverName: 'Ana Martínez', vehicleLicensePlate: 'MNO-456-E', paymentDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), amount: 1920, daysCovered: 6 },
];
export let placeholderVehicleExpenses: VehicleExpense[] = [
  { id: 'VEXP001', vehicleId: 'V004', vehicleLicensePlate: 'JKL-123-D', date: '2024-07-01T10:00:00Z', amount: 850, description: 'Pago de tenencia 2024' },
  { id: 'VEXP002', vehicleId: 'V005', vehicleLicensePlate: 'MNO-456-E', date: '2024-06-20T10:00:00Z', amount: 2500, description: 'Cambio de 2 llantas' },
];
export let placeholderOwnerWithdrawals: OwnerWithdrawal[] = [
  { id: 'OW001', ownerName: 'Arturo Valdelamar', date: new Date().toISOString(), amount: 5000, reason: 'Adelanto de ganancias Julio' },
];
export let placeholderCashDrawerTransactions: CashDrawerTransaction[] = [];
export let placeholderInitialCashBalance: InitialCashBalance = { date: '', amount: 0, userId: '', userName: '' };
export let placeholderTechnicianMonthlyPerformance: any[] = [];
export let placeholderAuditLogs: AuditLog[] = [];
export let placeholderServiceTypes: ServiceTypeRecord[] = [
    { id: 'st_1', name: 'Servicio General'},
    { id: 'st_2', name: 'Cambio de Aceite'},
    { id: 'st_3', name: 'Pintura'},
];

// =======================================
// ===         DATA HYDRATION          ===
// =======================================
export const hydrateFromFirestore = async (): Promise<void> => {
  // In local mode, we do nothing. The data is already here.
  return Promise.resolve();
};

export const hydrateReady = hydrateFromFirestore();

// =======================================
// ===     PERSISTENCE & UTILITIES     ===
// =======================================
export const persistToFirestore = async (collectionsToSave: string[]) => {
  // In local mode, we just log and dispatch an event.
  console.log(`Simulating persistence for: ${collectionsToSave.join(', ')}`);
  window.dispatchEvent(new CustomEvent('databaseUpdated'));
};


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
  
  placeholderAuditLogs.push(newLog);
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
