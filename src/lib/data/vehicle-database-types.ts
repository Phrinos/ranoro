// src/lib/data/vehicle-database-types.ts

// --- Tipos para Insumos ---
interface Aceite {
    grado: string | null;
    litros: number | null;
    costoUnitario: number;
    lastUpdated?: string;
}
interface Filtro {
    sku: string | null;
    costoUnitario: number;
    lastUpdated?: string;
}
interface BalataInfo {
    id: string; // ID único para el array, ej: nanoid()
    modelo: string | null;
    tipo: 'metalicas' | 'semimetalicas' | 'ceramica' | 'organica' | null;
    costoJuego: number;
}
interface Balatas {
    delanteras: BalataInfo[];
    traseras: BalataInfo[];
    lastUpdated?: string;
}
interface BujiaModelos {
    cobre: string | null;
    platino: string | null;
    iridio: string | null;
}
interface BujiaCostos {
    cobre: number;
    platino: number;
    iridio: number;
}
interface Bujias {
    cantidad: number | null;
    modelos: BujiaModelos;
    costoUnitario: BujiaCostos;
    lastUpdated?: string;
}
interface Inyector {
    tipo: 'Normal' | 'Piezoelectrico' | 'GDI' | null;
}

// --- Tipos para Servicios Estandarizados ---
interface AfinacionUpgrades {
    conAceiteSintetico: number;
    conAceiteMobil: number;
    conBujiasPlatino: number;
    conBujiasIridio: number;
}

interface ServicioCosto {
    costoInsumos: number;
    precioPublico: number;
    upgrades?: Partial<AfinacionUpgrades>;
}


// --- Estructura principal ---
export interface InsumosData {
    aceite: Aceite;
    filtroAceite: Filtro;
    filtroAire: Filtro;
    balatas: Balatas;
    bujias: Bujias;
    inyector: Inyector;
}

export interface ServiciosData {
    afinacionIntegral: ServicioCosto;
    cambioAceite: ServicioCosto;
    balatasDelanteras: ServicioCosto;
    balatasTraseras: ServicioCosto;
}

export interface EngineData {
    name: string;
    insumos: InsumosData;
    servicios: ServiciosData;
}

export interface EngineGeneration {
    startYear: number;
    endYear: number;
    engines: EngineData[];
}

export interface VehicleModel {
    name: string;
    generations: EngineGeneration[];
}

export interface VehicleMake {
    make: string;
    models: VehicleModel[];
}
