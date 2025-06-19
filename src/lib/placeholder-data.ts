
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(today.getDate() - 2);
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);

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


export const placeholderInventory: InventoryItem[] = [
  { id: 'P001', name: 'Filtro de Aceite Bosch', sku: 'BOSCH-OF-001', quantity: 50, unitPrice: 700, sellingPrice: 850, lowStockThreshold: 10, category: 'Filtros', supplier: 'Repuestos Express' },
  { id: 'P002', name: 'Pastillas de Freno Brembo Delanteras', sku: 'BREMBO-BP-002', quantity: 5, unitPrice: 3000, sellingPrice: 3500, lowStockThreshold: 5, category: 'Frenos', supplier: 'AutoPartes Premium' },
  { id: 'P003', name: 'Bujía NGK CR9EK', sku: 'NGK-SP-003', quantity: 100, unitPrice: 300, sellingPrice: 350, lowStockThreshold: 20, category: 'Motor', supplier: 'NGK Spark Plugs Co.' },
  { id: 'P004', name: 'Aceite Motor Sintético 5W-30 (Litro)', sku: 'MOBIL-OIL-5W30', quantity: 30, unitPrice: 1000, sellingPrice: 1200, lowStockThreshold: 15, category: 'Lubricantes', supplier: 'Mobil Lubricants' },
];


const sampleSuppliesUsed1: ServiceSupply[] = [
  { supplyId: 'P001', supplyName: 'Filtro de Aceite Bosch', quantity: 1, unitPrice: 700 },
  { supplyId: 'P004', supplyName: 'Aceite Motor Sintético 5W-30 (Litro)', quantity: 4, unitPrice: 1000 },
];
const totalSuppliesCost1 = sampleSuppliesUsed1.reduce((sum, s) => sum + (s.unitPrice || 0) * s.quantity, 0);

const sampleSuppliesUsed2: ServiceSupply[] = [
  { supplyId: 'P002', supplyName: 'Pastillas de Freno Brembo Delanteras', quantity: 1, unitPrice: 3000 },
];
const totalSuppliesCost2 = sampleSuppliesUsed2.reduce((sum, s) => sum + (s.unitPrice || 0) * s.quantity, 0);


export const placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'S001',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: format(twoDaysAgo, 'yyyy-MM-dd HH:mm:ss'), // Using full ISO for consistency with new form
    description: 'Cambio de aceite y filtro',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    suppliesUsed: sampleSuppliesUsed1,
    totalCost: 6000,
    totalSuppliesCost: totalSuppliesCost1,
    serviceProfit: 6000 - totalSuppliesCost1,
    status: 'Completado',
    mileage: 45000,
    deliveryDateTime: setHours(setMinutes(twoDaysAgo, 30), 17).toISOString(),
  },
  {
    id: 'S002',
    vehicleId: 2,
    vehicleIdentifier: 'STU-456',
    serviceDate: format(yesterday, 'yyyy-MM-dd HH:mm:ss'),
    description: 'Revisión de frenos y cambio de pastillas delanteras',
    technicianId: 'T003',
    technicianName: 'Miguel Ángel Torres',
    suppliesUsed: sampleSuppliesUsed2,
    totalCost: 7500,
    totalSuppliesCost: totalSuppliesCost2,
    serviceProfit: 7500 - totalSuppliesCost2,
    status: 'En Progreso',
    mileage: 62000,
  },
  {
    id: 'S003',
    vehicleId: 3,
    vehicleIdentifier: 'VWX-789',
    serviceDate: format(today, 'yyyy-MM-dd HH:mm:ss'),
    description: 'Diagnóstico general del motor',
    technicianId: 'T002',
    technicianName: 'Laura Fernández',
    suppliesUsed: [],
    totalCost: 3000,
    totalSuppliesCost: 0,
    serviceProfit: 3000 - 0,
    status: 'Pendiente',
    mileage: 30500,
  },
  {
    id: 'S004',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: format(subMonths(today, 1), 'yyyy-MM-dd HH:mm:ss'),
    description: 'Alineación y balanceo',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    suppliesUsed: [],
    totalCost: 5000,
    totalSuppliesCost: 0,
    serviceProfit: 5000,
    status: 'Completado',
    mileage: 40000,
    deliveryDateTime: setHours(setMinutes(subMonths(today, 1), 0), 16).toISOString(),
  },
  {
    id: 'S005',
    vehicleId: 2,
    vehicleIdentifier: 'STU-456',
    serviceDate: format(setHours(setMinutes(tomorrow, 0), 10), 'yyyy-MM-dd HH:mm:ss'), // Example: Tomorrow at 10:00
    description: 'Revisión de luces y sistema eléctrico',
    technicianId: 'T002',
    technicianName: 'Laura Fernández',
    suppliesUsed: [],
    totalCost: 4000,
    totalSuppliesCost: 0,
    serviceProfit: 4000,
    status: 'Agendado',
    mileage: 62300,
  },
  {
    id: 'S006',
    vehicleId: 3,
    vehicleIdentifier: 'VWX-789',
    serviceDate: format(setHours(setMinutes(dayAfterTomorrow, 30), 14), 'yyyy-MM-dd HH:mm:ss'), // Example: Day after tomorrow at 14:30
    description: 'Mantenimiento preventivo mayor',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    suppliesUsed: sampleSuppliesUsed1,
    totalCost: 12000,
    totalSuppliesCost: totalSuppliesCost1,
    serviceProfit: 12000 - totalSuppliesCost1,
    status: 'Agendado',
    mileage: 31000,
  },
];

