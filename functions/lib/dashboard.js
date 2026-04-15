"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceGenerateDashboardStats = exports.generateDashboardStats = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const TZ = 'America/Mexico_City';
// Helper to parse dates (simplified version of frontend's parseDate)
const parseDate = (dateStr) => {
    if (!dateStr)
        return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};
async function executeDashboardGeneration() {
    logger.info('Starting dashboard stats generation...');
    const db = admin.firestore();
    const now = new Date();
    // We want data for the last 3 months
    const threeMonthsAgo = (0, date_fns_1.subMonths)(now, 3);
    const threeMonthsAgoISO = threeMonthsAgo.toISOString();
    const [servicesSnap, salesSnap, inventorySnap, fixedExpSnap, personnelSnap] = await Promise.all([
        db.collection('serviceRecords').where('updatedAt', '>=', threeMonthsAgo).get(),
        db.collection('sales').where('saleDate', '>=', threeMonthsAgoISO).get(),
        db.collection('inventory').get(), // inventory is small enough for backend
        db.collection('fixedExpenses').get(),
        db.collection('users').get()
    ]);
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const inventory = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const fixedExpenses = fixedExpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const personnel = personnelSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    // --- FINANCIAL DATA ---
    const dataByMonth = {};
    for (let i = 2; i >= 0; i--) {
        const date = (0, date_fns_1.subMonths)(now, i);
        const monthKey = (0, date_fns_1.format)(date, 'yyyy-MM');
        const monthName = (0, date_fns_1.format)(date, 'MMM yy', { locale: locale_1.es });
        dataByMonth[monthKey] = { name: monthName, ingresos: 0, costoInsumos: 0, gananciaBruta: 0, gastosFijos: 0, utilidadNeta: 0 };
    }
    services.forEach((s) => {
        if (s.status !== 'Entregado')
            return;
        const completionDate = parseDate(s.deliveryDateTime) ?? parseDate(s.serviceDate) ?? parseDate(s.receptionDateTime);
        if (completionDate && (0, date_fns_1.isValid)(completionDate)) {
            const monthKey = (0, date_fns_1.format)(completionDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const grossRevenue = (Array.isArray(s.payments) && s.payments.length > 0)
                    ? s.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                    : Number(s.totalCost) || 0;
                const costOfGoods = s.serviceItems?.reduce((totalCost, item) => {
                    const itemSuppliesCost = item.suppliesUsed?.reduce((supplySum, supply) => {
                        return supplySum + ((supply.unitPrice || 0) * (supply.quantity || 0));
                    }, 0) || 0;
                    return totalCost + itemSuppliesCost;
                }, 0) || 0;
                dataByMonth[monthKey].ingresos += grossRevenue;
                dataByMonth[monthKey].costoInsumos += costOfGoods;
            }
        }
    });
    sales.forEach((s) => {
        if (s.status === 'Cancelado' || !s.saleDate)
            return;
        const saleDate = parseDate(s.saleDate);
        if (saleDate && (0, date_fns_1.isValid)(saleDate)) {
            const monthKey = (0, date_fns_1.format)(saleDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const income = Number(s.totalAmount) || 0;
                const costOfGoods = s.items?.reduce((sum, item) => {
                    const invItem = inventoryMap.get(item.inventoryItemId);
                    const itemUnitCost = invItem?.unitPrice ?? 0;
                    return sum + (itemUnitCost * item.quantity);
                }, 0) ?? 0;
                dataByMonth[monthKey].ingresos += income;
                dataByMonth[monthKey].costoInsumos += costOfGoods;
            }
        }
    });
    const totalMonthlyFixedSalaries = personnel.filter((p) => !p.isArchived).reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const totalOtherFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const totalMonthlyFixedExpenses = totalMonthlyFixedSalaries + totalOtherFixedExpenses;
    Object.keys(dataByMonth).forEach(monthKey => {
        const monthData = dataByMonth[monthKey];
        monthData.gananciaBruta = monthData.ingresos - monthData.costoInsumos;
        const [year, month] = monthKey.split('-').map(Number);
        const monthStartDate = new Date(year, month - 1, 1);
        if (monthStartDate > now) {
            monthData.gastosFijos = 0;
        }
        else if (monthStartDate.getFullYear() === now.getFullYear() && monthStartDate.getMonth() === now.getMonth()) {
            const daysInMonth = (0, date_fns_1.getDaysInMonth)(monthStartDate);
            const dayOfMonth = now.getDate();
            const expenseFactor = dayOfMonth / daysInMonth;
            monthData.gastosFijos = totalMonthlyFixedExpenses * expenseFactor;
        }
        else {
            monthData.gastosFijos = totalMonthlyFixedExpenses;
        }
        monthData.utilidadNeta = monthData.gananciaBruta - monthData.gastosFijos;
    });
    const financialData = Object.values(dataByMonth);
    // --- OPERATIONAL DATA ---
    const opDataByMonth = {};
    const serviceTypeCounts = {};
    for (let i = 2; i >= 0; i--) {
        const date = (0, date_fns_1.subMonths)(now, i);
        const monthKey = (0, date_fns_1.format)(date, 'yyyy-MM');
        const monthName = (0, date_fns_1.format)(date, 'MMM yy', { locale: locale_1.es });
        opDataByMonth[monthKey] = { name: monthName };
    }
    services.forEach((s) => {
        if (s.status !== 'Entregado')
            return;
        const opDate = parseDate(s.deliveryDateTime) ?? parseDate(s.serviceDate);
        if (opDate && (0, date_fns_1.isValid)(opDate)) {
            const monthKey = (0, date_fns_1.format)(opDate, 'yyyy-MM');
            if (opDataByMonth[monthKey]) {
                const type = s.serviceType || 'Servicio General';
                opDataByMonth[monthKey][type] = (opDataByMonth[monthKey][type] || 0) + 1;
                serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
            }
        }
    });
    sales.forEach((s) => {
        if (s.status === 'Cancelado' || !s.saleDate)
            return;
        const opDate = parseDate(s.saleDate);
        if (opDate && (0, date_fns_1.isValid)(opDate)) {
            const monthKey = (0, date_fns_1.format)(opDate, 'yyyy-MM');
            if (opDataByMonth[monthKey]) {
                const type = 'Ventas POS';
                opDataByMonth[monthKey][type] = (opDataByMonth[monthKey][type] || 0) + 1;
                serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
            }
        }
    });
    const allServiceTypes = Object.keys(serviceTypeCounts);
    Object.values(opDataByMonth).forEach(monthData => {
        allServiceTypes.forEach(type => {
            if (!monthData[type])
                monthData[type] = 0;
        });
    });
    const pieData = Object.entries(serviceTypeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    const operationalData = {
        lineData: Object.values(opDataByMonth),
        pieData
    };
    // SAVE TO FIRESTORE
    await db.collection('system').doc('dashboard_stats').set({
        financialData,
        operationalData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info('Dashboard stats generated and saved to system/dashboard_stats');
    return { success: true, message: 'Stats updated.' };
}
exports.generateDashboardStats = (0, scheduler_1.onSchedule)({
    schedule: 'every day 00:05',
    timeZone: TZ,
}, async () => {
    await executeDashboardGeneration();
});
exports.forceGenerateDashboardStats = (0, https_1.onCall)({
    cors: true
}, async (request) => {
    // You could add auth checks here: if (!request.auth) throw new HttpsError...
    return await executeDashboardGeneration();
});
