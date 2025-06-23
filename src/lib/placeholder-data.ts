
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const STATIC_NOW = new Date(); // Use real time for production
export const IVA_RATE = 0.16;

// =======================================
// ===          CATEGORÍAS Y PROVEEDORES          ===
// =======================================
export const placeholderCategories: InventoryCategory[] = [];

export const placeholderSuppliers: Supplier[] = [];

// =======================================
// ===          INVENTARIO          ===
// =======================================
export let placeholderInventory: InventoryItem[] = [];

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

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [];

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
