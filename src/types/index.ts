

export interface WorkshopInfo {
  name: string;
  nameBold?: boolean;
  headerFontSize?: number;
  phone: string;
  phoneBold?: boolean;
  addressLine1: string;
  addressLine1Bold?: boolean;
  addressLine2?: string;
  addressLine2Bold?: boolean;
  cityState: string;
  cityStateBold?: boolean;
  logoUrl: string;
  logoWidth?: number;
  bodyFontSize?: number;
  itemsFontSize?: number;
  totalsFontSize?: number;
  footerFontSize?: number;
  blankLinesTop?: number;
  blankLinesBottom?: number;
  footerLine1?: string;
  footerLine1Bold?: boolean;
  footerLine2?: string;
  footerLine2Bold?: boolean;
  fixedFooterText?: string;
  fixedFooterTextBold?: boolean;
  googleMapsUrl?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonRole?: string;
}

export interface VehiclePaperwork {
  id: string;
  name: string;
  dueDate: string; // ISO string
  status: 'Pendiente' | 'Completado';
  notes?: string;
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
  isFleetVehicle?: boolean;
  dailyRentalCost?: number;
  gpsMonthlyCost?: number;
  adminMonthlyCost?: number;
  insuranceMonthlyCost?: number;
  fineCheckHistory?: {
    date: string; // ISO String
    checkedBy: string; // User name
    checkedById: string; // User ID
  }[];
  paperwork?: VehiclePaperwork[];
  currentMileage?: number;
  lastMileageUpdate?: string; // ISO String
}

export interface ManualDebtEntry {
  id: string;
  date: string; // ISO String
  amount: number;
  note: string;
}


export interface Driver {
  id: string;
  name: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  assignedVehicleId?: string;
  documents?: {
    ineUrl?: string;
    licenseUrl?: string;
    proofOfAddressUrl?: string;
    promissoryNoteUrl?: string;
  };
  depositAmount?: number;
  contractDate?: string; // ISO string
  manualDebts?: ManualDebtEntry[];
}

export interface RentalPayment {
  id: string;
  driverId: string;
  driverName: string;
  vehicleLicensePlate: string;
  paymentDate: string; // ISO String
  amount: number;
  daysCovered: number;
  note?: string;
}

export interface OwnerWithdrawal {
  id: string;
  ownerName: string;
  date: string; // ISO String
  amount: number;
  reason?: string;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  vehicleLicensePlate: string;
  date: string; // ISO String
  amount: number;
  description: string;
}


export interface ServiceSupply {
  supplyId: string; 
  supplyName: string; 
  quantity: number;
  unitPrice: number; // Costo para el taller
  sellingPrice?: number; // Precio de venta al cliente (opcional)
  unitType?: 'units' | 'ml' | 'liters';
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number; // Costo de la mano de obra
  suppliesUsed: ServiceSupply[];
}

export type SafetyCheckStatus = 'ok' | 'atencion' | 'inmediata' | 'na';

export interface SafetyCheckValue {
  status: SafetyCheckStatus;
  photos: string[];
}

export interface SafetyInspection {
  luces_altas_bajas_niebla?: SafetyCheckValue;
  luces_cuartos?: SafetyCheckValue;
  luces_direccionales?: SafetyCheckValue;
  luces_frenos_reversa?: SafetyCheckValue;
  luces_interiores?: SafetyCheckValue;
  fugas_refrigerante?: SafetyCheckValue;
  fugas_limpiaparabrisas?: SafetyCheckValue;
  fugas_frenos_embrague?: SafetyCheckValue;
  fugas_transmision?: SafetyCheckValue;
  fugas_direccion_hidraulica?: SafetyCheckValue;
  carroceria_cristales_espejos?: SafetyCheckValue;
  carroceria_puertas_cofre?: SafetyCheckValue;
  carroceria_asientos_tablero?: SafetyCheckValue;
  carroceria_plumas?: SafetyCheckValue;
  suspension_rotulas?: SafetyCheckValue;
  suspension_amortiguadores?: SafetyCheckValue;
  suspension_caja_direccion?: SafetyCheckValue;
  suspension_terminales?: SafetyCheckValue;
  llantas_delanteras_traseras?: SafetyCheckValue;
  llantas_refaccion?: SafetyCheckValue;
  frenos_discos_delanteros?: SafetyCheckValue;
  frenos_discos_traseros?: SafetyCheckValue;
  otros_tuberia_escape?: SafetyCheckValue;
  otros_soportes_motor?: SafetyCheckValue;
  otros_claxon?: SafetyCheckValue;
  otros_inspeccion_sdb?: SafetyCheckValue;
  inspectionNotes?: string;
  technicianSignature?: string; 
}


