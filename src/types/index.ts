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
  id: string | number;
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
  // Campos usados en UI:
  description?: string;
  rfc?: string;
  taxRegime?: string;
  debtAmount?: number; // calculado/denormalizado
};

export type InventoryItem = {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;         // id de categoría
  supplier?: string;         // id de proveedor
  quantity?: number;
  unitPrice?: number;        // costo taller
  sellingPrice?: number;     // precio público
  lowStockThreshold?: number;
  isService?: boolean;       // true si es servicio, false si es refacción
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

export type Payment = {
  method: PaymentMethod;
  amount: number;
  date?: string;     // ISO
  paidAt?: string;   // ISO
  createdAt?: string;// ISO
  folio?: string;
};

export type SaleItem = {
  // Lo que requiere calculateSaleProfit y tus tablas:
  itemId: string;          // requerido
  itemName: string;        // requerido
  quantity: number;        // requerido
  total: number;           // requerido (precio * qty)
  // plus (opcional) para buscar costos:
  inventoryItemId?: string;
  unitPrice?: number;      // costo taller (si viene)
  totalPrice?: number;
};

export type SaleReceipt = {
  id: string;
  saleDate?: string | Date;
  status?: 'Completado' | 'Cancelado' | 'Pendiente';
  customerName?: string;         // usado en UI
  items: SaleItem[];             // requerido
  totalAmount: number;           // requerido
  subTotal?: number;             // usado en Ticket/Config
  tax?: number;                  // usado en Ticket/Config
  payments?: Payment[];
  registeredById?: string;
  registeredByName?: string;
};

// =====================
// SERVICIOS DE TALLER
// =====================
export type ServiceItemSupply = {
  name?: string;
  quantity?: number;
  unitPrice?: number;
};

export type ServiceItem = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  total: number;
  // usados en rendimiento y listas:
  technicianId?: string;
  technicianCommission?: number;
  suppliesUsed?: ServiceItemSupply[];
  sellingPrice?: number;
  name?: string;
};

export type ServiceStatus =
  | "Cotizacion"
  | "Agendado"
  | "En Taller"
  | "Entregado"
  | "Cancelado"
  | "Completado"
  | "Proveedor Externo";

export type ServiceRecord = {
  id: string;
  status: ServiceStatus;
  folio?: string;
  description?: string;
  serviceDate?: string;        // ISO
  deliveryDateTime?: string;   // ISO
  receptionDateTime?: string;  // ISO
  customerName?: string;
  serviceItems?: ServiceItem[];
  payments?: Payment[];
  total?: number;
  totalCost?: number;
  serviceProfit?: number;
  serviceAdvisorCommission?: number;
  vehicleId?: string;
  assignedToName?: string;
  advisorName?: string;
  technicianName?: string;
  deliveredByName?: string;
  serviceAdvisorSignatureDataUrl?: string | null;
  technicianSignatureDataUrl?: string | null;
  customerSignatureReception?: string;
  customerSignatureDelivery?: string;
  publicId?: string;
  subStatus?: string;
  appointmentStatus?: 'Sin Confirmar'|'Confirmada'|'Cancelada'|string;
  customerPhone?: string;
  vehicle?: Vehicle;
  customerSignatureDataUrl?: string;
  mechanicId?: string;
  mechanicName?: string;
  serviceAdvisorId?: string;
  vehicleIdentifier?: string;
  appointmentDateTime?: string;
  nextServiceInfo?: NextServiceInfo;
  paymentMethod?: string;
  cardCommission?: number;
  cancellationReason?: string;
  workshopInfo?: WorkshopInfo;
  safetyInspection?: SafetyInspection;
  photoReports?: { title?: string; photos: string[] }[];
  originalQuoteItems?: ServiceItem[];
  notes?: string;
  fuelLevel?: 'Empty'|'1/4'|'1/2'|'3/4'|'Full'|string;
  vehicleConditions?: string;
  customerItems?: string;
  mileage?: number | null;
  serviceType?: string;
};

// =====================
// CUENTAS POR PAGAR / COMPRAS
// =====================
export type PayableAccount = {
  id: string;
  supplierId: string;
  supplierName?: string;   // denormalizado (usado en logs/ledger)
  invoiceId?: string;
  invoiceDate?: string;    // ISO
  dueDate?: string;        // ISO
  totalAmount: number;     // requerido en UI
  paidAmount?: number;     // usado para saldo
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
  concept?: string;
  description?: string;
  fullDescription?: string;
  user?: string;
  userName?: string;
  relatedType?: 'Venta' | 'Servicio' | 'Manual';
  relatedId?: string;
  date?: string;       // ISO
  createdAt?: string;  // ISO
};

export type AuditLogAction = 'Crear' | 'Editar' | 'Eliminar' | 'Archivar' | 'Restaurar' | 'Registrar' | 'Pagar' | 'Cancelar';

export type AuditLog = {
  id: string;
  date: string; // ISO
  userName?: string;
  actionType: AuditLogAction;
  description?: string;
  createdAt?: any;
  entityType?: string;
  entityId?: string;
  userId?: string;
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
  lastServiceDate?: Date | string | null;
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
  createdAt?: string;
};

// =====================
// RENTAS / FLOTA (si lo usas)
// =====================
export type Driver = {
  id: string;
  name: string;
  isArchived?: boolean;
  assignedVehicleId?: string;
  phone?: string;
  address?: string;
  emergencyPhone?: string;
  contractDate?: string;
  depositAmount?: number;
  requiredDepositAmount?: number;
  assignedVehicleLicensePlate?: string;
};

// ... otros tipos de flotilla ...
export type DailyRentalCharge = { id: string; driverId: string; vehicleId: string; date: string; amount: number; vehicleLicensePlate: string };
export type RentalPayment = { id: string; driverId: string; driverName: string; vehicleLicensePlate: string; paymentDate: string; amount: number; daysCovered: number; note?: string };
export type OwnerWithdrawal = { id: string; ownerName: string; date: string; amount: number; note?: string };
export type VehicleExpense = { id: string; vehicleId: string; vehicleLicensePlate: string; date: string; amount: number; description: string };
export type ManualDebtEntry = { id: string; driverId: string; date: string; amount: number; note: string };


// =====================
// TIPOS RE-USABLES Y DE UI
// =====================

export type SafetyCheckStatus = "ok" | "atencion" | "inmediata" | "na";
export type SafetyCheckValue = { status: SafetyCheckStatus; notes: string; photos: string[] };
export type SafetyInspection = Record<string, SafetyCheckValue>;
export type NextServiceInfo = { date: string | Date | null; mileage: number | null };
export type ServiceTypeRecord = { id: string; name: string; estimatedHours: number };
export type Paperwork = { id: string; name: string; dueDate: string };
export type Fine = { id: string; date: string; type: string; amount: number };
export type FineCheck = { id: string; checkDate: string; hasFines: boolean; fines?: Fine[] };
export type NavigationEntry = { label: string; path: string; icon: ElementType; groupTag: string; isActive: boolean; permissions?: string[] };
export type Permission = { id: string; name: string; description: string };
export type InitialCashBalance = { balance: number; date: string; setByUserId: string; setByUserName: string };

// =====================
// ALIAS Y RE-EXPORTS
// =====================

/** @deprecated Usa el tipo local TicketBranding en su lugar. */
export type WorkshopInfo = Record<string, unknown>;

export type {
  EngineData,
  VehicleMake as VehiclePriceListMake,
  VehicleModel,
  EngineGeneration,
  InsumosData,
  ServiciosData,
} from '@/lib/data/vehicle-database-types';
export type VehiclePriceList = VehiclePriceListMake;
