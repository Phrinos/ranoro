import { format } from "date-fns";
import { es } from "date-fns/locale";

export const toDate = (d?: Date | string | null) => {
  if (!d) return null;
  if (d instanceof Date) return d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateLong = (d?: Date | string | null) => {
  const date = toDate(d);
  return date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: es }) : "";
};

export const formatMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);