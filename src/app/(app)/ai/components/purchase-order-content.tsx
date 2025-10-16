'use client';

import type { PurchaseRecommendationOutput } from '@/ai/flows/purchase-recommendation-flow';
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from "next/image";

interface PurchaseOrderContentProps {
  recommendations: PurchaseRecommendationOutput['recommendations'];
}

const initialWorkshopInfo: Partial<any> = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};


export const PurchaseOrderContent = React.forwardRef<HTMLDivElement, PurchaseOrderContentProps>(
  ({ recommendations }, ref) => {
    const [workshopInfo, setWorkshopInfo] = useState<Partial<any>>(initialWorkshopInfo);

    useEffect(() => {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) {
            try {
                setWorkshopInfo({ ...initialWorkshopInfo, ...JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse workshop info", e);
            }
        }
    }, []);

    const now = new Date();
    const formattedDate = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });

    return (
      <div 
        ref={ref}
        className="font-sans bg-white text-black text-sm p-8"
      >
        <header className="mb-8 border-b-2 border-black pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {workshopInfo?.logoUrl && (
              <div className="relative w-[150px] h-[50px]">
                <Image 
                    src={workshopInfo.logoUrl} 
                    alt={`${workshopInfo.name} Logo`} 
                    fill
                    style={{ objectFit: 'contain' }}
                    data-ai-hint="workshop logo"
                    sizes="150px"
                    crossOrigin="anonymous"
                />
              </div>
            )}
             <div className="text-left sm:text-right">
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
