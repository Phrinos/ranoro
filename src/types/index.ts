// src/types/index.ts
import type { ElementType } from "react";

// =====================
// USUARIOS / PERSONAL
// =====================
export type AppRole = {
  id: string;
  name: string;
  permissions: string[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isArchived?: boolean;
  hireDate?: string;          // ISO
  phone?: string;
  address?: string;
  standardHoursPerDay?: number;
  signatureDataUrl?: string | null;
  functions?: string[];
  monthlySalary?: number;
  commissionRate?: number;
};

export type Technician = User & { specialty?: string };
export type AdministrativeStaff = User & { department?: string };
export type Personnel = User | Technician | AdministrativeStaff;

// =====================
// INVENTARIO
// =====================
export type InventoryCategory = {
  id: string;
  name: string;
  description?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  rfc?: string;
  taxRegime?: string;
  debtAmount?: number;
};

export type InventoryItem = {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  supplier?: string;
  quantity: number;
  unitPrice?: number;
  sellingPrice?: number;
  lowStockThreshold?: number;
  isService?: boolean;
  unitType?: 'units'|'ml'|'liters'|'kg'|'service';
};

// =====================
// VENTAS POS
// =====================
export type PaymentMethod =
  | 'Efectivo'
  | 'Tarjeta'
  | 'Tarjeta MSI'
  | 'Transferencia'
  | 'Efectivo+Transferencia'
  | 'Tarjeta+Transferencia';

export const PAYMENT_METHODS = ['Efectivo','Tarjeta','Tarjeta MSI','Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia'] as const;

export type Payment = {
  method: PaymentMethod;
  amount: number;
  date?: string;     // ISO
  paidAt?: string;   // ISO
  createdAt?: string;// ISO
  folio?: string;
};

export type SaleItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  total: number;
  inventoryItemId?: string;
  unitPrice?: number;
  totalPrice?: number;
};

export type SaleReceipt = {
  id: string;
  saleDate?: string; // ISO String
  status?: 'Completado' | 'Cancelado' | 'Pendiente';
  customerName?: string;
  items: SaleItem[];
  totalAmount: number;
  subTotal?: number;
  tax?: number;
  payments?: Payment[];
  paymentMethod?: PaymentMethod; // For summary views
  registeredById?: string;
  registeredByName?: string;
  profit?: number;
};

// =====================
// SERVICIOS DE TALLER
// =====================
export type ServiceItemSupply = {
  supplyId: string;
  supplyName?: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  sellingPrice?: number;
  unitType?: 'units'|'ml'|'liters'|'kg'|'service';
  isService?: boolean;
};


export type ServiceItem = {
  id?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  total: number;
  technicianId?: string;
  technicianCommission?: number;
  suppliesUsed?: ServiceItemSupply[];
  sellingPrice?: number;
  name?: string;
  price?: number;
  unitPrice?: number;
  inventoryItemId?: string;
};

export type ServiceStatus =
  | "Cotizacion"
  | "Agendado"
  | "En Taller"
  | "Entregado"
  | "Cancelado"
  | "Completado"
  | "Proveedor Externo";

export type ServiceSubStatus =
  | 'Ingresado'
  | 'En Espera de Refacciones'
  | 'Reparando'
  | 'Completado'
  | 'Confirmada'
  | 'Cancelada';

export type ServiceRecord = {
  id: string;
  status: ServiceStatus;
  folio?: string;
  description?: string;
  serviceDate: string;        // ISO
  deliveryDateTime?: string;   // ISO
  receptionDateTime?: string;  // ISO
  customerName?: string;
  serviceItems: ServiceItem[];
  payments?: Payment[];
  totalCost?: number;
  serviceProfit?: number;
  vehicleId: string;
  serviceAdvisorId?: string;
  serviceAdvisorName?: string;
  technicianId?: string;
  technicianName?: string;
  serviceAdvisorSignatureDataUrl?: string | null;
  customerSignatureReception?: string;
  customerSignatureDelivery?: string;
  publicId?: string;
  subStatus?: string;
  appointmentStatus?: 'Sin Confirmar'|'Confirmada'|'Cancelada'|string;
  customerPhone?: string;
  vehicle?: Vehicle;
  customerSignatureDataUrl?: string;
  vehicleIdentifier?: string;
  appointmentDateTime?: string;
  nextServiceInfo?: NextServiceInfo;
  paymentMethod?: string;
  cardCommission?: number;
  cancellationReason?: string;
  safetyInspection?: SafetyInspection;
  photoReports?: { title?: string; photos: string[] }[];
  originalQuoteItems?: ServiceItem[];
  notes?: string;
  fuelLevel?: 'Empty'|'1/4'|'1/2'|'3/4'|'Full'|string;
  vehicleConditions?: string;
  customerItems?: string;
  mileage?: number | null;
  serviceType?: string;
  total?: number;
  serviceAdvisorCommission?: number;
};

// =====================
// CUENTAS POR PAGAR / COMPRAS
// =====================
export type PayableAccount = {
  id: string;
  supplierId: string;
  supplierName?: string;
  invoiceId?: string;
  invoiceDate?: string;    // ISO
  dueDate?: string;        // ISO
  totalAmount: number;
  paidAmount?: number;
  status?: 'Pendiente' | 'Pagado' | 'Pagado Parcialmente';
  notes?: string;
};

