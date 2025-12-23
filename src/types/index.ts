// src/types/index.ts
import { type ReactNode } from "react";

// ✅ Roles: tu UI compara contra "Superadministrador" y también tienes data legacy "superadmin"
export type AppRole =
  | "Superadministrador"
  | "Administrador"
  | "Supervisor"
  | "Técnico"
  | "Cajero"
  | "Usuario"
  | "superadmin"
  | "admin"
  | "user";

// ✅ Métodos de pago: tu UI usa "Tarjeta MSI"
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Tarjeta MSI" | "Transferencia" | "Crédito" | "Efectivo+Transferencia" | "Tarjeta+Transferencia";
export const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Tarjeta MSI", "Transferencia", "Crédito"] as const;


// ✅ Sub-estatus: tu UI compara estos literales
export type ServiceSubStatus =
  | "Sin Confirmar"
  | "Confirmada"
  | "Ingresado"
  | "En Espera de Refacciones"
  | "Reparando"
  | "Completado"
  | "Cancelada";

// ✅ Safety
export type SafetyCheckStatus = "ok" | "atencion" | "inmediata" | "na";

export type SafetyCheckValue = {
  // si ya tienes fields, déjalos y solo agrega lo que falte
  status?: SafetyCheckStatus;
  note?: string;
  // value?: boolean | string | number; // opcional si ya lo manejas así
};

export type SafetyInspection = {
  id: string;
  name: string;
  value: SafetyCheckValue;
};

// ✅ Items/Payments: tu ticket usa sellingPrice y folio
export type ServiceItem = {
  id?: string;
  name?: string;
  quantity?: number;
  sellingPrice?: number; // <-- clave
  price?: number;        // fallback si hay data vieja
  suppliesUsed?: any[];
  itemName?: string;
  [k: string]: any;
};

export type Payment = {
  id?: string;
  date?: string;

  // nombre “nuevo” usado en UI:
  method?: PaymentMethod;
  amount: number;
  folio?: string;

  // nombre legacy si existe en algún lugar:
  paymentMethod?: PaymentMethod;

  [k: string]: any;
};

// ✅ ServiceRecord: tu UI lee appointmentStatus, paymentMethod, cardCommission, safetyInspection, vehicleId
export type ServiceRecord = {
  id: string;

  appointmentStatus?: string; // lo usas en UI
  subStatus?: ServiceSubStatus;

  payments?: Payment[];
  paymentMethod?: PaymentMethod;
  cardCommission?: number;

  serviceItems?: ServiceItem[];

  vehicleId?: string;
  vehicle?: any; // si tu Vehicle ya está tipado, cambia any por Vehicle

  safetyInspection?: SafetyInspection[]; // <-- tu UI lo pasa como array

  totalAmount?: number;
  totalCost?: number;
  serviceProfit?: number;

  [k: string]: any;
};

// ✅ Tickets: facturar/page.tsx usa totalAmount o totalCost
export type SaleReceipt = {
  id: string;
  totalAmount?: number;
  totalCost?: number;
  items: ServiceItem[];     // si antes era InventoryItem[], cámbialo a un tipo de línea de venta
  payments?: Payment[];
  [k: string]: any;
};

export type TicketType = ServiceRecord | SaleReceipt;

// ✅ Cash drawer: tu código usa 'Entrada'/'Salida' en algunos lados
export type CashDrawerTransactionType = "in" | "out" | "Entrada" | "Salida";


export interface Vehicle {
  id: string;
  name: string;
  ownerName?: string;
  ownerLicence?: string;
  ownerAddress?: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  year?: number;
  ownerPhone?: string;
  color?: string;
  vin?: string;
  notes?: string;
  isFleetVehicle?: boolean;
  purchasePrice?: number;
  dailyRentalCost?: number;
  gpsCost?: number;
  insuranceCost?: number;
  adminCost?: number;
  currentMileage?: number;
  assignedDriverId?: string | null;
  lastServiceDate?: string;
  fineChecks?: FineCheck[];
  paperwork?: Paperwork[];
  engine?: string;
  chatMetaLink?: string;
  assignedDriverName?: string;
}

export interface Driver {
  id: string;
  name: string;
  hasNotaryPower?: boolean;
  notaryPowerRegistrationDate?: string;
  notaryPowerExpirationDate?: string;
  contractDate?: string;
  assignedVehicleId?: string;
  isArchived?: boolean;
  phone?: string;
  emergencyPhone?: string;
  address?: string;
  requiredDepositAmount?: number;
  depositAmount?: number;
  documents?: any[];
  assignedVehicleLicensePlate?: string;
}

