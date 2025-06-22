
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff } from '@/types'; // Added QuoteRecord, MonthlyFixedExpense
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, startOfYesterday, endOfYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

const refDate = new Date('2025-06-20T12:00:00.000Z'); // A fixed reference date

const today = refDate;
const yesterday = subDays(today,1);
const twoDaysAgo = subDays(today,2);
const threeDaysAgo = subDays(today,3);
const lastWeek = subDays(today,7);
const twoWeeksAgo = subDays(today, 14);
const lastMonth = subMonths(today, 1);
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);

export const IVA_RATE = 0.16; // Export IVA_RATE

// =======================================
// ===          VEHÍCULOS          ===
// =======================================
export const placeholderVehicles: Vehicle[] = [
  { id: 1, make: 'Nissan', model: 'Versa', year: 2025, vin: '1N4AB1APXPC123456', ownerName: 'Arturo Valdelamar', ownerPhone: '4493930914', ownerEmail: 'arturo@valdelamar.com', licensePlate: 'AV-25-N', color: 'Gris Oxford', notes: 'Cliente fundador. Cuidado con el perro en el asiento trasero.' },
  { id: 2, make: 'Honda', model: 'Civic', year: 2022, vin: '1HGFB2F5XNL654321', ownerName: 'Carlos Sanchez', ownerPhone: '555-123-4567', ownerEmail: 'carlos.s@example.com', licensePlate: 'CS-22-H', color: 'Azul Eléctrico', notes: 'Prefiere comunicación por WhatsApp.' },
  { id: 3, make: 'Volkswagen', model: 'Jetta', year: 2020, vin: '3VWDH7AJXKM112233', ownerName: 'Maria Rodriguez', ownerPhone: '555-987-6543', ownerEmail: 'maria.r@example.com', licensePlate: 'MR-20-V', color: 'Blanco', notes: '' },
  { id: 4, make: 'Chevrolet', model: 'Aveo', year: 2023, vin: '3G1PC5SBXKS445566', ownerName: 'Luisa Gomez', ownerPhone: '555-555-5555', ownerEmail: 'luisa.g@example.com', licensePlate: 'LG-23-C', color: 'Rojo', notes: 'Sensible al costo, siempre preguntar antes de reparaciones adicionales.' },
  { id: 5, make: 'Ford', model: 'Lobo', year: 2021, vin: '1FTFW1E8XFFD77889', ownerName: 'Javier Hernandez', ownerPhone: '555-888-9999', ownerEmail: 'javier.h@example.com', licensePlate: 'JH-21-F', color: 'Negro', notes: 'Vehículo de trabajo pesado, revisar suspensión.' },
];

// =======================================
// ===          PERSONAL          ===
// =======================================
export const placeholderTechnicians: Technician[] = [
  { id: 'T001', name: 'Juan Perez', area: 'Mecánica General', specialty: 'Motores y Transmisiones', contactInfo: '449-111-2222', hireDate: '2021-03-15', monthlySalary: 12000, commissionRate: 0.10, notes: 'Experto en motores diésel.' },
  { id: 'T002', name: 'Pedro Ramirez', area: 'Electrónica y Diagnóstico', specialty: 'Sistemas Eléctricos y Computadoras', contactInfo: '449-333-4444', hireDate: '2022-07-01', monthlySalary: 14000, commissionRate: 0.15, notes: 'Certificado en diagnóstico por computadora.' },
  { id: 'T003', name: 'Miguel Gonzalez', area: 'Carrocería y Pintura', specialty: 'Pintura Automotriz', contactInfo: '449-555-6666', hireDate: '2020-01-20', monthlySalary: 11000, commissionRate: 0.08, notes: 'Detallista y meticuloso.' },
];

export const placeholderAdministrativeStaff: AdministrativeStaff[] = [
  { id: 'ADM001', name: 'Ana Lopez', roleOrArea: 'Gerente de Taller', contactInfo: '449-777-8888', hireDate: '2019-11-01', monthlySalary: 25000, commissionRate: 0.015, notes: 'Encargada de compras y relación con proveedores.' },
  { id: 'ADM002', name: 'Laura Martinez', roleOrArea: 'Recepción y Atención al Cliente', contactInfo: '449-999-0000', hireDate: '2023-02-10', monthlySalary: 9000, commissionRate: 0.005, notes: 'Responsable de agendar citas.' },
];

// =======================================
// ===          INVENTARIO          ===
// =======================================
export const placeholderCategories: InventoryCategory[] = [
  { id: 'CAT001', name: 'Filtros' },
  { id: 'CAT002', name: 'Frenos' },
  { id: 'CAT003', name: 'Motor' },
  { id: 'CAT004', name: 'Lubricantes' },
  { id: 'CAT005', name: 'Suspensión' },
  { id: 'CAT006', name: 'Eléctrico' },
  { id: 'CAT007', name: 'Servicios' },
  { id: 'CAT008', name: 'Llantas' },
];

