

import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, startOfYesterday, endOfYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

const today = new Date();
const yesterday = subDays(today,1);
const twoDaysAgo = subDays(today,2);
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);

const IVA_RATE = 0.16;

export const placeholderVehicles: Vehicle[] = [
  { id: 1, make: 'Toyota', model: 'Corolla', year: 2020, vin: 'ABC123XYZ789', ownerName: 'Juan Pérez', ownerPhone: '555-1111', ownerEmail: 'juan.perez@email.com', licensePlate: 'PQR-123', color: 'Rojo', notes: 'Cliente frecuente, prefiere aceite sintético.' },
  { id: 2, make: 'Honda', model: 'Civic', year: 2019, vin: 'DEF456UVW456', ownerName: 'Maria López', ownerPhone: '555-2222', ownerEmail: 'maria.lopez@email.com', licensePlate: 'STU-456', color: 'Azul Metálico', notes: 'Revisar alineación en próxima visita.' },
  { id: 3, make: 'Ford', model: 'F-150', year: 2021, vin: 'GHI789RST123', ownerName: 'Carlos Sánchez', ownerPhone: '555-3333', ownerEmail: 'carlos.sanchez@email.com', licensePlate: 'VWX-789', color: 'Negro', notes: 'Uso rudo, verificar suspensión.' },
];

export const placeholderTechnicians: Technician[] = [
  { id: 'T001', name: 'Roberto Gómez', area: 'Mecánica General', specialty: 'Motor y Transmisión', contactInfo: '555-7777', hireDate: '2022-01-15', monthlySalary: 50000, notes: 'Experto en motores diesel.' },
  { id: 'T002', name: 'Laura Fernández', area: 'Electrónica', specialty: 'Diagnóstico Electrónico', contactInfo: '555-8888', hireDate: '2021-06-01', monthlySalary: 55000, notes: 'Certificada en sistemas híbridos.' },
  { id: 'T003', name: 'Miguel Ángel Torres', area: 'Mecánica General', specialty: 'Frenos y Suspensión', contactInfo: '555-9999', hireDate: '2023-03-10', monthlySalary: 48000, notes: 'Rápido y eficiente.' },
];

export const placeholderCategories: InventoryCategory[] = [
  { id: 'CAT001', name: 'Filtros' },
  { id: 'CAT002', name: 'Frenos' },
  { id: 'CAT003', name: 'Motor' },
  { id: 'CAT004', name: 'Lubricantes' },
  { id: 'CAT005', name: 'Suspensión' },
  { id: 'CAT006', name: 'Eléctrico' },
];

export const placeholderSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'Repuestos Express', contactPerson: 'Ana García', phone: '555-1212', email: 'ventas@repuestosexpress.com', address: 'Calle Falsa 123, Ciudad', debtAmount: 0, debtNote: '' },
  { id: 'SUP002', name: 'AutoPartes Premium', contactPerson: 'Luis Martínez', phone: '555-3434', email: 'luis.m@autopartespremium.com', address: 'Av. Siempreviva 742, Pueblo', debtAmount: 15000, debtNote: 'Pago pendiente factura #INV-1023' },
  { id: 'SUP003', name: 'NGK Spark Plugs Co.', phone: '555-5656', email: 'info@ngk.com', debtAmount: 0 },
  { id: 'SUP004', name: 'Mobil Lubricants', contactPerson: 'Carlos Rodriguez', phone: '555-8989', email: 'crodriguez@mobil.example', debtAmount: 5250.75, debtNote: 'Consignación aceites especiales' },
];


