
/**
 * @fileOverview Single source of truth for SAT (Mexican Tax Authority) catalogs.
 * This file centralizes tax regimes and validation logic to ensure consistency
 * between the frontend and backend.
 */

// --- Official SAT Tax Regimes (Catálogos del SAT) ---

export const taxRegimeLabels: Record<string, string> = {
    "601": "601 - General de Ley Personas Morales",
    "603": "603 - Personas Morales con Fines no Lucrativos",
    "605": "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
    "606": "606 - Arrendamiento",
    "607": "607 - Enajenación o Adquisición de Bienes",
    "608": "608 - Demás Ingresos",
    "610": "610 - Residentes en el Extranjero sin Establecimiento Permanente en México",
    "611": "611 - Ingresos por Dividendos (socios y accionistas)",
    "612": "612 - Personas Físicas con Actividades Empresariales y Profesionales",
    "614": "614 - Ingresos por Intereses",
    "615": "615 - Ingresos por Obtención de Premios",
    "616": "616 - Sin Obligaciones Fiscales",
    "620": "620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos",
    "621": "621 - Incorporación Fiscal",
    "622": "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
    "623": "623 - Opcional para Grupos de Sociedades",
    "624": "624 - Coordinados",
    "625": "625 - Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas",
    "626": "626 - Régimen Simplificado de Confianza (RESICO)",
    "628": "628 - Hidrocarburos",
    "630": "630 - Enajenación de acciones en bolsa de valores"
};

// Complete list for Individuals (Personas Físicas)
export const regimesFisica = [
  "605", "606", "607", "608", "610", "611", "612", "614", "615", "616", "621", "625", "626", "630"
];

// Complete list for Companies (Personas Morales)
export const regimesMoral = [
  "601", "603", "610", "620", "622", "623", "624", "628", "630"
];


// --- RFC Validation Logic ---

/**
 * Detects the taxpayer type based on the RFC structure using official SAT regex.
 * @param rfc The RFC string to validate.
 * @returns 'fisica' for individuals, 'moral' for corporations, or 'invalido' if the format is incorrect.
 */
export function detectarTipoPersona(rfc: string): 'fisica' | 'moral' | 'invalido' {
  const personaFisicaRegex = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/i;
  const personaMoralRegex = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/i;

  if (personaFisicaRegex.test(rfc)) return 'fisica';
  if (personaMoralRegex.test(rfc)) return 'moral';
  return 'invalido';
}
