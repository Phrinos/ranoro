// src/lib/data/vehicle-data-check.ts
import type { EngineData } from './vehicle-database-types';

/**
 * Checks if all essential fields in an EngineData object are filled.
 * @param engine The engine data to check.
 * @returns `true` if all critical fields have valid values, `false` otherwise.
 */
export function isEngineDataComplete(engine: EngineData): boolean {
  if (!engine) return false;

  const { insumos, servicios } = engine;

  // Check critical fields. Adjust these checks based on what you consider "complete".
  const hasAceite = insumos?.aceite?.grado && insumos.aceite.litros && insumos.aceite.costoUnitario;
  const hasFiltroAceite = insumos?.filtroAceite?.sku && insumos.filtroAceite.costoUnitario;
  const hasFiltroAire = insumos?.filtroAire?.sku && insumos.filtroAire.costoUnitario;
  const hasBujias = insumos?.bujias?.cantidad && insumos.bujias.modelos?.cobre && insumos.bujias.costoUnitario?.cobre;
  
  // Check at least one brake set is defined
  const hasBalatas = 
    (insumos?.balatas?.delanteras?.length > 0 && insumos.balatas.delanteras.every(b => b.modelo && b.costoJuego)) ||
    (insumos?.balatas?.traseras?.length > 0 && insumos.balatas.traseras.every(b => b.modelo && b.costoJuego));
    
  const hasServicios = 
    servicios?.afinacionIntegral?.precioPublico && 
    servicios?.cambioAceite?.precioPublico &&
    servicios?.balatasDelanteras?.precioPublico;

  return !!(hasAceite && hasFiltroAceite && hasFiltroAire && hasBujias && hasBalatas && hasServicios);
}