// unitPrice is cost to workshop (pre-tax)
// sellingPrice is final selling price to customer (tax-inclusive)
export const placeholderInventory: InventoryItem[] = [
  { id: 'P001', name: 'Filtro de Aceite Bosch', sku: 'BOSCH-OF-001', quantity: 150, unitPrice: 70, sellingPrice: 98.60, lowStockThreshold: 10, category: 'Filtros', supplier: 'Repuestos Express' }, // 70 * 1.16 = 81.2, let's make it a bit more for profit margin, sellingPrice with tax = 98.60 -> subtotal = 85
  { id: 'P002', name: 'Pastillas de Freno Brembo Delanteras', sku: 'BREMBO-BP-002', quantity: 25, unitPrice: 300, sellingPrice: 406, lowStockThreshold: 5, category: 'Frenos', supplier: 'AutoPartes Premium' }, // 300 -> sellingPrice with tax = 406 -> subtotal = 350
  { id: 'P003', name: 'Bujía NGK CR9EK', sku: 'NGK-SP-003', quantity: 200, unitPrice: 30, sellingPrice: 40.60, lowStockThreshold: 20, category: 'Motor', supplier: 'NGK Spark Plugs Co.' }, // 30 -> sellingPrice with tax = 40.60 -> subtotal = 35
  { id: 'P004', name: 'Aceite Motor Sintético 5W-30 (Litro)', sku: 'MOBIL-OIL-5W30', quantity: 130, unitPrice: 100, sellingPrice: 139.20, lowStockThreshold: 15, category: 'Lubricantes', supplier: 'Mobil Lubricants' }, // 100 -> sellingPrice with tax = 139.20 -> subtotal = 120
  { id: 'P005', name: 'Amortiguador Delantero KYB', sku: 'KYB-SHOCK-F001', quantity: 10, unitPrice: 450, sellingPrice: 638, lowStockThreshold: 4, category: 'Suspensión', supplier: 'Repuestos Express'}, // 450 -> sellingPrice with tax = 638 -> subtotal = 550
  { id: 'P006', name: 'Batería LTH 12V', sku: 'LTH-BAT-12V', quantity: 8, unitPrice: 250, sellingPrice: 371.20, lowStockThreshold: 3, category: 'Eléctrico', supplier: 'AutoPartes Premium'}, // 250 -> sellingPrice with tax = 371.20 -> subtotal = 320
];


const sampleSuppliesUsed1: ServiceSupply[] = [
  { supplyId: 'P001', supplyName: 'Filtro de Aceite Bosch', quantity: 1, unitPrice: placeholderInventory.find(i => i.id === 'P001')!.unitPrice },
  { supplyId: 'P004', supplyName: 'Aceite Motor Sintético 5W-30 (Litro)', quantity: 4, unitPrice: placeholderInventory.find(i => i.id === 'P004')!.unitPrice },
];
const totalSuppliesCost1 = sampleSuppliesUsed1.reduce((sum, s) => sum + (s.unitPrice || 0) * s.quantity, 0);

const sampleSuppliesUsed2: ServiceSupply[] = [
  { supplyId: 'P002', supplyName: 'Pastillas de Freno Brembo Delanteras', quantity: 1, unitPrice: placeholderInventory.find(i => i.id === 'P002')!.unitPrice },
];
const totalSuppliesCost2 = sampleSuppliesUsed2.reduce((sum, s) => sum + (s.unitPrice || 0) * s.quantity, 0);