export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: placeholderServiceRecords.filter(s => s.status === 'En Progreso' || s.status === 'Pendiente' || s.status === 'Agendado').length,
  technicianEarnings: placeholderTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0) / (placeholderTechnicians.length || 1) ,
  dailyRevenue: 0, // Set to 0 or null, will be calculated client-side in DashboardPage
  lowStockAlerts: placeholderInventory.filter(item => item.quantity <= item.lowStockThreshold).length,
};

export const placeholderSales: SaleReceipt[] = [
    {
        id: 'SALE001',
        saleDate: format(today, 'yyyy-MM-dd'), // Ensure this uses the module-level 'today'
        items: [
            { inventoryItemId: 'P003', itemName: 'Bujía NGK CR9EK', quantity: 4, unitPrice: 350, totalPrice: 1400 },
            { inventoryItemId: 'P001', itemName: 'Filtro de Aceite Bosch', quantity: 1, unitPrice: 850, totalPrice: 850 },
        ],
        subTotal: 2250,
        tax: 225,
        totalAmount: 2475,
        paymentMethod: 'Efectivo',
        customerName: 'Cliente Ocasional'
    }
];

export const placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [
  { id: 'T001-2024-07', technicianId: 'T001', monthYear: format(today, 'MMMM yyyy', { locale: es }), servicesCount: 8, revenueGenerated: 45000, earnings: 52000, penalties: 500 },
  { id: 'T001-2024-06', technicianId: 'T001', monthYear: format(subMonths(today, 1), 'MMMM yyyy', { locale: es }), servicesCount: 7, revenueGenerated: 40000, earnings: 50000, penalties: 0 },
  { id: 'T002-2024-07', technicianId: 'T002', monthYear: format(today, 'MMMM yyyy', { locale: es }), servicesCount: 10, revenueGenerated: 60000, earnings: 58000, penalties: 200 },
  { id: 'T002-2024-06', technicianId: 'T002', monthYear: format(subMonths(today, 1), 'MMMM yyyy', { locale: es }), servicesCount: 9, revenueGenerated: 55000, earnings: 56000, penalties: 0 },
  { id: 'T003-2024-07', technicianId: 'T003', monthYear: format(today, 'MMMM yyyy', { locale: es }), servicesCount: 6, revenueGenerated: 35000, earnings: 49000, penalties: 1000 },
];
