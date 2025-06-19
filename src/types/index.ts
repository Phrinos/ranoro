
export interface Vehicle {
  id: number; 
  make: string;
  model: string;
  year: number;
  vin?: string; 
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
  unitPrice?: number; // This is cost from inventory item
  totalPrice?: number;
}

export interface ServiceRecord {
  id: string;
  vehicleId: number;
  vehicleIdentifier?: string;
  serviceDate: string; 
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
  area: string; 
  specialty: string;
  contactInfo?: string; 
  hireDate?: string; 
  monthlySalary?: number; 
  notes?: string; 
}

export interface TechnicianMonthlyPerformance {
  id: string; 
  technicianId: string;
  monthYear: string; 
  servicesCount: number;
  revenueGenerated: number; 
  earnings: number; 
  penalties: number;
}


export interface InventoryItem {
  id: string;
  name: string;
  sku: string; // Displayed as "Código"
  description?: string;
  quantity: number;
  unitPrice: number; // Cost price for the business
  sellingPrice: number; // Price for customer
  supplier?: string;
  lowStockThreshold: number;
  category?: string;
}

export interface PurchaseEntryFormValues {
  sku: string;
  quantity: number;
  purchasePrice: number;
}

export interface SaleItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number; // This will be sellingPrice from InventoryItem
  totalPrice: number;
}

export interface SaleReceipt {
  id: string;
  saleDate: string; 
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