export const placeholderSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'Repuestos Express', contactPerson: 'Ana García', phone: '555-1212', email: 'ventas@repuestosexpress.com', address: 'Calle Falsa 123, Ciudad', debtAmount: 1500, debtNote: 'Factura #A-123 pendiente' },
  { id: 'SUP002', name: 'AutoPartes Premium', contactPerson: 'Luis Martínez', phone: '555-3434', email: 'luis.m@autopartespremium.com', address: 'Av. Siempreviva 742, Pueblo', debtAmount: 0, debtNote: '' },
  { id: 'SUP003', name: 'Llantas del Centro', contactPerson: 'Sofia Reyes', phone: '555-4545', email: 'sreyes@llantascentro.com', address: 'Blvd. Principal 45, Parque Industrial', debtAmount: 8500, debtNote: 'Pedido grande de llantas' },
  { id: 'SUP000', name: 'N/A (Servicio Interno)', contactPerson: '', phone: '', email: '', address: '', debtAmount: 0, debtNote: 'Proveedor para servicios o items no comprados.' },
];

export let placeholderInventory: InventoryItem[] = [
  { id: 'SERV001', name: 'Mano de Obra Mecánica (Hora)', sku: 'SERV-MEC-HR', quantity: 0, unitPrice: 0, sellingPrice: 350, lowStockThreshold: 0, category: 'Servicios', supplier: 'N/A (Servicio Interno)', isService: true },
  { id: 'SERV002', name: 'Diagnóstico Computarizado', sku: 'SERV-DIAG', quantity: 0, unitPrice: 0, sellingPrice: 580, lowStockThreshold: 0, category: 'Servicios', supplier: 'N/A (Servicio Interno)', isService: true },
  { id: 'PROD001', name: 'Filtro de Aceite Mann-Filter W712/95', sku: 'MF-W71295', quantity: 25, unitPrice: 120, sellingPrice: 280, lowStockThreshold: 10, category: 'Filtros', supplier: 'Repuestos Express', isService: false },
  { id: 'PROD002', name: 'Juego Balatas Delanteras Brembo', sku: 'BREM-P85020', quantity: 8, unitPrice: 750, sellingPrice: 1450, lowStockThreshold: 5, category: 'Frenos', supplier: 'AutoPartes Premium', isService: false },
  { id: 'PROD003', name: 'Aceite Sintético 5W-30 (5L)', sku: 'MOT-5W30-5L', quantity: 15, unitPrice: 800, sellingPrice: 1250, lowStockThreshold: 5, category: 'Lubricantes', supplier: 'Repuestos Express', isService: false },
  { id: 'PROD004', name: 'Bujía de Iridio NGK', sku: 'NGK-LFR6AIX', quantity: 40, unitPrice: 180, sellingPrice: 350, lowStockThreshold: 20, category: 'Motor', supplier: 'AutoPartes Premium', isService: false },
  { id: 'PROD005', name: 'Amortiguador Delantero Monroe', sku: 'MON-271679', quantity: 4, unitPrice: 1100, sellingPrice: 1900, lowStockThreshold: 2, category: 'Suspensión', supplier: 'Repuestos Express', isService: false },
  { id: 'PROD006', name: 'Batería LTH 47-600', sku: 'LTH-47600', quantity: 7, unitPrice: 1500, sellingPrice: 2400, lowStockThreshold: 3, category: 'Eléctrico', supplier: 'AutoPartes Premium', isService: false },
  { id: 'PROD007', name: 'Llanta 205/55 R16 Michelin', sku: 'MICH-P20555R16', quantity: 12, unitPrice: 1800, sellingPrice: 2600, lowStockThreshold: 4, category: 'Llantas', supplier: 'Llantas del Centro', isService: false },
];


