// src/types/index.ts
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
  isArchived: boolean;
  hireDate?: string;
  phone?: string;
  address?: string;
  standardHoursPerDay?: number;
  signatureDataUrl?: string;
  functions?: string[];
  monthlySalary?: number;
  commissionRate?: number;
};

export type Personnel = User | Technician | AdministrativeStaff;

export interface Technician extends User {
  specialty: string;
}

export interface AdministrativeStaff extends User {
  department: string;
}

export type InventoryItem = {
  id: string;
  name: string;
  description?: string;
  category: string;
  supplier: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  lowStockThreshold: number;
  isService: boolean;
  sku?: string;
  updatedAt?: any; // Firestore Timestamp
  unitPrice: number;
  sellingPrice?: number;
  unitType?: 'units'|'ml'|'liters'|'kg'|'service';
};

export type ServiceTypeRecord = {
  id: string;
  name: string;
  description?: string;
  estimatedHours: number;
};

export type InventoryCategory = { id: string; name: string };

export type Supplier = {
  id: string;
  name: string;
  description?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  debtAmount?: number;
  rfc?: string;
  taxRegime?: string;
};

export type Paperwork = { id: string; name: string; dueDate: string };

export type Fine = { id: string; date: string; type: string; amount: number };

export type FineCheck = {
  id: string;
  checkDate: string;
  hasFines: boolean;
  fines?: Fine[];
};

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  licensePlate: string;
  vin?: string;
  color?: string;
  ownerName: string;
  ownerPhone?: string;
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

export type Driver = {
  id: string;
  name: string;
  phone: string;
  address: string;
  emergencyPhone: string;
  isArchived: boolean;
  contractDate?: string;
  depositAmount?: number;
  requiredDepositAmount?: number;
  assignedVehicleId?: string | null;
  assignedVehicleLicensePlate?: string | null;
  documents?: {
    ineFrontUrl?: string;
    ineBackUrl?: string;
    licenseUrl?: string;
    proofOfAddressUrl?: string;
    promissoryNoteUrl?: string;
  };
};

export type DailyRentalCharge = {
  id: string;
  driverId: string;
  vehicleId: string;
  date: string;
  amount: number;
  vehicleLicensePlate: string;
};

export type RentalPayment = {
  id: string;
  driverId: string;
  driverName: string;
  vehicleLicensePlate: string;
  paymentDate: string;
  amount: number;
  daysCovered: number;
  note?: string;
  registeredByName?: string;
  paymentMethod?: PaymentMethod;
};

export type OwnerWithdrawal = {
  id: string;
  ownerName: string;
  date: string;
  amount: number;
  note?: string;
};

export type VehicleExpense = {
  id: string;
  vehicleId: string;
  vehicleLicensePlate: string;
  date: string;
  amount: number;
  description: string;
};

export type ManualDebtEntry = {
  id: string;
  driverId: string;
  date: string;
  amount: number;
  note: string;
};

export type ServiceItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  total: number;
  id?: string;
  name?: string;
  price?: number;
  sellingPrice?: number;
  isService?: boolean;
  unitType?: 'units'|'ml'|'liters'|'kg'|'service';
  unitPrice?: number;
  inventoryItemId?: string;
  technicianId?: string;
  technicianCommission?: number;
  suppliesUsed?: Array<{
    quantity: number;
    supplyId: string;
    supplyName?: string;
    unitPrice?: number;
    sellingPrice?: number;
    unitType?: 'units'|'ml'|'liters'|'kg'|'service';
    isService?: boolean;
  }>;
};

export type SafetyCheckStatus = "ok" | "atencion" | "inmediata" | "na";
export type SafetyCheckValue = { status: SafetyCheckStatus; notes: string; photos: string[] };
export type SafetyInspection = Record<string, SafetyCheckValue>;

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Tarjeta MSI';
export const PAYMENT_METHODS = ['Efectivo','Tarjeta','Transferencia','Tarjeta MSI'] as const;

export type Payment = {
  method: PaymentMethod;
  amount: number;
  folio?: string;
  date?: string;
};

export type NextServiceInfo = {
  date: string | Date | null;
  mileage: number | null;
};

export type ServiceStatus = 'Cotizacion' | 'Agendado' | 'En Taller' | 'Entregado' | 'Cancelado' | 'Completado' | 'Proveedor Externo';

export type ServiceSubStatus =
  | 'Ingresado'
  | 'En Espera de Refacciones'
  | 'Reparando'
  | 'Completado'
  | 'Confirmada'
  | 'Cancelada';

