
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff } from '@/types'; // Added QuoteRecord, MonthlyFixedExpense
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, startOfYesterday, endOfYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

const today = new Date();
const yesterday = subDays(today,1);
const twoDaysAgo = subDays(today,2);
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);

export const IVA_RATE = 0.16; // Export IVA_RATE

export const placeholderVehicles: Vehicle[] = [];

export const placeholderTechnicians: Technician[] = [];

export const placeholderAdministrativeStaff: AdministrativeStaff[] = [];

export const placeholderCategories: InventoryCategory[] = [
  { id: 'CAT001', name: 'Filtros' },
  { id: 'CAT002', name: 'Frenos' },
  { id: 'CAT003', name: 'Motor' },
  { id: 'CAT004', name: 'Lubricantes' },
  { id: 'CAT005', name: 'Suspensión' },
  { id: 'CAT006', name: 'Eléctrico' },
  { id: 'CAT007', name: 'Servicios' },
];

export const placeholderSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'Repuestos Express', contactPerson: 'Ana García', phone: '555-1212', email: 'ventas@repuestosexpress.com', address: 'Calle Falsa 123, Ciudad', debtAmount: 0, debtNote: '' },
  { id: 'SUP002', name: 'AutoPartes Premium', contactPerson: 'Luis Martínez', phone: '555-3434', email: 'luis.m@autopartespremium.com', address: 'Av. Siempreviva 742, Pueblo', debtAmount: 0, debtNote: '' },
  { id: 'SUP000', name: 'N/A (Servicio Interno)', contactPerson: '', phone: '', email: '', address: '', debtAmount: 0, debtNote: 'Proveedor para servicios o items no comprados.' },
];


// unitPrice is cost to workshop (pre-tax)
// sellingPrice is final selling price to customer (tax-inclusive)
export let placeholderInventory: InventoryItem[] = [
  // Keep service type items as they are definitions
  { id: 'SERV001', name: 'Mano de Obra Mecánica (Hora)', sku: 'SERV-MEC-HR', quantity: 0, unitPrice: 0, sellingPrice: 350, lowStockThreshold: 0, category: 'Servicios', supplier: 'N/A (Servicio Interno)', isService: true },
  { id: 'SERV002', name: 'Diagnóstico Computarizado', sku: 'SERV-DIAG', quantity: 0, unitPrice: 0, sellingPrice: 580, lowStockThreshold: 0, category: 'Servicios', supplier: 'N/A (Servicio Interno)', isService: true },
];

export let placeholderServiceRecords: ServiceRecord[] = [];

export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 0,
  technicianEarnings: 0,
  dailyRevenue: 0,
  lowStockAlerts: 0,
};

export let placeholderSales: SaleReceipt[] = [];

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [];

export const placeholderAppRoles: AppRole[] = [
    { id: 'role_superadmin', name: 'Superadmin', permissions: ['all'] },
    { id: 'role_admin', name: 'Admin', permissions: ['dashboard:view', 'services:create', 'services:edit', 'inventory:manage', 'users:manage', 'finances:view_report', 'ticket_config:manage', 'roles:manage'] },
    { id: 'role_tecnico', name: 'Técnico', permissions: ['dashboard:view', 'services:edit', 'inventory:view', 'services:create', 'vehicles:manage'] },
    { id: 'role_ventas', name: 'Ventas', permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view', 'cotizaciones:manage', 'vehicles:manage'] },
];


export let placeholderQuotes: QuoteRecord[] = [];


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
    const lastMonth = subMonths(now, 1);
    return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
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

export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];

// Exported function to calculate sale profit
export const calculateSaleProfit = (sale: SaleReceipt, inventory: InventoryItem[], ivaRate: number): number => {
  return sale.items.reduce((profit, saleItem) => {
      const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
      // If inventoryItem.unitPrice is cost_pre_tax and saleItem.unitPrice is selling_price_with_tax
      const costPrice = inventoryItem ? inventoryItem.unitPrice : 0;
      const sellingPriceSubTotal = saleItem.unitPrice / (1 + ivaRate);
      return profit + (sellingPriceSubTotal - costPrice) * saleItem.quantity;
  }, 0);
};
