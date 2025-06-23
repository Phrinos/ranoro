
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const STATIC_NOW = new Date('2024-07-26T12:00:00Z');
export const IVA_RATE = 0.16;

// =======================================
// ===          CATEGORÍAS Y PROVEEDORES          ===
// =======================================
export const placeholderCategories: InventoryCategory[] = [
  { id: 'CAT001', name: 'Aceites y Lubricantes' },
  { id: 'CAT002', name: 'Filtros' },
  { id: 'CAT003', name: 'Frenos' },
  { id: 'CAT004', name: 'Servicios de Mantenimiento' },
  { id: 'CAT005', name: 'Llantas' },
  { id: 'CAT006', name: 'Amortiguadores y Suspensión' }
];

export const placeholderSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'Refaccionaria del Centro', contactPerson: 'Juan Perez', phone: '555-111-2222', email: 'ventas@refaccionariacentro.com', debtAmount: 15250.00, debtNote: 'Factura #A-123' },
  { id: 'SUP002', name: 'Autopartes Express', contactPerson: 'Maria Rodriguez', phone: '555-333-4444', email: 'maria@apexpress.com', debtAmount: 0 },
  { id: 'SUP003', name: 'Lubricantes Premium', contactPerson: 'Carlos Sanchez', phone: '555-555-6666', email: 'carlos.s@lubripremium.net', debtAmount: 3400.50, debtNote: 'Pedido #L-789' }
];

// =======================================
// ===          INVENTARIO          ===
// =======================================
export let placeholderInventory: InventoryItem[] = [
  // Aceites y Lubricantes
  { id: 'P001', name: 'Aceite Sintético 5W-30 (Litro)', sku: 'OIL-SYN-5W30', description: 'Aceite sintético para motor a gasolina', quantity: 50, unitPrice: 150, sellingPrice: 280, supplier: 'Lubricantes Premium', lowStockThreshold: 10, category: 'Aceites y Lubricantes', unitType: 'units' },
  { id: 'P002', name: 'Líquido de Frenos DOT 4 (500ml)', sku: 'BRK-FL-DOT4', description: 'Líquido de frenos sintético', quantity: 30, unitPrice: 80, sellingPrice: 150, supplier: 'Refaccionaria del Centro', lowStockThreshold: 5, category: 'Frenos', unitType: 'units' },
  
  // Filtros
  { id: 'P003', name: 'Filtro de Aceite para Nissan Versa', sku: 'FIL-OIL-NISSN', quantity: 25, unitPrice: 90, sellingPrice: 180, supplier: 'Autopartes Express', lowStockThreshold: 5, category: 'Filtros', unitType: 'units' },
  { id: 'P004', name: 'Filtro de Aire para VW Jetta', sku: 'FIL-AIR-VWJET', quantity: 40, unitPrice: 120, sellingPrice: 250, supplier: 'Autopartes Express', lowStockThreshold: 10, category: 'Filtros', unitType: 'units' },
  
  // Frenos
  { id: 'P005', name: 'Balatas Delanteras Cerámicas', sku: 'BRK-PAD-CER-F', description: 'Juego de balatas delanteras de cerámica', quantity: 15, unitPrice: 650, sellingPrice: 1200, supplier: 'Refaccionaria del Centro', lowStockThreshold: 3, category: 'Frenos', unitType: 'units' },
  
  // Líquidos por ml
  { id: 'P006', name: 'Limpiador de Inyectores', sku: 'CHEM-INJ-CLN', description: 'Aditivo limpiador de inyectores para gasolina', quantity: 2000, unitPrice: 0.25, sellingPrice: 0.60, supplier: 'Refaccionaria del Centro', lowStockThreshold: 500, category: 'Aceites y Lubricantes', unitType: 'ml' },
  { id: 'P007', name: 'Shampoo para Auto con Cera', sku: 'CHEM-SHMP-WAX', description: 'Shampoo concentrado para lavado de carrocería', quantity: 5000, unitPrice: 0.08, sellingPrice: 0.25, supplier: 'Lubricantes Premium', lowStockThreshold: 1000, category: 'Servicios de Mantenimiento', unitType: 'ml' },

  // Servicios (no tienen stock)
  { id: 'S001', name: 'Servicio de Afinación Menor', sku: 'SERV-AFIN-MEN', description: 'Incluye cambio de aceite, filtro de aceite y revisión de puntos de seguridad.', quantity: 0, unitPrice: 500, sellingPrice: 1500, supplier: 'N/A', lowStockThreshold: 0, category: 'Servicios de Mantenimiento', isService: true, unitType: 'units' },
  { id: 'S002', name: 'Diagnóstico con Escáner', sku: 'SERV-DIAG-SCAN', description: 'Revisión de códigos de falla con escáner OBD-II.', quantity: 0, unitPrice: 250, sellingPrice: 500, supplier: 'N/A', lowStockThreshold: 0, category: 'Servicios de Mantenimiento', isService: true, unitType: 'units' }
];