export interface PhotoReportGroup {
  id: string;
  date: string; // ISO string
  description: string;
  photos: string[]; // Array of data URLs or storage URLs
}

export type ServiceStatus = 'Cotizacion' | 'Agendado' | 'En Taller' | 'Entregado' | 'Cancelado';
export type ServiceSubStatus = 'En Espera de Refacciones' | 'Reparando' | 'Completado';

export interface ServiceRecord {
  id: string;
  publicId?: string; // Unique, random ID for public sharing
  vehicleId: string;
  vehicleIdentifier?: string;
  serviceDate: string; // Date of service or quote
  serviceType?: string; // Changed from enum to string
  description?: string;
  technicianId: string;
  technicianName?: string;
  serviceItems: ServiceItem[];
  subTotal: number; 
  taxAmount: number;
  totalCost: number; // Final, tax-inclusive price for services OR estimated price for quotes
  totalSuppliesCost: number; 
  serviceProfit: number; 
  status: ServiceStatus;
  subStatus?: ServiceSubStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  notes?: string;
  mileage?: number;
  receptionDateTime?: string; // Automatically set when status becomes 'En Taller'
  deliveryDateTime?: string; // Automatically set when status becomes 'Entregado'
  vehicleConditions?: string;
  fuelLevel?: string;
  customerItems?: string;
  safetyInspection?: SafetyInspection;
  serviceAdvisorId?: string;
  serviceAdvisorName?: string;
  serviceAdvisorSignatureDataUrl?: string; 
  customerSignatureReception?: string;
  customerSignatureDelivery?: string;
  receptionSignatureViewed?: boolean;
  deliverySignatureViewed?: boolean;
  workshopInfo?: WorkshopInfo;
  paymentMethod?: PaymentMethod;
  cardFolio?: string;
  transferFolio?: string;
  nextServiceInfo?: {
    date: string; // ISO String
    mileage?: number;
  };
  photoReports?: PhotoReportGroup[];
  appointmentStatus?: 'Creada' | 'Confirmada';
  quoteDate?: string;
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
  brand?: string;
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
  rendimiento?: number;
}

export interface InventoryCategory {
  id: string;
  name: string;
}

export interface ServiceTypeRecord {
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
  rfc?: string;
  taxRegime?: string;
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

// QuoteRecord is now deprecated and merged into ServiceRecord.
// A ServiceRecord with status: 'Cotizacion' is a quote.
export type QuoteRecord = ServiceRecord;


export interface DashboardMetrics {
  activeServices: number;
  technicianEarnings: number; 
  dailyRevenue: number;
  lowStockAlerts: number;
}

export interface FinancialOperation {
  id: string;
  date: string;
  type: string;
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
  notes?: string;
}

export interface CashDrawerTransaction {
  id: string;
  date: string; // ISO String
  type: 'Entrada' | 'Salida';
  amount: number;
  concept: string;
  userId: string;
  userName: string;
}

export interface InitialCashBalance {
  date: string; // ISO String for when it was set
  amount: number;
  userId: string;
  userName:string;
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

export interface VehicleMonthlyReport {
  vehicleId: string;
  vehicleInfo: string;
  daysRented: number;
  rentalIncome: number;
  maintenanceAndExpensesCost: number;
  administrationCost: number;
  totalDeductions: number;
  services?: { id: string; description?: string; totalCost: number }[];
}

export interface PublicOwnerReport {
  publicId: string;
  ownerName: string;
  generatedDate: string; // ISO String
  reportMonth: string; // e.g., "septiembre 2024"
  detailedReport: VehicleMonthlyReport[];
  totalRentalIncome: number;
  totalDeductions: number;
  totalNetBalance: number;
  workshopInfo?: WorkshopInfo;
}

export interface AggregatedInventoryItem {
  itemId: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface AuditLog {
  id: string;
  date: string; // ISO string
  userId: string;
  userName: string;
  actionType: 'Crear' | 'Editar' | 'Eliminar' | 'Cancelar' | 'Archivar' | 'Pagar' | 'Registrar' | 'Acceso' | 'Otro';
  description: string;
  entityType?: 'Usuario' | 'Rol' | 'Servicio' | 'Cotización' | 'Producto' | 'Categoría' | 'Proveedor' | 'Venta' | 'Vehículo' | 'Conductor' | 'Pago' | 'Gasto' | 'Compra';
  entityId?: string;
}

export interface CapacityAnalysisInput {
  servicesForDay: { description: string }[];
  technicians: { id: string; standardHoursPerDay: number }[];
  serviceHistory: { description: string; serviceDate?: string; deliveryDateTime?: string }[];
}

export interface CapacityAnalysisOutput {
  totalRequiredHours: number;
  totalAvailableHours: number;
  capacityPercentage: number;
  recommendation: string;
}
