
// src/lib/services/export.service.ts
import { toast } from '@/hooks/use-toast';

interface ExportToCsvOptions {
  data: any[];
  headers: { key: string; label: string }[];
  fileName: string;
}

const getNestedValue = (obj: any, path: string): string => {
  const value = path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : '', obj);

  if (value instanceof Date) {
    return value.toLocaleString('es-MX');
  }

  if (typeof value === 'object' && value !== null) {
    // Si es un array, lo convertimos a una lista separada por comas
    if (Array.isArray(value)) {
        const itemDescriptions = value.map(item => {
            // Caso específico para serviceItems o suppliesUsed
            if (item.name) return item.name;
            if (item.supplyName) return item.supplyName;
            return JSON.stringify(item).replace(/"/g, '""');
        }).join('; ');
        return `"${itemDescriptions}"`;
    }
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }
  
  const stringValue = String(value ?? '');
  // Escapar comillas dobles dentro del valor
  const escapedValue = stringValue.replace(/"/g, '""');
  // Envolver el valor en comillas dobles para manejar comas y otros caracteres especiales
  return `"${escapedValue}"`;
};

export function exportToCsv({ data, headers, fileName }: ExportToCsvOptions): void {
  if (data.length === 0) {
    toast({
      title: "No hay datos para exportar",
      description: "Por favor, ajusta los filtros o asegúrate de que haya datos disponibles.",
      variant: "destructive",
    });
    return;
  }

  const headerLabels = headers.map(h => h.label).join(',');
  const csvRows = [headerLabels];

  data.forEach(item => {
    const row = headers.map(header => getNestedValue(item, header.key)).join(',');
    csvRows.push(row);
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "Exportación Exitosa",
    description: `${data.length} registros han sido exportados.`,
  });
}