export interface FinancialInfo {
  hasNotaryPower?: boolean;
  notaryPowerRegistrationDate?: string;
  notaryPowerExpirationDate?: string;
}

export interface AuditLog {
  id: string;
  user: User;
  action: AuditLogAction;
  timestamp: string;
  details: any;
  userName?: string;
  description?: string;
  actionType?: string;
  date?: string;
}

export type AuditLogAction = "CREATE" | "UPDATE" | "DELETE" | "CANCEL" | "ARCHIVE" | "RESTORE" | "PAY";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  supplier: Supplier;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  lowStockThreshold?: number;
  sku?: string;
  brand?: string;
  unitPrice?: number;
  sellingPrice?: number;
  isService?: boolean;
  unitType?: string;
  description?: string;
  rendimiento?: number;
  itemName?: string;
  inventoryItemId?: string;
}

export type InventoryCategory = string;


export interface Supplier {
  id: string;
  name: string;
  description?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  rfc?: string;
  taxRegime?: string;
  debtAmount?: number;
}


export interface MonthlyFixedExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category?: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  isArchived?: boolean;
  monthlySalary?: number;
  commissionRate?: number;
  phone?: string;
  functions?: string[];
  hireDate?: string;
  signatureDataUrl?: string;
  email?: string;
}

export interface CapacityAnalysisOutput {
  capacityPercentage?: number;
  totalRequiredHours?: number;
  totalAvailableHours?: number;
  recommendation?: string;
}

export interface Personnel {
  id: string;
  name: string;
  role: string;
  isArchived?: boolean;
  standardHoursPerDay?: number;
  monthlySalary?: number;
}

export interface CashDrawerTransaction {
  id: string;
  type: CashDrawerTransactionType;
  amount: number;
  reason: string;
  timestamp: string;
  userName?: string;
  concept?: string;
  paymentMethod?: PaymentMethod;
  relatedType?: string;
}

export interface OwnerWithdrawal {
  id: string;
  vehicleId: string;
  ownerName: string;
  date: string;
  amount: number;
  note?: string;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  description: string;
  amount: number;
  date: string;
}

export interface DailyRentalCharge {
  id: string;
  driverId: string;
  amount: number;
  date: string;
  vehicleLicensePlate?: string;
}

export interface RentalPayment {
  id: string;
  driverId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  driverName?: string;
  paymentDate?: string;
  note?: string;
  vehicleLicensePlate?: string;
  registeredByName?: string;
}

export interface ManualDebtEntry {
  id: string;
  driverId: string;
  amount: number;
  reason: string;
  date: string;
  note?: string;
}

export interface FineCheck {
  id: string;
  date: string;
  hasFines: boolean;
  fines: Fine[];
  checkDate?: string;
}

export interface Fine {
  id: string;
  description: string;
  amount: number;
  date?: string;
  type?: string;
}

export interface Paperwork {
  id: string;
  name: string;
  expirationDate: string;
  dueDate?: string;
}

export interface NextServiceInfo {
  date?: string;
  mileage?: number;
}

export interface EngineData {
  insumos?: any;
  servicios?: any;
  name?: string;
}

export interface ServiceTypeRecord {
  id: string;
  name: string;
  description: string;
  estimatedHours?: number;
}

export interface PayableAccount {
  id: string;
  supplier: Supplier;
  amount: number;
  dueDate: string;
  status?: string;
  supplierName?: string;
  invoiceId?: string;
  invoiceDate?: string;
  totalAmount?: number;
  paidAmount?: number;
}

export interface NavigationEntry {
  path?: string;
  isActive?: boolean;
  label?: string;
  icon?: React.ElementType;
  groupTag?: string;
  permissions?: string[];
}

export interface Technician {
  id: string;
  name: string;
}

export interface AdministrativeStaff {
  id: string;
  name: string;
}

export interface Area {
  id: string;
  name: string;
}

export interface InitialCashBalance {
  id: string;
  amount: number;
  timestamp: string;
}

export interface FinancialSummary {
  totalTechnicianSalaries: number;
  totalAdministrativeSalaries: number;
  totalFixedExpenses: number;
  totalVariableCommissions: number;
  totalBaseExpenses: number;
}

export interface Infraction {
  id: string;
  totalAmount: number;
  paidAmount: number;
  payments: Payment[];
}

export interface SimplifiedSale {
  totalAmount: number;
}

export interface LegacySale {}
