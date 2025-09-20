
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";

// Definimos la estructura de un documento de compra
interface Purchase {
  id: string;
  supplierName: string;
  date: Timestamp;
  totalAmount: number;
  status: "completado" | "pendiente";
}

export function PurchasesTable() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState('date_desc');

  useEffect(() => {
    // Creamos una consulta a la colección 'purchases', ordenando por fecha descendente
    const q = query(collection(db, "purchases"), orderBy("date", "desc"));

    // onSnapshot establece un listener en tiempo real
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const purchasesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Purchase));
        setPurchases(purchasesData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error al obtener las compras: ", error);
        setIsLoading(false);
      }
    );

    // Devolvemos la función de limpieza para cancelar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, []);
  
  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader sortKey="supplierName" label="Proveedor" onSort={handleSort} currentSort={sortOption} />
              <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={sortOption} />
              <SortableTableHeader sortKey="status" label="Estado" onSort={handleSort} currentSort={sortOption} />
              <SortableTableHeader sortKey="totalAmount" label="Monto Total" onSort={handleSort} currentSort={sortOption} className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Esqueleto de carga para simular la espera de datos */}
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHeader sortKey="supplierName" label="Proveedor" onSort={handleSort} currentSort={sortOption} />
            <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={sortOption} />
            <SortableTableHeader sortKey="status" label="Estado" onSort={handleSort} currentSort={sortOption} />
            <SortableTableHeader sortKey="totalAmount" label="Monto Total" onSort={handleSort} currentSort={sortOption} className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.length > 0 ? (
            purchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                <TableCell>
                  {format(purchase.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant={purchase.status === "completado" ? "default" : "secondary"}>
                    {purchase.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  ${purchase.totalAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No hay compras registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
