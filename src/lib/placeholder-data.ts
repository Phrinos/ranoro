
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServicePart, TechnicianMonthlyPerformance } from '@/types';
import { format, subMonths, getYear, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(today.getDate() - 2);

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

export const placeholderInventory: InventoryItem[] = [
  { id: 'P001', name: 'Filtro de Aceite Bosch', sku: 'BOSCH-OF-001', quantity: 50, unitPrice: 850, lowStockThreshold: 10, category: 'Filtros' },
  { id: 'P002', name: 'Pastillas de Freno Brembo Delanteras', sku: 'BREMBO-BP-002', quantity: 5, unitPrice: 3500, lowStockThreshold: 5, category: 'Frenos' },
  { id: 'P003', name: 'Bujía NGK CR9EK', sku: 'NGK-SP-003', quantity: 100, unitPrice: 350, lowStockThreshold: 20, category: 'Motor' },
  { id: 'P004', name: 'Aceite Motor Sintético 5W-30 (Litro)', sku: 'MOBIL-OIL-5W30', quantity: 30, unitPrice: 1200, lowStockThreshold: 15, category: 'Lubricantes' },
];

const samplePartsUsed1: ServicePart[] = [
  { partId: 'P001', partName: 'Filtro de Aceite Bosch', quantity: 1, unitPrice: 850, totalPrice: 850 },
  { partId: 'P004', partName: 'Aceite Motor Sintético 5W-30 (Litro)', quantity: 4, unitPrice: 1200, totalPrice: 4800 },
];

const samplePartsUsed2: ServicePart[] = [
  { partId: 'P002', partName: 'Pastillas de Freno Brembo Delanteras', quantity: 1, unitPrice: 3500, totalPrice: 3500 },
];


export const placeholderServiceRecords: ServiceRecord[] = [
  {
    id: 'S001',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: format(twoDaysAgo, 'yyyy-MM-dd'),
    description: 'Cambio de aceite y filtro',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    partsUsed: samplePartsUsed1,
    laborHours: 1.5,
    laborRate: 2000,
    laborCost: 3000,
    totalCost: 5650 + 3000, // parts total + labor
    status: 'Completado',
    mileage: 45000,
  },
  {
    id: 'S002',
    vehicleId: 2,
    vehicleIdentifier: 'STU-456',
    serviceDate: format(yesterday, 'yyyy-MM-dd'),
    description: 'Revisión de frenos y cambio de pastillas delanteras',
    technicianId: 'T003',
    technicianName: 'Miguel Ángel Torres',
    partsUsed: samplePartsUsed2,
    laborHours: 2,
    laborRate: 2200,
    laborCost: 4400,
    totalCost: 3500 + 4400,
    status: 'En Progreso',
    mileage: 62000,
  },
  {
    id: 'S003',
    vehicleId: 3,
    vehicleIdentifier: 'VWX-789',
    serviceDate: format(today, 'yyyy-MM-dd'),
    description: 'Diagnóstico general del motor',
    technicianId: 'T002',
    technicianName: 'Laura Fernández',
    partsUsed: [],
    laborHours: 1,
    laborRate: 2500,
    laborCost: 2500,
    totalCost: 2500,
    status: 'Pendiente',
    mileage: 30500,
  },
  {
    id: 'S004',
    vehicleId: 1,
    vehicleIdentifier: 'PQR-123',
    serviceDate: format(subMonths(today, 1), 'yyyy-MM-dd'),
    description: 'Alineación y balanceo',
    technicianId: 'T001',
    technicianName: 'Roberto Gómez',
    partsUsed: [],
    laborHours: 2.5,
    laborRate: 2000,
    laborCost: 5000,
    totalCost: 5000,
    status: 'Completado',
    mileage: 40000,
  },
];

export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: placeholderServiceRecords.filter(s => s.status === 'En Progreso' || s.status === 'Pendiente').length,
  technicianEarnings: placeholderServiceRecords.filter(s => s.status === 'Completado').reduce((sum, service) => sum + (service.laborCost || 0), 0) / placeholderTechnicians.length,
  dailyRevenue: placeholderServiceRecords.filter(s => s.status === 'Completado' && s.serviceDate === format(today, 'yyyy-MM-dd')).reduce((sum, service) => sum + service.totalCost, 0),
  lowStockAlerts: placeholderInventory.filter(item => item.quantity <= item.lowStockThreshold).length,
};

export const placeholderSales: SaleReceipt[] = [
    {
        id: 'SALE001',
        saleDate: format(today, 'yyyy-MM-dd'),
        items: [
            { inventoryItemId: 'P003', itemName: 'Bujía NGK CR9EK', quantity: 4, unitPrice: 350, totalPrice: 1400 },
            { inventoryItemId: 'P001', itemName: 'Filtro de Aceite Bosch', quantity: 1, unitPrice: 850, totalPrice: 850 },
        ],
        subTotal: 2250,
        tax: 225, // Example 10% tax
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
