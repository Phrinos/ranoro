import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { subMonths, format, getDaysInMonth, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const TZ = 'America/Mexico_City';

// Helper to parse dates (simplified version of frontend's parseDate)
const parseDate = (dateStr: any) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

async function executeDashboardGeneration() {
    logger.info('Starting dashboard stats generation...');
    const db = admin.firestore();
    const now = new Date();

    
    // We want data for the last 3 months
    const threeMonthsAgo = subMonths(now, 3);
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
    const dataByMonth: { [key: string]: any } = {};
    for (let i = 2; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es });
        dataByMonth[monthKey] = { name: monthName, ingresos: 0, costoInsumos: 0, gananciaBruta: 0, gastosFijos: 0, utilidadNeta: 0 };
    }

    services.forEach((s: any) => {
        if (s.status !== 'Entregado') return;
        const completionDate = parseDate(s.deliveryDateTime) ?? parseDate(s.serviceDate) ?? parseDate(s.receptionDateTime);
        
        if (completionDate && isValid(completionDate)) {
            const monthKey = format(completionDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const grossRevenue = (Array.isArray(s.payments) && s.payments.length > 0)
                        ? s.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
                        : Number(s.totalCost) || 0;
                
                const costOfGoods = s.serviceItems?.reduce((totalCost: number, item: any) => {
                    const itemSuppliesCost = item.suppliesUsed?.reduce((supplySum: number, supply: any) => {
                        return supplySum + ((supply.unitPrice || 0) * (supply.quantity || 0));
                    }, 0) || 0;
                    return totalCost + itemSuppliesCost;
                }, 0) || 0;

                dataByMonth[monthKey].ingresos += grossRevenue;
                dataByMonth[monthKey].costoInsumos += costOfGoods;
            }
        }
    });

    sales.forEach((s: any) => {
        if (s.status === 'Cancelado' || !s.saleDate) return;
        const saleDate = parseDate(s.saleDate);
        if (saleDate && isValid(saleDate)) {
            const monthKey = format(saleDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const income = Number(s.totalAmount) || 0;
                const costOfGoods = s.items?.reduce((sum: number, item: any) => {
                    const invItem = inventoryMap.get(item.inventoryItemId);
                    const itemUnitCost = (invItem as any)?.unitPrice ?? 0;
                    return sum + (itemUnitCost * item.quantity);
                }, 0) ?? 0;
                
                dataByMonth[monthKey].ingresos += income;
                dataByMonth[monthKey].costoInsumos += costOfGoods;
            }
        }
    });

    const totalMonthlyFixedSalaries = personnel.filter((p: any) => !p.isArchived).reduce((sum, p: any) => sum + (p.monthlySalary || 0), 0);
    const totalOtherFixedExpenses = fixedExpenses.reduce((sum, exp: any) => sum + (Number(exp.amount) || 0), 0);
    const totalMonthlyFixedExpenses = totalMonthlyFixedSalaries + totalOtherFixedExpenses;

    Object.keys(dataByMonth).forEach(monthKey => {
        const monthData = dataByMonth[monthKey];
        monthData.gananciaBruta = monthData.ingresos - monthData.costoInsumos;
        
        const [year, month] = monthKey.split('-').map(Number);
        const monthStartDate = new Date(year, month - 1, 1);
        
        if (monthStartDate > now) {
            monthData.gastosFijos = 0;
        } else if (monthStartDate.getFullYear() === now.getFullYear() && monthStartDate.getMonth() === now.getMonth()) {
            const daysInMonth = getDaysInMonth(monthStartDate);
            const dayOfMonth = now.getDate();
            const expenseFactor = dayOfMonth / daysInMonth;
            monthData.gastosFijos = totalMonthlyFixedExpenses * expenseFactor;
        } else {
            monthData.gastosFijos = totalMonthlyFixedExpenses;
        }
        
        monthData.utilidadNeta = monthData.gananciaBruta - monthData.gastosFijos;
    });

    const financialData = Object.values(dataByMonth);

    // --- OPERATIONAL DATA ---
    const opDataByMonth: { [key: string]: any } = {};
    const serviceTypeCounts: { [key: string]: number } = {};

    for (let i = 2; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es });
        opDataByMonth[monthKey] = { name: monthName };
    }

    services.forEach((s: any) => {
        if (s.status !== 'Entregado') return;
        const opDate = parseDate(s.deliveryDateTime) ?? parseDate(s.serviceDate);
        if (opDate && isValid(opDate)) {
            const monthKey = format(opDate, 'yyyy-MM');
            if (opDataByMonth[monthKey]) {
                const type = s.serviceType || 'Servicio General';
                opDataByMonth[monthKey][type] = (opDataByMonth[monthKey][type] || 0) + 1;
                serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
            }
        }
    });

    sales.forEach((s: any) => {
        if (s.status === 'Cancelado' || !s.saleDate) return;
        const opDate = parseDate(s.saleDate);
        if (opDate && isValid(opDate)) {
            const monthKey = format(opDate, 'yyyy-MM');
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
            if (!monthData[type]) monthData[type] = 0;
        });
    });

    const pieData = Object.entries(serviceTypeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

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

export const generateDashboardStats = onSchedule(
  {
    schedule: 'every day 00:05',
    timeZone: TZ,
  },
  async () => {
      await executeDashboardGeneration();
  }
);

export const forceGenerateDashboardStats = onCall({
    cors: true
}, async (request) => {
    // You could add auth checks here: if (!request.auth) throw new HttpsError...
    return await executeDashboardGeneration();
});