// =======================================
// ===          VEHÍCULOS          ===
// =======================================
export const placeholderVehicles: Vehicle[] = [
  { id: 1, make: 'Nissan', model: 'Versa', year: 2020, vin: '1N4AL3AP1KC123456', ownerName: 'Ana García', ownerPhone: '555-123-4567', ownerEmail: 'ana.garcia@email.com', licensePlate: 'ABC-123', color: 'Rojo' },
  { id: 2, make: 'Volkswagen', model: 'Jetta', year: 2022, vin: '3VWBB7AJ0NM789012', ownerName: 'Luis Martinez', ownerPhone: '555-987-6543', ownerEmail: 'luis.martinez@email.com', licensePlate: 'XYZ-789', color: 'Blanco' },
  { id: 3, make: 'Chevrolet', model: 'Aveo', year: 2019, vin: 'KL1SF69G4KB345678', ownerName: 'Sofia Hernandez', ownerPhone: '555-246-8109', licensePlate: 'PQR-456' }
];

// =======================================
// ===          PERSONAL          ===
// =======================================
export const placeholderTechnicians: Technician[] = [
  { id: 'T001', name: 'Carlos Rodríguez', area: 'Mecánica General', specialty: 'Motores y Transmisiones', hireDate: '2022-01-15', monthlySalary: 12000, commissionRate: 0.10, isArchived: false },
  { id: 'T002', name: 'Miguel Torres', area: 'Electrónica y Diagnóstico', specialty: 'Sistemas Eléctricos', hireDate: '2021-08-20', monthlySalary: 14000, commissionRate: 0.15, isArchived: false },
];

export const placeholderAdministrativeStaff: AdministrativeStaff[] = [
  { id: 'ADM001', name: 'Laura Gómez', roleOrArea: 'Gerente de Taller', hireDate: '2020-03-10', monthlySalary: 25000, commissionRate: 0.02, isArchived: false },
  { id: 'ADM002', name: 'Javier Castillo', roleOrArea: 'Recepción y Ventas', hireDate: '2023-05-01', monthlySalary: 9000, commissionRate: 0.01, isArchived: false },
];

// =======================================
// ===          OPERACIONES          ===
// =======================================

// --- SERVICIOS ---
const serviceSupplies1: ServiceSupply[] = [
    { supplyId: 'P001', quantity: 4, unitPrice: 150, supplyName: 'Aceite Sintético 5W-30 (Litro)' },
    { supplyId: 'P003', quantity: 1, unitPrice: 90, supplyName: 'Filtro de Aceite para Nissan Versa' },
];
const serviceTotalCost1 = 1800;
const serviceSuppliesCost1 = serviceSupplies1.reduce((sum, s) => sum + (s.unitPrice! * s.quantity), 0);

const serviceSupplies2: ServiceSupply[] = [
    { supplyId: 'P005', quantity: 1, unitPrice: 650, supplyName: 'Balatas Delanteras Cerámicas' },
    { supplyId: 'P002', quantity: 1, unitPrice: 80, supplyName: 'Líquido de Frenos DOT 4 (500ml)' },
];
const serviceTotalCost2 = 2500;
const serviceSuppliesCost2 = serviceSupplies2.reduce((sum, s) => sum + (s.unitPrice! * s.quantity), 0);

