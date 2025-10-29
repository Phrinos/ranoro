
// src/app/(app)/inventario/compras/components/compras-content.tsx
"use client";

import React from 'react';
import { PurchasesTable, type Purchase } from "./purchases-table";

interface ComprasContentProps {
  purchases: Purchase[]; // Accept purchases as a prop
}

const ComprasContent = ({ purchases }: ComprasContentProps) => {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Historial de Compras</h2>
      <PurchasesTable purchases={purchases} />
    </section>
  );
};

export default ComprasContent;
