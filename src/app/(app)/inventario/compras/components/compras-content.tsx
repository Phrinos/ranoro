
"use client";

import React from 'react';
import { PurchasesTable } from "./purchases-table";

const ComprasContent = () => {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Historial de Compras</h2>
      <PurchasesTable />
    </section>
  );
};

export default ComprasContent;