// =======================================
// ===          OPERACIONES          ===
// =======================================
export let placeholderServiceRecords: ServiceRecord[] = [
  { 
    id: 'S001', 
    vehicleId: 1, 
    vehicleIdentifier: 'AV-25-N',
    serviceDate: setHours(setMinutes(twoDaysAgo, 30), 9).toISOString(), 
    deliveryDateTime: setHours(setMinutes(twoDaysAgo, 30), 18).toISOString(),
    description: 'Servicio de mantenimiento de 10,000 km.',
    technicianId: 'T001', 
    technicianName: 'Juan Perez',
    suppliesUsed: [
        { supplyId: 'PROD001', quantity: 1, unitPrice: 120, supplyName: 'Filtro de Aceite Mann-Filter W712/95'},
        { supplyId: 'PROD003', quantity: 1, unitPrice: 800, supplyName: 'Aceite Sintético 5W-30 (5L)' },
        { supplyId: 'SERV001', quantity: 1, unitPrice: 0, supplyName: 'Mano de Obra Mecánica (Hora)'},
    ],
    totalCost: 1980,
    totalSuppliesCost: 920,
    serviceProfit: 1060,
    status: 'Completado', 
    mileage: 10150,
  },
  { 
    id: 'S002', 
    vehicleId: 2, 
    vehicleIdentifier: 'CS-22-H',
    serviceDate: setHours(setMinutes(yesterday, 0), 11).toISOString(), 
    description: 'Revisión y cambio de balatas delanteras. Cliente reporta rechinido.',
    technicianId: 'T002', 
    technicianName: 'Pedro Ramirez',
    suppliesUsed: [
      { supplyId: 'PROD002', quantity: 1, unitPrice: 750, supplyName: 'Juego Balatas Delanteras Brembo' },
      { supplyId: 'SERV001', quantity: 2, unitPrice: 0, supplyName: 'Mano de Obra Mecánica (Hora)'},
    ],
    totalCost: 2350,
    totalSuppliesCost: 750,
    serviceProfit: 1600,
    status: 'Reparando', 
    mileage: 45200,
  },
  { 
    id: 'S003', 
    vehicleId: 3, 
    vehicleIdentifier: 'MR-20-V',
    serviceDate: setHours(setMinutes(today, 30), 14).toISOString(), 
    description: 'Diagnóstico de luz "Check Engine" encendida.',
    technicianId: 'T002', 
    technicianName: 'Pedro Ramirez',
    suppliesUsed: [{ supplyId: 'SERV002', quantity: 1, unitPrice: 0, supplyName: 'Diagnóstico Computarizado' }],
    totalCost: 580,
    totalSuppliesCost: 0,
    serviceProfit: 580,
    status: 'Agendado', 
    mileage: 89300,
  },
  { 
    id: 'S004', 
    vehicleId: 4, 
    vehicleIdentifier: 'LG-23-C',
    serviceDate: setHours(setMinutes(lastWeek, 0), 10).toISOString(),
    deliveryDateTime: setHours(setMinutes(lastWeek, 0), 16).toISOString(),
    description: 'Afinación mayor.',
    technicianId: 'T001', 
    technicianName: 'Juan Perez',
    suppliesUsed: [
        { supplyId: 'PROD001', quantity: 1, unitPrice: 120, supplyName: 'Filtro de Aceite Mann-Filter W712/95'},
        { supplyId: 'PROD004', quantity: 4, unitPrice: 180, supplyName: 'Bujía de Iridio NGK' },
    ],
    totalCost: 2500,
    totalSuppliesCost: 840,
    serviceProfit: 1660,
    status: 'Completado', 
    mileage: 25500,
  },
  { 
    id: 'S005', 
    vehicleId: 5, 
    vehicleIdentifier: 'JH-21-F',
    serviceDate: setHours(setMinutes(tomorrow, 0), 12).toISOString(), 
    description: 'Cambio de amortiguadores delanteros y alineación.',
    technicianId: 'T001', 
    technicianName: 'Juan Perez',
    suppliesUsed: [
      { supplyId: 'PROD005', quantity: 2, unitPrice: 1100, supplyName: 'Amortiguador Delantero Monroe' },
    ],
    totalCost: 3500,
    totalSuppliesCost: 2200,
    serviceProfit: 1300,
    status: 'Agendado', 
    mileage: 115000,
  },
  {
    id: 'S006',
    vehicleId: 1,
    vehicleIdentifier: 'AV-25-N',
    serviceDate: setHours(setMinutes(twoWeeksAgo, 0), 16).toISOString(),
    deliveryDateTime: setHours(setMinutes(twoWeeksAgo, 0), 19).toISOString(),
    description: 'Pintura de fascia delantera por raspón.',
    technicianId: 'T003',
    technicianName: 'Miguel Gonzalez',
    suppliesUsed: [],
    totalCost: 2800,
    totalSuppliesCost: 600,
    serviceProfit: 2200,
    status: 'Completado',
    mileage: 9980,
  },
];

