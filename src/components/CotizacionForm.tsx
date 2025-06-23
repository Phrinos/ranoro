"use client";

import { useState } from "react";
import { v4 as uuid } from "uuid";
import { saveQuote } from "@/services/quotes";
import { useToast } from "@/hooks/use-toast";

export default function CotizacionForm() {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [totalAmount, setTotalAmount]   = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Escribe el nombre del cliente");
      return;
    }

    const quote = {
      id: `COT${uuid().slice(0, 6)}`,
      customerName,
      totalAmount: Number(totalAmount),
      saleDate: new Date().toISOString(),
      status: "Pendiente",
    };

    try {
      await saveQuote(quote);                    // 👈 habla con Firestore
      toast({ title: "Guardado", description: `Folio: ${quote.id}` });
      setCustomerName("");
      setTotalAmount("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error al guardar",
        description: "Revisa tu conexión o las reglas.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-4">
      <div>
        <label className="block mb-1">Nombre del cliente</label>
        <input
          className="w-full border p-2 rounded"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-1">Total (MXN)</label>
        <input
          className="w-full border p-2 rounded"
          type="number"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          required
        />
      </div>

      <button className="bg-primary text-white px-4 py-2 rounded w-full">
        Guardar cotización
      </button>
    </form>
  );
}