export type ServiceRecord = {
  id: string;
  vehicleId: string;
  serviceDate: Date | string;
  status: ServiceStatus;
  subStatus?: string;
  serviceType?: string;
  appointmentStatus?: 'Sin Confirmar'|'Confirmada'|'Cancelada'|string;
  publicId?: string;
  folio?: string;
  customerName?: string;
  customerPhone?: string;
  vehicle?: Vehicle;
  serviceItems: ServiceItem[];
  customerSignatureDataUrl?: string;
  serviceAdvisorSignatureDataUrl?: string;
  customerSignatureReception?: string;
  customerSignatureDelivery?: string;
  cancellationReason?: string;
  description?: string;
  mechanicId?: string;
  mechanicName?: string;
  technicianId?: string;
  technicianName?: string;
  serviceAdvisorId?: string;
  serviceAdvisorName?: string;
  totalCost?: number;
  vehicleIdentifier?: string;
  deliveryDateTime?: string;
  serviceProfit?: number;
  receptionDateTime?: string;
  appointmentDateTime?: string;
  nextServiceInfo?: NextServiceInfo;
  payments?: Payment[];
  paymentMethod?: string;
  cardCommission?: number;
  serviceAdvisorCommission?: number;
  safetyInspection?: SafetyInspection;
  photoReports?: { title?: string; photos: string[] }[];
  originalQuoteItems?: ServiceItem[];
  notes?: string;
  fuelLevel?: 'Empty'|'1/4'|'1/2'|'3/4'|'Full'|string;
  vehicleConditions?: string;
  customerItems?: string;
  mileage?: number | null;
};

export type SaleReceipt = {
  id: string;
  saleDate: string | Date;
  items: { itemId: string; itemName: string; quantity: number; total: number }[];
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  payments?: Payment[];
  status?: 'Completado' | 'Cancelado';
  profit?: number;
  registeredById?: string;
  registeredByName?: string;
  cardCommission?: number;
  amountInCash?: number;
  amountInCard?: number;
  amountInTransfer?: number;
  subTotal?: number;
  tax?: number;
  customerName?: string;
  notes?: string;
};

export type MonthlyFixedExpense = { id: string; name: string; amount: number; category: string, createdAt: string };

export type CashMovement = {
  id: string;
  date: string;
  type: 'Ingreso' | 'Egreso';
  category: string;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  relatedId?: string;
};

export type NavigationEntry = { label: string; path: string; icon: React.ElementType; groupTag: string; isActive: boolean; permissions?: string[] };
export type Permission = { id: string; name: string; description: string };

export type CapacityAnalysisInput = {
  servicesForDay: { description: string }[];
  technicians: { id: string; standardHoursPerDay: number }[];
  serviceHistory: { description: string; serviceDate?: string; deliveryDateTime?: string }[];
};

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

export type InitialCashBalance = { balance: number; date: string; setByUserId: string; setByUserName: string };

export type CashDrawerTransaction = {
  id: string;
  date: string;
  type: 'Entrada' | 'Salida';
  amount: number;
  concept: string;
  userId: string;
  userName: string;
  relatedType: 'Venta' | 'Servicio' | 'Manual' | 'Flotilla';
  relatedId?: string;
};

export type VehiclePriceList = {
  make: string;
  models: {
    name: string;
    generations: { startYear: number; endYear: number; engines: EngineData[] }[];
  }[];
};

export type PricedService = {
  costoInsumos?: number;
  precioPublico?: number;
  upgrades?: { [key: string]: number };
};

export type Area = string;
export type PayableAccount = { 
  id: string; 
  supplierId: string; 
  totalAmount: number; 
  paidAmount: number; 
  status: 'Pendiente'|'Pagado Parcialmente'|'Pagado'|string; 
  invoiceId?: string; 
  invoiceDate: string; 
  dueDate: string; 
  supplierName?: string; 
};
export type AuditLogAction = "Crear" | "Editar" | "Eliminar" | "Archivar" | "Restaurar" | "Registrar" | "Pagar" | "Cancelar" | 'create' | 'update' | 'delete' | 'login' | 'export';
export type AuditLogEntity = "user" | "vehicle" | "inventory" | "service" | "sale" | "role" | "purchase" | "payment";
export type AuditLog = {
  id: string;
  date: string;
  action: AuditLogAction;
  description: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  createdAt?: any; // Timestamp/FieldValue
};

export type QuoteRecord = { id: string; items: ServiceItem[]; total?: number };

export type OilInfo = { grado?: string | null; litros?: number | null; costoUnitario?: number; lastUpdated?: string };
export type EngineSupply = { sku?: string | null; costoUnitario?: number; lastUpdated?: string };

export type EngineData = {
  name: string;
  insumos: {
    aceite: OilInfo;
    filtroAceite?: EngineSupply;
    filtroAire?: EngineSupply;
    filtroGasolina?: EngineSupply;
    bujia?: EngineSupply;
    refrigerante?: { litros?: number; costoUnitario?: number; lastUpdated?: string };
    frenos?: { costoUnitario?: number; lastUpdated?: string };
    inyector?: { costoUnitario?: number; lastUpdated?: string };
    [k: string]: any;
  };
  servicios: Record<string, PricedService>;
};
