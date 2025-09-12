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
};

export type ServiceTypeRecord = {
  id: string;
  name: string;
  description?: string;
  estimatedHours: number;
};

export type InventoryCategory = {
  id: string;
  name: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type Paperwork = {
  id: string;
  name: string;
  dueDate: string;
};

export type Fine = {
  id: string;
  date: string;
  type: string;
  amount: number;
};

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
  licensePlate: string;
  vin?: string;
  color?: string;
  ownerName?: string;
  ownerPhone?: string;
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

export type ServiceRecord = {
  id: string;
  vehicleId: string;
  serviceDate: Date | string;
  status: 'Agendado' | 'En Taller' | 'Entregado' | 'Cancelado' | 'Cotizacion';
  serviceItems: {
    itemId: string;
    itemName: string;
    quantity: number;
    total: number;
  }[];
  customerSignatureDataUrl?: string;
  serviceAdvisorSignatureDataUrl?: string;
  description?: string;
  mechanicId?: string;
  mechanicName?: string;
  serviceAdvisorId?: string;
  serviceAdvisorName?: string;
  totalCost?: number;
  vehicleIdentifier?: string;
  deliveryDateTime?: string;
  serviceProfit?: number;
  receptionDateTime?: string;
  appointmentDateTime?: string;
};

export type SaleReceipt = {
  id: string;
  saleDate: Date;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    total: number;
  }[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status?: 'Completado' | 'Cancelado';
  profit?: number;
};

export type MonthlyFixedExpense = {
  id: string;
  name: string;
  amount: number;
  category: string;
};

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

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Tarjeta MSI';
export type ServiceSubStatus = 'Ingresado' | 'En Espera de Refacciones' | 'Reparando' | 'Completado' | 'Confirmada' | 'Cancelada';
export type NavigationEntry = { label: string; path: string; icon: React.ElementType; groupTag: string; isActive: boolean; permissions?: string[] };
export type Permission = { id: string; name: string; description: string; };

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