// ServiceRecord: totalCost is final, tax-inclusive
// subTotal = totalCost / 1.16
// taxAmount = totalCost - subTotal
// serviceProfit = subTotal - totalSuppliesCost
export const placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'S001',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: setHours(setMinutes(twoDaysAgo, 0), 9).toISOString(),
    description: 'Cambio de aceite y filtro',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    suppliesUsed: sampleSuppliesUsed1,
    totalCost: 696, // Final price (e.g., 600 subtotal + 96 IVA)
    subTotal: 696 / (1 + IVA_RATE),
    taxAmount: 696 - (696 / (1 + IVA_RATE)),
    totalSuppliesCost: totalSuppliesCost1,
    serviceProfit: (696 / (1 + IVA_RATE)) - totalSuppliesCost1,
    status: 'Completado',
    mileage: 45000,
    deliveryDateTime: setHours(setMinutes(twoDaysAgo, 30), 17).toISOString(),
  },
  {
    id: 'S002',
    vehicleId: 2,
    vehicleIdentifier: 'STU-456',
    serviceDate: setHours(setMinutes(yesterday, 30), 11).toISOString(),
    description: 'Revisión de frenos y cambio de pastillas delanteras',
    technicianId: 'T003',
    technicianName: 'Miguel Ángel Torres',
    suppliesUsed: sampleSuppliesUsed2,
    totalCost: 870, // Final price (e.g., 750 subtotal + 120 IVA)
    subTotal: 870 / (1 + IVA_RATE),
    taxAmount: 870 - (870 / (1 + IVA_RATE)),
    totalSuppliesCost: totalSuppliesCost2,
    serviceProfit: (870 / (1 + IVA_RATE)) - totalSuppliesCost2,
    status: 'En Progreso',
    mileage: 62000,
  },
  {
    id: 'S003',
    vehicleId: 3,
    vehicleIdentifier: 'VWX-789',
    serviceDate: setHours(setMinutes(today, 0), 14).toISOString(),
    description: 'Diagnóstico general del motor',
    technicianId: 'T002',
    technicianName: 'Laura Fernández',
    suppliesUsed: [],
    totalCost: 348, // Final price (e.g., 300 subtotal + 48 IVA)
    subTotal: 348 / (1 + IVA_RATE),
    taxAmount: 348 - (348 / (1 + IVA_RATE)),
    totalSuppliesCost: 0,
    serviceProfit: (348 / (1 + IVA_RATE)) - 0,
    status: 'Pendiente',
    mileage: 30500,
  },
  {
    id: 'S004',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: setHours(setMinutes(subMonths(today, 1), 0), 10).toISOString(),
    description: 'Alineación y balanceo',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    suppliesUsed: [],
    totalCost: 580, // Final price (e.g., 500 subtotal + 80 IVA)
    subTotal: 580 / (1 + IVA_RATE),
    taxAmount: 580 - (580 / (1 + IVA_RATE)),
    totalSuppliesCost: 0,
    serviceProfit: (580 / (1 + IVA_RATE)),
    status: 'Completado',
    mileage: 40000,
    deliveryDateTime: setHours(setMinutes(subMonths(today, 1), 0), 16).toISOString(),
  },
  {
    id: 'S005',
    vehicleId: 2,
    vehicleIdentifier: 'STU-456',
    serviceDate: setHours(setMinutes(tomorrow, 0), 10).toISOString(), 
    description: 'Revisión de luces y sistema eléctrico',
    technicianId: 'T002',
    technicianName: 'Laura Fernández',
    suppliesUsed: [],
    totalCost: 464, // Final price (e.g., 400 subtotal + 64 IVA)
    subTotal: 464 / (1 + IVA_RATE),
    taxAmount: 464 - (464 / (1 + IVA_RATE)),
    totalSuppliesCost: 0,
    serviceProfit: (464 / (1 + IVA_RATE)),
    status: 'Agendado',
    mileage: 62300,
  },
  {
    id: 'S006',
    vehicleId: 3,
    vehicleIdentifier: 'VWX-789',
    serviceDate: setHours(setMinutes(dayAfterTomorrow, 30), 14).toISOString(), 
    description: 'Mantenimiento preventivo mayor',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    suppliesUsed: sampleSuppliesUsed1,
    totalCost: 1392, // Final price (e.g., 1200 subtotal + 192 IVA)
    subTotal: 1392 / (1 + IVA_RATE),
    taxAmount: 1392 - (1392 / (1 + IVA_RATE)),
    totalSuppliesCost: totalSuppliesCost1,
    serviceProfit: (1392 / (1 + IVA_RATE)) - totalSuppliesCost1,
    status: 'Agendado',
    mileage: 31000,
  },
  {
    id: 'S007',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: setHours(setMinutes(today, 0), 9).toISOString(),
    description: 'Rotación de neumáticos y chequeo de presión',
    technicianId: 'T003',
    technicianName: 'Miguel Ángel Torres',
    suppliesUsed: [],
    totalCost: 174, // Final price (e.g., 150 subtotal + 24 IVA)
    subTotal: 174 / (1 + IVA_RATE),
    taxAmount: 174 - (174 / (1 + IVA_RATE)),
    totalSuppliesCost: 0,
    serviceProfit: (174 / (1 + IVA_RATE)),
    status: 'Completado',
    mileage: 45500,
    deliveryDateTime: setHours(setMinutes(today, 30), 10).toISOString(),
  },
];

