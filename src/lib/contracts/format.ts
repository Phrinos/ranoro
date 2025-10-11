import { format } from "date-fns";
import { es } from "date-fns/locale";

export const formatDateLong = (d?: Date | null) =>
  d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: es }) : "";

export const formatMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
