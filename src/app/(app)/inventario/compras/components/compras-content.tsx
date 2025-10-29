
"use client";

import React from 'react';
import { PurchasesTable } from "./purchases-table";
import type { SaleReceipt } from '@/types'; // Use SaleReceipt for type consistency

interface ComprasContentProps {
  purchases: SaleReceipt[]; // Accept purchases as a prop
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
