

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
  supplyId: string; 
  supplyName?: string; 
  quantity: number;
  unitPrice?: number; 
}

export interface ServiceRecord {
  id: string;
  vehicleId: number;
  vehicleIdentifier?: string;
  serviceDate: string; 
  description: string;
  technicianId: string;
  technicianName?: string;
  suppliesUsed: ServiceSupply[]; 
  subTotal?: number; // Pre-tax amount
  taxAmount?: number; // IVA amount
  totalCost: number; // Final, tax-inclusive price
  totalSuppliesCost?: number; // Cost of supplies to the workshop (pre-tax)
  serviceProfit?: number; // Profit: (subTotal) - totalSuppliesCost
  status: 'Agendado' | 'Pendiente' | 'En Progreso' | 'Completado' | 'Cancelado';
  notes?: string;
  mileage?: number;
  deliveryDateTime?: string; 
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
  unitPrice: number; // Cost to the workshop (pre-tax)
  sellingPrice: number; // Final selling price to customer (tax-inclusive)
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
  unitPrice: number; // Final selling price per unit (tax-inclusive)
  totalPrice: number; // quantity * unitPrice (final total for this line item, tax-inclusive)
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Efectivo+Transferencia' | 'Tarjeta+Transferencia';

export interface SaleReceipt {
  id: string;
  saleDate: string; 
  items: SaleItem[];
  subTotal: number; // Pre-tax subtotal of the sale
  tax: number; // Calculated IVA amount
  totalAmount: number; // Final, tax-inclusive total amount of the sale (subTotal + tax)
  paymentMethod?: PaymentMethod;
  customerName?: string;
  cardFolio?: string;
  transferFolio?: string;
}

export interface DashboardMetrics {
  activeServices: number;
  technicianEarnings: number; 
  dailyRevenue: number;
  lowStockAlerts: number;
}

export interface FinancialOperation {
  id: string;
  date: string;
  type: 'Venta' | 'Servicio';
  description: string; 
  totalAmount: number; // This is the final, tax-inclusive amount
  profit: number;
  originalObject: SaleReceipt | ServiceRecord; 
}