// =====================
// CAJA / AUDITORÍA / OTROS
// =====================
export type CashDrawerTransaction = {
  id: string;
  type: 'Entrada' | 'Salida';
  amount: number;
  concept: string;
  description?: string;
  userId: string;
  userName: string;
  relatedType?: 'Venta' | 'Servicio' | 'Manual' | 'Flotilla';
  relatedId?: string;
  date: string;       // ISO
};

export type AuditLogAction = 'Crear' | 'Editar' | 'Eliminar' | 'Archivar' | 'Restaurar' | 'Registrar' | 'Pagar' | 'Cancelar';
export type AuditLogEntity = "user" | "vehicle" | "inventory" | "service" | "sale" | "role" | "purchase" | "payment" | "Flotilla";

export type AuditLog = {
  id: string;
  actionType: AuditLogAction;
  description: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  createdAt?: any; // Timestamp/FieldValue
  date: string; // ISO
};


// =====================
// VEHÍCULOS + LISTA PRECIOS
// =====================
export type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  licensePlate: string;
  ownerName: string;
  ownerPhone?: string;
  vin?: string;
  color?: string;
  chatMetaLink?: string;
  isFleetVehicle?: boolean;
  purchasePrice?: number;
  dailyRentalCost?: number;
  gpsCost?: number;
  insuranceCost?: number;
  adminCost?: number;
  currentMileage?: number;
  notes?: string;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  paperwork?: Paperwork[];
  fineChecks?: FineCheck[];
  lastServiceDate?: string | null; // ISO
};

export type PricedService = {
  costoInsumos?: number;
  precioPublico?: number;
  upgrades?: { [key: string]: number };
};


// =====================
// GASTOS FIJOS
// =====================
export type MonthlyFixedExpense = {
  id: string;
  name: string;
  amount: number;
  category?: 'Renta' | 'Servicios' | 'Otros' | string;
  notes?: string;
  createdAt?: string; //ISO
};

// =====================
// RENTAS / FLOTA
// =====================
export type Driver = {
  id: string;
  name: string;
  isArchived?: boolean;
  assignedVehicleId?: string;
  phone?: string;
  address?: string;
  emergencyPhone?: string;
  contractDate?: string; // ISO
  depositAmount?: number;
  requiredDepositAmount?: number;
  assignedVehicleLicensePlate?: string;
  documents?: {
    ineFrontUrl?: string;
    ineBackUrl?: string;
    licenseUrl?: string;
    proofOfAddressUrl?: string;
    promissoryNoteUrl?: string;
  };
};

export type DailyRentalCharge = { id: string; driverId: string; vehicleId: string; date: string; amount: number; vehicleLicensePlate: string };
export type RentalPayment = { id: string; driverId: string; driverName: string; vehicleLicensePlate: string; paymentDate: string; amount: number; daysCovered: number; note?: string; paymentMethod?: PaymentMethod, registeredByName?: string, };
export type OwnerWithdrawal = { id: string; ownerName: string; date: string; amount: number; note?: string };
export type VehicleExpense = { id: string; vehicleId: string; vehicleLicensePlate: string; date: string; amount: number; description: string };
export type ManualDebtEntry = { id: string; driverId: string; date: string; amount: number; note: string };


// =====================
// TIPOS RE-USABLES Y DE UI
// =====================

export type Area = string;
export type SafetyCheckStatus = "ok" | "atencion" | "inmediata" | "na";
export type SafetyCheckValue = { status: SafetyCheckStatus; notes: string; photos: string[] };
export type SafetyInspection = Record<string, SafetyCheckValue>;
export type NextServiceInfo = { date: string | null; mileage: number | null }; // ISO Date
export type ServiceTypeRecord = { id: string; name: string; estimatedHours: number; description?: string };
export type Paperwork = { id: string; name: string; dueDate: string }; // ISO Date
export type Fine = { id: string; date: string; type: string; amount: number }; // ISO Date
export type FineCheck = { id: string; checkDate: string; hasFines: boolean; fines?: Fine[] }; // ISO Date
export type NavigationEntry = { label: string; path: string; icon: ElementType; groupTag: string; isActive: boolean; permissions?: string[] };
export type Permission = { id: string; name: string; description: string };
export type InitialCashBalance = { balance: number; date: string; setByUserId: string; setByUserName: string }; // ISO Date
export type QuoteRecord = { id: string; items: ServiceItem[]; total?: number };
export type CapacityAnalysisOutput = {
  totalRequiredHours: number;
  totalAvailableHours: number;
  capacityPercentage: number;
  recommendation: string;
};
export type FinancialSummary = {
  totalTechnicianSalaries: number;
  totalAdministrativeSalaries: number;
  totalFixedExpenses: number;
  totalVariableCommissions: number;
  totalBaseExpenses: number;
};
// =====================
// ALIAS Y RE-EXPORTS
// =====================
export type {
  EngineData,
  VehicleModel,
  EngineGeneration,
  InsumosData,
  ServiciosData,
} from '@/lib/data/vehicle-database-types';
