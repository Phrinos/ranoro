
'use client';

import type { PurchaseRecommendation } from '@/types';
import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchaseOrderContentProps {
  recommendations: PurchaseRecommendation[];
  workshopName: string;
}

export const PurchaseOrderContent = React.forwardRef<HTMLDivElement, PurchaseOrderContentProps>(
  ({ recommendations, workshopName }, ref) => {
    const now = new Date();
    const formattedDate = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });

    return (
      <div 
        ref={ref}
        data-format="letter"
        className="font-sans bg-white text-black shadow-lg mx-auto p-8 text-sm"
      >
        <header className="mb-8 border-b border-gray-300 pb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary">{workshopName}</h1>
            <div className="text-right">
              <h2 className="text-2xl font-semibold">Orden de Compra</h2>
              <p className="text-xs text-gray-500">Generada el: {formattedDate}</p>
            </div>
          </div>
        </header>

        <main>
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className="mb-6 break-inside-avoid">
                <h3 className="font-bold text-lg border-b-2 border-primary mb-2 pb-1">
                  Proveedor: {rec.supplier}
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="py-2 px-3 font-semibold text-gray-600 w-1/4">Cantidad</th>
                      <th className="py-2 px-3 font-semibold text-gray-600 w-2/4">Artículo</th>
                      <th className="py-2 px-3 font-semibold text-gray-600 w-1/4">Para Servicio (ID)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-b border-gray-200">
                        <td className="py-2 px-3">{item.quantity}</td>
                        <td className="py-2 px-3">{item.itemName}</td>
                        <td className="py-2 px-3 font-mono">{item.serviceId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No se encontraron artículos para comprar en este momento.</p>
          )}
        </main>

        <footer className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>Esta es una lista de compra sugerida. Verifique los artículos antes de realizar el pedido.</p>
        </footer>
      </div>
    );
  }
);

PurchaseOrderContent.displayName = "PurchaseOrderContent";
