// src/types/index.ts
import { type ReactNode } from "react";

// ✅ Roles: tu UI compara contra "Superadministrador" y también tienes data legacy "superadmin"
export type AppRoleName =
  | "Superadministrador"
  | "Administrador"
  | "Supervisor"
  | "Técnico"
  | "Cajero"
  | "Usuario"
  // legacy si existe en data vieja:
  | "Admin"
  | "superadmin"
  | "admin"
  | "user";

export type AppRole = {
  id: string;
  name: AppRoleName | string;
  permissions: string[];
};

// ✅ Métodos de pago: incluye Crédito + combos
export type PaymentMethod =
  | "Efectivo"
  | "Tarjeta"
  | "Tarjeta MSI"
  | "Transferencia"
  | "Crédito"
  | "Efectivo+Transferencia"
  | "Tarjeta+Transferencia";
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
  photos?: string[];
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
  method: PaymentMethod;
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

  serviceItems: ServiceItem[];

  vehicleId?: string;
  vehicle?: any; // si tu Vehicle ya está tipado, cambia any por Vehicle

  safetyInspection?: SafetyInspection[]; // <-- tu UI lo pasa como array

  totalAmount?: number;
  totalCost?: number;
  serviceProfit?: number;

  [k: string]: any;
};

// ✅ SaleReceipt.items: pos profit espera itemId,itemName,quantity,total
export type SaleLineItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  total: number;
  unitPrice?: number;
};

export type SaleReceipt = {
  id: string;
  totalAmount: number;
  totalCost?: number;
  items: SaleLineItem[];
  payments?: Payment[];
  [k: string]: any;
};

export type TicketType = ServiceRecord | SaleReceipt;

// ✅ Cash drawer types: tus pantallas usan Entrada/Salida/Venta/Servicio y también hay código con "in"/"out"
export type CashDrawerTransactionType =
  | "Entrada"
  | "Salida"
  | "Venta"
  | "Servicio"
  | "in"
  | "out";

// ✅ Cash drawer transaction: rental.service manda userId, así que agréguelo
export type CashDrawerTransaction = {
  id: string;
  date: string;
  type: CashDrawerTransactionType;
  amount: number;
  note?: string;
  userId?: string;
  userName?: string;
  [k: string]: any;
};


// ✅ AuditLog: estás mandando entityType/entityId/userId/userName en logAudit
export type AuditLogAction =
  | "Crear"
  | "Editar"
  | "Eliminar"
  | "Registrar"
  | "Cancelar"
  | "Pagar"
  | "Archivar"
  | "Restaurar"
  | "CREATE"
  | "EDIT"
  | "DELETE"
  | "REGISTER"
  | "CANCEL"
  | "PAY"
  | "ARCHIVE"
  | "RESTORE";

export type AuditLog = {
  id: string;
  actionType: AuditLogAction;
  description: string;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  userName?: string;
  [k: string]: any;
};

export type InventoryCategory = {
  id: string;
  name: string;
};

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

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  supplier: string; // ID del proveedor
  purchasePrice?: number;
  salePrice?: number;
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
  date?: string;
  vehicleLicensePlate?: string;
  [k: string]: any;
}


export interface DailyRentalCharge {
  id: string;
  driverId: string;
  amount: number;
  date: string;
  vehicleLicensePlate?: string;
}

// ✅ RentalPayment: rental.service debe regresar date, así que mantenlo required
export type RentalPayment = {
  id: string;
  date: string;
  driverId: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  note?: string;
  vehicleLicensePlate?: string;
  registeredByName?: string;
  driverName?: string;
  paymentDate?: string;
  [k: string]: any;
};

export interface ManualDebtEntry {
  id: string;
  driverId: string;
  amount: number;
  reason: string;
  date: string;
  note?: string;
}

// ✅ Fines: tu UI está creando un Fine sin description -> dale required pero crea con ""
export type Fine = {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
};

// ✅ Paperwork: en flotilla/vehiculos estás guardando {dueDate,name} sin expirationDate.
// Haz expirationDate opcional para no pelearte con todos los forms.
export type Paperwork = {
  id: string;
  name: string;
  dueDate?: string;
  expirationDate?: string;
  [k: string]: any;
};

// ✅ Driver.documents NO es array; lo usas como map { [docType]: url }
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
  documents?: Record<string, string>;
  assignedVehicleLicensePlate?: string;
  [k: string]: any;
}

export interface Vehicle {
  id: string;
  name: string;
  ownerName?: string;
  ownerLicence?: string;
  ownerAddress?: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
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

// ✅ PayableAccount: agrega supplierId (purchase.service lo usa así)
export type PayableAccount = {
  id: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  dueDate: string;
  status?: string;
  invoiceId?: string;
  invoiceDate?: string;
  totalAmount?: number;
  paidAmount?: number;
  supplier?: Supplier;
};

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
