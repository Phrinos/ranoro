




export interface WorkshopInfo {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  cityState: string;
  logoUrl: string;
}

export interface Vehicle {
  id: string; 
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
  unitType?: 'units' | 'ml' | 'liters';
}

export interface ServiceRecord {
  id: string;
  publicId?: string; // Unique, random ID for public sharing
  vehicleId: string;
  vehicleIdentifier?: string;
  serviceDate: string; 
  serviceType?: 'Servicio General' | 'Cambio de Aceite' | 'Pintura';
  description: string;
  technicianId: string;
  technicianName?: string;
  suppliesUsed: ServiceSupply[]; 
  subTotal?: number; // Pre-tax amount
  taxAmount?: number; // IVA amount
  totalCost: number; // Final, tax-inclusive price. For services, this is the "Costo del Servicio (IVA incluido)"
  totalSuppliesCost?: number; // Cost of supplies to the workshop (pre-tax)
  serviceProfit?: number; // Profit: (totalCost / (1+IVA)) - totalSuppliesCost
  status: 'Agendado' | 'Reparando' | 'Completado' | 'Cancelado';
  cancellationReason?: string;
  cancelledBy?: string;
  notes?: string;
  mileage?: number;
  deliveryDateTime?: string; 
  quoteDate?: string;
  vehicleConditions?: string;
  fuelLevel?: string;
  customerItems?: string;
  serviceAdvisorId?: string;
  serviceAdvisorName?: string;
  serviceAdvisorSignatureDataUrl?: string; // Added for public sheet
  customerSignatureReception?: string;
  customerSignatureDelivery?: string;
  receptionSignatureViewed?: boolean;
  deliverySignatureViewed?: boolean;
  workshopInfo?: WorkshopInfo;
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
  commissionRate?: number; // Example: 0.05 for 5%
  standardHoursPerDay?: number;
  isArchived?: boolean;
}

export interface AdministrativeStaff {
  id: string;
  name: string;
  roleOrArea: string; 
  contactInfo?: string;
  hireDate?: string;
  monthlySalary?: number;
  notes?: string;
  commissionRate?: number; // Example: 0.01 for 1%
  isArchived?: boolean;
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
  isService?: boolean;
  unitType?: 'units' | 'ml' | 'liters';
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
  status?: 'Completado' | 'Cancelado';
  cancellationReason?: string;
  cancelledBy?: string;
}

export interface QuoteRecord {
  id: string;
  publicId?: string; // Unique, random ID for public sharing
  serviceDate?: string; 
  quoteDate?: string;
  vehicleId?: string; // Optional if quote is generic initially
  vehicleIdentifier?: string;
  description: string;
  preparedByTechnicianId?: string; // Who prepared the quote
  preparedByTechnicianName?: string;
  suppliesProposed: ServiceSupply[]; // Renamed from suppliesUsed
  estimatedTotalCost?: number; // Final, tax-inclusive estimated price for the customer
  estimatedSubTotal?: number;
  estimatedTaxAmount?: number;
  estimatedTotalSuppliesCost?: number; // Cost of supplies to the workshop (pre-tax) for this quote
  estimatedProfit?: number; // Profit: estimatedTotalCost - estimatedTotalSuppliesCost
  notes?: string; // For validity, terms, etc.
  mileage?: number; // Current mileage at time of quote
  serviceId?: string; // ID of the service record if this quote was converted
  workshopInfo?: WorkshopInfo;
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
  type: 'Venta' | 'Servicio' | 'C. Aceite' | 'Pintura';
  description: string; 
  totalAmount: number; // This is the final, tax-inclusive amount
  profit: number;
  originalObject: SaleReceipt | ServiceRecord; 
}

export type UserRole = string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Only for creation/update, not stored in localStorage directly
  phone?: string;
  signatureDataUrl?: string;
}

export interface AppRole {
  id: string;
  name: string;
  permissions: string[]; // Array of permission strings/keys
}

export interface MonthlyFixedExpense {
  id: string;
  name: string;
  amount: number;
}

export interface PurchaseRecommendation {
  supplier: string;
  items: {
    itemName: string;
    quantity: number;
    serviceId: string;
    inventoryId: string;
  }[];
}

export interface NavigationEntry {
  label: string;
  icon: React.ElementType;
  path: string;
  isActive?: boolean;
  groupTag: string;
  permissions?: string[];
}

export interface PriceListSupply {
  name: string;
  cost: number;
  quantity: number;
  supplier: string;
}

export interface PricedService {
    id: string;
    serviceName: string;
    description?: string;
    customerPrice: number;
    estimatedTimeHours?: number;
    supplies: PriceListSupply[];
}

export interface VehiclePriceList {
  id: string;
  make: string;
  model: string;
  years: number[];
  services: PricedService[];
}