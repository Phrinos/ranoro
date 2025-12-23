import { type ReactNode } from "react";

export const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia", "Crédito"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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

export type ServiceSubStatus =
  | "pending"
  | "pending-approval"
  | "approved"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface ServiceRecord {
  id: string;
  vehicle: Vehicle;
  items: ServiceItem[];
  payments: Payment[];
  status: string;
  subTotal: number;
  total: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deliveryDateTime?: string;
  serviceDate?: string;
  receptionDateTime?: string;
  totalCost?: number;
  serviceItems?: ServiceItem[];
  serviceType?: string;
  folio?: string;
  vehicleIdentifier?: string;
  cancellationReason?: string;
  publicId?: string;
  subStatus?: ServiceSubStatus;
  technicianId?: string;
  serviceAdvisorId?: string;
  appointmentDateTime?: string;
  nextServiceInfo?: NextServiceInfo;
  safetyInspection?: SafetyInspection[];
  photoReports?: any[];
  originalQuoteItems?: ServiceItem[];
  serviceAdvisorName?: string;
  serviceAdvisorSignatureDataUrl?: string;
  customerSignatureReception?: string;
  customerSignatureDelivery?: string;
  vehicleConditions?: string;
  customerItems?: string;
  fuelLevel?: string;
  customerName?: string;
  customerPhone?: string;
  mileage?: number;
  description?: string;
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

export interface InventoryCategory {
  id: string;
  name: string;
}

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

export interface SaleReceipt {
  id: string;
  items: InventoryItem[];
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  status?: string;
  saleDate?: string;
  totalAmount?: number;
  payments?: Payment[];
  customerName?: string;
  registeredByName?: string;
  registeredById?: string;
  subTotal?: number;
  tax?: number;
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
  role: AppRole;
  isArchived?: boolean;
  monthlySalary?: number;
  commissionRate?: number;
  phone?: string;
  functions?: string[];
  hireDate?: string;
  signatureDataUrl?: string;
  email?: string;
}

export interface AppRole {
  id: string;
  name: string;
  permissions: string[];
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
  type: "in" | "out";
  amount: number;
  reason: string;
  timestamp: string;
  userName?: string;
  concept?: string;
  paymentMethod?: PaymentMethod;
  relatedType?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  note?: string;
  method?: PaymentMethod;
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
  insumos?: any[];
  servicios?: any[];
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
  icon?: ReactNode;
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

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  suppliesUsed?: any[];
}

export type SafetyCheckValue = "ok" | "atencion" | "inmediata" | "na";

export interface SafetyInspection {
  id: string;
  name: string;
  value: SafetyCheckValue;
  status?: string;
}

export type SafetyCheckStatus = "ok" | "pending" | "critical";

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

export type TicketType = ServiceRecord | SaleReceipt;

export interface SimplifiedSale {
  totalAmount: number;
}

export interface LegacySale {}
