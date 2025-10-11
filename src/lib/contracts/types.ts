export type Party = {
  companyName?: string;  // para Arrendador (opcional si es persona física)
  name: string;
  rfc?: string;
  address: string;
  phone?: string;
  representativeName?: string;
  representativeTitle?: string; // p.ej. "Representante Legal / Administrador Único"
};

export type VehicleForContract = {
  make: string;
  model: string;
  year: number | string;
  color?: string;
  plates: string;
  vin: string;
  engine?: string;
  mileageOut?: number | null;
  mileageIn?: number | null;
};

export type LeaseContractInput = {
  contractId?: string;               // opcional, por si quieres folio interno
  signDate: Date;                    // Fecha de firma
  startDate: Date;                   // Inicio del contrato
  endDate?: Date | null;             // Fin (opcional)
  dailyRate: number;                 // Costo diario
  deposit: number;                   // Depósito en garantía
  place: string;                     // Ciudad/Estado para encabezados y pagaré (p.ej. "Aguascalientes, Aguascalientes")
  lessor: Party;                     // Arrendador
  lessee: Party;                     // Arrendatario (conductor)
  vehicle: VehicleForContract;       // Vehículo
  clausesOverride?: string[];        // (opcional) si quieres inyectar texto propio de cláusulas
};