export let placeholderSales: SaleReceipt[] = [
  {
    id: 'SALE001',
    saleDate: setHours(setMinutes(yesterday, 15), 13).toISOString(),
    items: [{ inventoryItemId: 'PROD001', itemName: 'Filtro de Aceite Mann-Filter W712/95', quantity: 1, unitPrice: 280, totalPrice: 280 }],
    subTotal: 241.38,
    tax: 38.62,
    totalAmount: 280,
    paymentMethod: 'Efectivo',
    customerName: 'Cliente Mostrador'
  },
  {
    id: 'SALE002',
    saleDate: setHours(setMinutes(today, 45), 10).toISOString(),
    items: [
      { inventoryItemId: 'PROD006', itemName: 'Batería LTH 47-600', quantity: 1, unitPrice: 2400, totalPrice: 2400 },
      { inventoryItemId: 'PROD004', itemName: 'Bujía de Iridio NGK', quantity: 1, unitPrice: 350, totalPrice: 350 },
    ],
    subTotal: 2370.69,
    tax: 379.31,
    totalAmount: 2750,
    paymentMethod: 'Tarjeta',
    customerName: 'Cliente con Prisa',
    cardFolio: 'AUTH54321'
  },
];

export let placeholderQuotes: QuoteRecord[] = [
  {
    id: 'COT001',
    quoteDate: setHours(setMinutes(threeDaysAgo, 20), 16).toISOString(),
    vehicleId: 1,
    vehicleIdentifier: 'AV-25-N',
    description: 'Cambio de las 4 llantas por modelo Michelin Primacy 4+ y alineación/balanceo.',
    preparedByTechnicianId: 'ADM002',
    preparedByTechnicianName: 'Laura Martinez',
    suppliesProposed: [
      { supplyId: 'PROD007', quantity: 4, unitPrice: 2600, supplyName: 'Llanta 205/55 R16 Michelin' },
    ],
    estimatedTotalCost: 11500,
    notes: 'Válido por 15 días. Incluye instalación. No incluye reparación de rines si es necesario.',
    mileage: 10200,
  },
  {
    id: 'COT002',
    quoteDate: setHours(setMinutes(lastWeek, 0), 12).toISOString(),
    vehicleId: 3,
    vehicleIdentifier: 'MR-20-V',
    description: 'Cotización para reparación mayor de motor por sobrecalentamiento. Incluye rectificación de cabeza, cambio de empaques, bomba de agua y termostato.',
    preparedByTechnicianId: 'ADM001',
    preparedByTechnicianName: 'Ana Lopez',
    suppliesProposed: [],
    estimatedTotalCost: 25000,
    notes: 'Se requiere un 50% de anticipo. Garantía de 6 meses en la reparación.',
    mileage: 89300,
  }
];

export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [
    { id: 'FEXP001', name: 'Renta del Local', amount: 15000 },
    { id: 'FEXP002', name: 'Servicios (Luz, Agua)', amount: 3500 },
    { id: 'FEXP003', name: 'Internet y Telefonía', amount: 1200 },
    { id: 'FEXP004', name: 'Software y Suscripciones', amount: 800 },
];


export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 0,
  technicianEarnings: 0,
  dailyRevenue: 0,
  lowStockAlerts: 0,
};

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [];

export const placeholderAppRoles: AppRole[] = [
    { id: 'role_superadmin', name: 'Superadmin', permissions: ['all'] },
    { id: 'role_admin', name: 'Admin', permissions: ['dashboard:view', 'services:create', 'services:edit', 'inventory:manage', 'users:manage', 'finances:view_report', 'ticket_config:manage', 'roles:manage'] },
    { id: 'role_tecnico', name: 'Técnico', permissions: ['dashboard:view', 'services:edit', 'inventory:view', 'services:create', 'vehicles:manage'] },
    { id: 'role_ventas', name: 'Ventas', permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view', 'cotizaciones:manage', 'vehicles:manage'] },
];

// Helper functions to get date ranges
export const getCurrentMonthRange = () => {
    const now = new Date();
    return {
        from: startOfMonth(now),
        to: endOfMonth(now)
    };
};

export const getLastMonthRange = () => {
    const now = new Date();
    const lastMonthDate = subMonths(now, 1);
    return {
        from: startOfMonth(lastMonthDate),
        to: endOfMonth(lastMonthDate)
    };
};

export const getTodayRange = () => {
    return {
        from: startOfToday(),
        to: endOfToday()
    };
};
export const getYesterdayRange = () => {
    return {
        from: startOfYesterday(),
        to: endOfYesterday()
    };
};

// Constant for LocalStorage Key for AppRoles
export const USER_ROLES_LOCALSTORAGE_KEY = 'appRoles';

// Exported function to calculate sale profit
export const calculateSaleProfit = (sale: SaleReceipt, inventory: InventoryItem[], ivaRate: number): number => {
  return sale.items.reduce((profit, saleItem) => {
      const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
      const costPrice = inventoryItem ? inventoryItem.unitPrice : 0;
      const sellingPriceSubTotal = saleItem.unitPrice / (1 + ivaRate);
      return profit + (sellingPriceSubTotal - costPrice) * saleItem.quantity;
  }, 0);
};
