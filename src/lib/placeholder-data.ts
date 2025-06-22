
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff } from '@/types'; // Added QuoteRecord, MonthlyFixedExpense
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, startOfYesterday, endOfYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

export const IVA_RATE = 0.16; // Export IVA_RATE

// =======================================
// ===          VEHÍCULOS          ===
// =======================================
export const placeholderVehicles: Vehicle[] = [];

// =======================================
// ===          PERSONAL          ===
// =======================================
export const placeholderTechnicians: Technician[] = [];

export const placeholderAdministrativeStaff: AdministrativeStaff[] = [];

// =======================================
// ===          INVENTARIO          ===
// =======================================
export const placeholderCategories: InventoryCategory[] = [];

export const placeholderSuppliers: Supplier[] = [];

export let placeholderInventory: InventoryItem[] = [];


// =======================================
// ===          OPERACIONES          ===
// =======================================
export let placeholderServiceRecords: ServiceRecord[] = [];

export let placeholderSales: SaleReceipt[] = [];

export let placeholderQuotes: QuoteRecord[] = [];

export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];


export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 0,
  technicianEarnings: 0,
  dailyRevenue: 0,
  lowStockAlerts: 0,
};

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [];

export const placeholderAppRoles: AppRole[] = [];

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
