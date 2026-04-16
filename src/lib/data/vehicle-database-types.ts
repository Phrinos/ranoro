// src/lib/data/vehicle-database-types.ts
// Este archivo fue deprecado en favor de `VehicleGroup` para las reglas de precios.
// Solo mantenemos los tipos básicos necesarios si es que alguna vista pública antigua los usa.

export interface VehicleModel {
    name: string;
    generations: any[];
}

export interface VehicleMake {
    make: string;
    models: VehicleModel[];
}
export interface EngineData { name: string; [key: string]: any; }
