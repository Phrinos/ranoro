
export interface Vehicle {
  id: number; // Changed to number
  make: string;
  model: string;
  year: number;
  vin: string;
  ownerName: string;
  ownerPhone: string; // Changed from ownerContact
  ownerEmail?: string; // Added
  licensePlate: string;
  color?: string; // Added
  notes?: string; // Added
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
  vehicleId: number; // Changed to number
  vehicleIdentifier?: string; // e.g., License Plate or VIN for display
  serviceDate: string; // ISO date string
  description: string;
  technicianId: string;
  technicianName?: string;
  partsUsed: ServicePart[];
  laborHours: number;
  laborRate?: number; // Cost per hour
  laborCost?: number;
  totalCost: number;
  status: 'Pendiente' | 'En Progreso' | 'Completado' | 'Cancelado';
  notes?: string;
  mileage?: number; // Added
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  contactInfo?: string;
  hireDate?: string; // ISO date string
  servicesCompleted?: number;
  revenueGenerated?: number;
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
  tax?: number; // Optional tax
  totalAmount: number;
  paymentMethod?: 'Efectivo' | 'Tarjeta' | 'Transferencia';
  customerName?: string; // Optional
}

export interface DashboardMetrics {
  activeServices: number;
  technicianEarnings: number; // Could be sum of laborCost for completed services by technicians
  dailyRevenue: number; // Sum of totalCost for completed services + POS sales for the day
  lowStockAlerts: number; // Count of items where quantity <= lowStockThreshold
}