export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: placeholderServiceRecords.filter(s => s.status === 'En Progreso' || s.status === 'Pendiente' || s.status === 'Agendado').length,
  technicianEarnings: placeholderTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0) / (placeholderTechnicians.length || 1) ,
  dailyRevenue: 0, 
  lowStockAlerts: placeholderInventory.filter(item => item.quantity <= item.lowStockThreshold).length,
};

// SaleReceipt: items.unitPrice is final tax-inclusive per unit. items.totalPrice = quantity * unitPrice
// totalAmount = sum of items.totalPrice
// subTotal = totalAmount / 1.16
// tax = totalAmount - subTotal
export const placeholderSales: SaleReceipt[] = [
    {
        id: 'SALE001',
        saleDate: setHours(setMinutes(today, 15), 10).toISOString(),
        items: [
            { inventoryItemId: 'P003', itemName: 'Bujía NGK CR9EK', quantity: 4, unitPrice: placeholderInventory.find(i=>i.id==='P003')!.sellingPrice, totalPrice: 4 * placeholderInventory.find(i=>i.id==='P003')!.sellingPrice },
            { inventoryItemId: 'P001', itemName: 'Filtro de Aceite Bosch', quantity: 1, unitPrice: placeholderInventory.find(i=>i.id==='P001')!.sellingPrice, totalPrice: 1 * placeholderInventory.find(i=>i.id==='P001')!.sellingPrice },
        ],
        totalAmount: (4 * placeholderInventory.find(i=>i.id==='P003')!.sellingPrice) + (1 * placeholderInventory.find(i=>i.id==='P001')!.sellingPrice),
        subTotal: ((4 * placeholderInventory.find(i=>i.id==='P003')!.sellingPrice) + (1 * placeholderInventory.find(i=>i.id==='P001')!.sellingPrice)) / (1 + IVA_RATE),
        tax: ((4 * placeholderInventory.find(i=>i.id==='P003')!.sellingPrice) + (1 * placeholderInventory.find(i=>i.id==='P001')!.sellingPrice)) - (((4 * placeholderInventory.find(i=>i.id==='P003')!.sellingPrice) + (1 * placeholderInventory.find(i=>i.id==='P001')!.sellingPrice)) / (1 + IVA_RATE)),
        paymentMethod: 'Efectivo',
        customerName: 'Cliente Ocasional'
    },
    {
        id: 'SALE002',
        saleDate: setHours(setMinutes(yesterday, 30), 16).toISOString(),
        items: [
            { inventoryItemId: 'P004', itemName: 'Aceite Motor Sintético 5W-30 (Litro)', quantity: 5, unitPrice: placeholderInventory.find(i=>i.id==='P004')!.sellingPrice, totalPrice: 5 * placeholderInventory.find(i=>i.id==='P004')!.sellingPrice },
        ],
        totalAmount: 5 * placeholderInventory.find(i=>i.id==='P004')!.sellingPrice,
        subTotal: (5 * placeholderInventory.find(i=>i.id==='P004')!.sellingPrice) / (1 + IVA_RATE),
        tax: (5 * placeholderInventory.find(i=>i.id==='P004')!.sellingPrice) - ((5 * placeholderInventory.find(i=>i.id==='P004')!.sellingPrice) / (1 + IVA_RATE)),
        paymentMethod: 'Tarjeta',
        cardFolio: 'TKN456789',
        customerName: 'Ana Torres'
    },
    {
        id: 'SALE003',
        saleDate: setHours(setMinutes(twoDaysAgo, 0), 11).toISOString(),
        items: [
            { inventoryItemId: 'P002', itemName: 'Pastillas de Freno Brembo Delanteras', quantity: 1, unitPrice: placeholderInventory.find(i=>i.id==='P002')!.sellingPrice, totalPrice: 1 * placeholderInventory.find(i=>i.id==='P002')!.sellingPrice },
            { inventoryItemId: 'P005', itemName: 'Amortiguador Delantero KYB', quantity: 2, unitPrice: placeholderInventory.find(i=>i.id==='P005')!.sellingPrice, totalPrice: 2 * placeholderInventory.find(i=>i.id==='P005')!.sellingPrice },
        ],
        totalAmount: (1 * placeholderInventory.find(i=>i.id==='P002')!.sellingPrice) + (2 * placeholderInventory.find(i=>i.id==='P005')!.sellingPrice),
        subTotal: ((1 * placeholderInventory.find(i=>i.id==='P002')!.sellingPrice) + (2 * placeholderInventory.find(i=>i.id==='P005')!.sellingPrice)) / (1+IVA_RATE),
        tax: ((1 * placeholderInventory.find(i=>i.id==='P002')!.sellingPrice) + (2 * placeholderInventory.find(i=>i.id==='P005')!.sellingPrice)) - (((1 * placeholderInventory.find(i=>i.id==='P002')!.sellingPrice) + (2 * placeholderInventory.find(i=>i.id==='P005')!.sellingPrice)) / (1+IVA_RATE)),
        paymentMethod: 'Transferencia',
        transferFolio: 'TRN123DEF'
    },
    {
        id: 'SALE004',
        saleDate: setHours(setMinutes(today, 45), 14).toISOString(),
        items: [
            { inventoryItemId: 'P006', itemName: 'Batería LTH 12V', quantity: 1, unitPrice: placeholderInventory.find(i=>i.id==='P006')!.sellingPrice, totalPrice: 1 * placeholderInventory.find(i=>i.id==='P006')!.sellingPrice },
        ],
        totalAmount: 1 * placeholderInventory.find(i=>i.id==='P006')!.sellingPrice,
        subTotal: (1 * placeholderInventory.find(i=>i.id==='P006')!.sellingPrice) / (1+IVA_RATE),
        tax: (1 * placeholderInventory.find(i=>i.id==='P006')!.sellingPrice) - ((1 * placeholderInventory.find(i=>i.id==='P006')!.sellingPrice) / (1+IVA_RATE)),
        paymentMethod: 'Efectivo+Transferencia',
        transferFolio: 'TRN789GHI',
        customerName: 'Luis Gómez'
    }
];

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [
  { id: 'T001-2024-07', technicianId: 'T001', monthYear: format(today, 'MMMM yyyy', { locale: es }), servicesCount: 8, revenueGenerated: 4500, earnings: 5200, penalties: 50 },
  { id: 'T001-2024-06', technicianId: 'T001', monthYear: format(subMonths(today, 1), 'MMMM yyyy', { locale: es }), servicesCount: 7, revenueGenerated: 4000, earnings: 5000, penalties: 0 },
  { id: 'T002-2024-07', technicianId: 'T002', monthYear: format(today, 'MMMM yyyy', { locale: es }), servicesCount: 10, revenueGenerated: 6000, earnings: 5800, penalties: 20 },
  { id: 'T002-2024-06', technicianId: 'T002', monthYear: format(subMonths(today, 1), 'MMMM yyyy', { locale: es }), servicesCount: 9, revenueGenerated: 5500, earnings: 5600, penalties: 0 },
  { id: 'T003-2024-07', technicianId: 'T003', monthYear: format(today, 'MMMM yyyy', { locale: es }), servicesCount: 6, revenueGenerated: 3500, earnings: 4900, penalties: 100 },
];

export const placeholderAppRoles: AppRole[] = [
    { id: 'role_superadmin', name: 'Superadmin', permissions: ['all'] }, // 'all' could be a special permission
    { id: 'role_admin', name: 'Admin', permissions: ['dashboard:view', 'services:create', 'services:edit', 'inventory:manage', 'users:manage', 'finances:view_report'] },
    { id: 'role_tecnico', name: 'Técnico', permissions: ['dashboard:view', 'services:edit', 'inventory:view'] },
    { id: 'role_ventas', name: 'Ventas', permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view'] },
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