export let placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'S001',
    vehicleId: 1,
    vehicleIdentifier: 'ABC-123',
    serviceDate: subDays(STATIC_NOW, 5).toISOString(),
    deliveryDateTime: subDays(STATIC_NOW, 4).toISOString(),
    description: 'Servicio de afinación menor completo y revisión de niveles.',
    technicianId: 'T001',
    technicianName: 'Carlos Rodríguez',
    status: 'Completado',
    mileage: 45000,
    suppliesUsed: serviceSupplies1,
    totalCost: serviceTotalCost1,
    totalSuppliesCost: serviceSuppliesCost1,
    serviceProfit: serviceTotalCost1 - serviceSuppliesCost1,
  },
  {
    id: 'S002',
    vehicleId: 2,
    vehicleIdentifier: 'XYZ-789',
    serviceDate: subDays(STATIC_NOW, 1).toISOString(),
    description: 'Reemplazo de balatas delanteras y purga de sistema de frenos.',
    technicianId: 'T002',
    technicianName: 'Miguel Torres',
    status: 'Reparando',
    mileage: 22000,
    suppliesUsed: serviceSupplies2,
    totalCost: serviceTotalCost2,
    totalSuppliesCost: serviceSuppliesCost2,
    serviceProfit: serviceTotalCost2 - serviceSuppliesCost2,
  },
  {
    id: 'S003',
    vehicleId: 3,
    vehicleIdentifier: 'PQR-456',
    serviceDate: addDays(STATIC_NOW, 3).toISOString(),
    description: 'Diagnóstico de falla en sistema eléctrico (Check Engine).',
    technicianId: 'T002',
    technicianName: 'Miguel Torres',
    status: 'Agendado',
    mileage: 89000,
    suppliesUsed: [{ supplyId: 'S002', quantity: 1, unitPrice: 250, supplyName: 'Diagnóstico con Escáner' }],
    totalCost: 500,
    totalSuppliesCost: 250,
    serviceProfit: 250,
  }
];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = [
  {
    id: 'Q001',
    quoteDate: subDays(STATIC_NOW, 20).toISOString(),
    vehicleId: 1,
    vehicleIdentifier: 'ABC-123',
    description: 'Cambio de amortiguadores delanteros y traseros.',
    preparedByTechnicianId: 'T001',
    preparedByTechnicianName: 'Carlos Rodríguez',
    suppliesProposed: [
      { supplyId: 'P001', supplyName: 'Amortiguador Delantero (Par)', quantity: 1, unitPrice: 3500 },
      { supplyId: 'P002', supplyName: 'Amortiguador Trasero (Par)', quantity: 1, unitPrice: 2800 },
      { supplyId: 'S001', supplyName: 'Mano de Obra - Suspensión', quantity: 1, unitPrice: 1500 },
    ],
    estimatedTotalCost: 7800,
    notes: 'Válido por 15 días. Precios sujetos a cambio sin previo aviso.',
    mileage: 44500,
  },
  {
    id: 'Q002',
    quoteDate: subDays(STATIC_NOW, 8).toISOString(),
    vehicleId: 2,
    vehicleIdentifier: 'XYZ-789',
    description: 'Servicio de afinación mayor.',
    preparedByTechnicianId: 'T001',
    preparedByTechnicianName: 'Carlos Rodríguez',
    suppliesProposed: [],
    estimatedTotalCost: 2500,
    serviceId: 'S002' // Convertida al servicio S002 (simulación)
  },
];


// --- VENTAS (POS) ---
const saleItems1: SaleItem[] = [
  { inventoryItemId: 'P004', itemName: 'Filtro de Aire para VW Jetta', quantity: 1, unitPrice: 250, totalPrice: 250 },
];
const totalSale1 = saleItems1.reduce((sum, item) => sum + item.totalPrice, 0);

export let placeholderSales: SaleReceipt[] = [
  {
    id: 'SALE001',
    saleDate: subDays(STATIC_NOW, 2).toISOString(),
    items: saleItems1,
    subTotal: totalSale1 / (1 + IVA_RATE),
    tax: totalSale1 - (totalSale1 / (1 + IVA_RATE)),
    totalAmount: totalSale1,
    paymentMethod: 'Tarjeta',
    customerName: 'Cliente Mostrador',
    cardFolio: 'AUTH12345'
  }
];

// --- GASTOS FIJOS ---
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [
  { id: 'FIX001', name: 'Renta del Local', amount: 30000 },
  { id: 'FIX002', name: 'Servicio de Luz y Agua', amount: 4500 },
  { id: 'FIX003', name: 'Internet y Teléfono', amount: 1000 },
];

// --- DATOS SIMULADOS (BORRAR O REEMPLAZAR) ---
export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 0,
  technicianEarnings: 0,
  dailyRevenue: 0,
  lowStockAlerts: 0,
};

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [
    { id: 'PERF001', technicianId: 'T001', monthYear: format(subMonths(STATIC_NOW, 1), 'MMMM yyyy', { locale: es }), servicesCount: 15, revenueGenerated: 35000, earnings: 3500, penalties: 0 },
    { id: 'PERF002', technicianId: 'T002', monthYear: format(subMonths(STATIC_NOW, 1), 'MMMM yyyy', { locale: es }), servicesCount: 12, revenueGenerated: 42000, earnings: 6300, penalties: 200 },
];

export const placeholderAppRoles: AppRole[] = [];

// =======================================
// ===          FUNCIONES HELPER         ===
// =======================================
export const getCurrentMonthRange = () => {
    return { from: startOfMonth(STATIC_NOW), to: endOfMonth(STATIC_NOW) };
};

export const getLastMonthRange = () => {
    const lastMonthDate = subMonths(STATIC_NOW, 1);
    return { from: startOfMonth(lastMonthDate), to: endOfMonth(lastMonthDate) };
};

export const getTodayRange = () => {
    return { from: startOfDay(STATIC_NOW), to: endOfDay(STATIC_NOW) };
};

export const getYesterdayRange = () => {
    const yesterday = subDays(STATIC_NOW, 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
};

export const USER_ROLES_LOCALSTORAGE_KEY = 'appRoles';

export const calculateSaleProfit = (sale: SaleReceipt, inventory: InventoryItem[], ivaRate: number): number => {
  return sale.items.reduce((profit, saleItem) => {
      const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
      const costPrice = inventoryItem ? inventoryItem.unitPrice : 0;
      const sellingPriceSubTotal = saleItem.unitPrice / (1 + ivaRate);
      return profit + (sellingPriceSubTotal - costPrice) * saleItem.quantity;
  }, 0);
};
