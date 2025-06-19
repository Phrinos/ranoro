

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
  lastServiceDate?: string; 
}

export interface ServiceSupply {
  supplyId: string; // Renamed from partId
  supplyName?: string; // Renamed from partName
  quantity: number;
  unitPrice?: number; // Cost price from inventory item for this supply
  // sellingPrice is removed as totalCost of service now dictates final price
}

export interface ServiceRecord {
  id: string;
  vehicleId: number;
  vehicleIdentifier?: string;
  serviceDate: string; 
  description: string;
  technicianId: string;
  technicianName?: string;
  suppliesUsed: ServiceSupply[]; // Renamed from partsUsed
  // laborHours, laborRate, laborCost removed
  totalCost: number; // This will now be the "Precio Total del Servicio" (total charge to customer)
  totalSuppliesCost?: number; // Calculated total cost of supplies to the workshop
  serviceProfit?: number; // Calculated profit for the service (totalCost - totalSuppliesCost)
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
  sku: string; 
  description?: string;
  quantity: number;
  unitPrice: number; // Cost price for the business
  sellingPrice: number; // Price for customer IF SOLD INDIVIDUALLY (less relevant for service supplies now)
  supplier: string; 
  lowStockThreshold: number;
  category: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  debtAmount?: number;
  debtNote?: string;
}

export interface PurchaseEntryFormValues {
  sku: string;
  quantity: number;
  purchasePrice: number;
}

export interface SaleItem {
  inventoryItemId: string;
  itemName:string;
  quantity: number;
  unitPrice: number; 
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
  technicianEarnings: number; // This metric might need re-evaluation based on new costing
  dailyRevenue: number;
  lowStockAlerts: number;
}

