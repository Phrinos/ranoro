
export interface Vehicle {
  id: number; // Changed to number
  make: string;
  model: string;
  year: number;
  vin?: string; // Made optional
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  licensePlate: string;
  color?: string;
  notes?: string;
  serviceHistory?: Pick<ServiceRecord, 'id' | 'serviceDate' | 'description' | 'totalCost' | 'status' | 'mileage'>[];
}

export interface ServicePart {
  partId: string;
  partName?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ServiceRecord {
  id: string;
  vehicleId: number;
  vehicleIdentifier?: string;
  serviceDate: string; // ISO date string
  description: string;
  technicianId: string;
  technicianName?: string;
  partsUsed: ServicePart[];
  laborHours: number;
  laborRate?: number;
  laborCost?: number;
  totalCost: number;
  status: 'Pendiente' | 'En Progreso' | 'Completado' | 'Cancelado';
  notes?: string;
  mileage?: number;
}

export interface Technician {
  id: string;
  name: string;
  area: string; // Added
  specialty: string;
  contactInfo?: string; // This will be used for Phone
  hireDate?: string; // ISO date string
  monthlySalary?: number; // Added
  notes?: string; // Added
  // servicesCompleted and revenueGenerated removed, will be part of monthly performance
}

export interface TechnicianMonthlyPerformance {
  id: string; // e.g., techId-year-month
  technicianId: string;
  monthYear: string; // Format "YYYY-MM" or "Month Year" e.g. "Julio 2024"
  servicesCount: number;
  revenueGenerated: number; // Total from services
  earnings: number; // Actual earnings (salary + bonus - penalties)
  penalties: number;
}


export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  supplier?: string;
  lowStockThreshold: number;
  category?: string;
}

export interface SaleItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleReceipt {
  id: string;
  saleDate: string; // ISO date string
  items: SaleItem[];
  subTotal: number;
  tax?: number;
  totalAmount: number;
  paymentMethod?: 'Efectivo' | 'Tarjeta' | 'Transferencia';
  customerName?: string;
}

export interface DashboardMetrics {
  activeServices: number;
  technicianEarnings: number;
  dailyRevenue: number;
  lowStockAlerts: number;
}
