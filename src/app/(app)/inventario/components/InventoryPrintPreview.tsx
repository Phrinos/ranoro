
// src/app/(app)/inventario/components/InventoryPrintPreview.tsx
"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import type { InventoryItem } from "@/types";

// ─── Formatter ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n ?? 0);

// ─── Standalone HTML generator for printing ──────────────────────────────────
// Opens in a new window — 100% independent from the app, no Tailwind, no portals.

function buildPrintHTML(items: InventoryItem[], origin: string): string {
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });

  const grouped: Record<string, InventoryItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || "Sin Categoría";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, "es"));

  const totalCost = items
    .filter((i) => !i.isService)
    .reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0);

  const categorySections = sortedGroups
    .map(([category, catItems]) => {
      const rows = catItems
        .map((item, idx) => {
          const qty = item.quantity ?? 0;
          const bg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
          const stockColor = item.isService ? "#7c3aed" : qty === 0 ? "#dc2626" : "#111827";
          const valuation = item.isService ? "—" : fmt(qty * (item.unitPrice ?? 0));

          return `<tr style="background:${bg};">
            <td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:8pt;word-break:break-word;background:${bg};">${item.name}</td>
            <td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:8pt;color:#6b7280;background:${bg};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.sku || item.brand || "—"}</td>
            <td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:8pt;text-align:center;font-weight:700;color:${stockColor};background:${bg};">${item.isService ? "Serv." : qty}</td>
            <td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:8pt;text-align:right;background:${bg};">${fmt(item.unitPrice ?? 0)}</td>
            <td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:8pt;text-align:right;color:#059669;font-weight:600;background:${bg};">${fmt(item.sellingPrice ?? 0)}</td>
            <td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:8pt;text-align:right;font-weight:700;background:${bg};">${valuation}</td>
          </tr>`;
        })
        .join("");

      return `
        <div style="margin-bottom:20px;page-break-inside:auto;">
          <div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#111827;border-bottom:2px solid #111827;padding-bottom:3px;margin-bottom:6px;">${category}</div>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <colgroup>
              <col style="width:28%"><col style="width:13%"><col style="width:9%">
              <col style="width:16%"><col style="width:16%"><col style="width:18%">
            </colgroup>
            <thead>
              <tr style="background:#1f2937;">
                <th style="padding:5px 7px;text-align:left;font-size:7.5pt;color:#fff;font-weight:700;background:#1f2937;">Nombre del Artículo</th>
                <th style="padding:5px 7px;text-align:left;font-size:7.5pt;color:#fff;font-weight:700;background:#1f2937;">SKU / Marca</th>
                <th style="padding:5px 7px;text-align:center;font-size:7.5pt;color:#fff;font-weight:700;background:#1f2937;">Stock</th>
                <th style="padding:5px 7px;text-align:right;font-size:7.5pt;color:#fff;font-weight:700;background:#1f2937;">Costo Unit.</th>
                <th style="padding:5px 7px;text-align:right;font-size:7.5pt;color:#fff;font-weight:700;background:#1f2937;">Precio Venta</th>
                <th style="padding:5px 7px;text-align:right;font-size:7.5pt;color:#fff;font-weight:700;background:#1f2937;">Valuación (Costo)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Inventario Ranoro — ${format(new Date(), "yyyy-MM-dd")}</title>
  <style>
    @page { size: letter portrait; margin: 14mm 15mm 20mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #111827;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body style="padding:0;margin:0;">
  <!-- Header -->
  <table style="width:100%;margin-bottom:18px;border-bottom:2px solid #d1d5db;padding-bottom:12px;">
    <tr>
      <td style="vertical-align:top;">
        <div style="font-size:18pt;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;color:#111827;">Reporte de Inventario</div>
        <div style="font-size:8pt;color:#6b7280;margin-top:4px;">Generado el ${dateStr}</div>
        <div style="font-size:8pt;color:#6b7280;margin-top:2px;">
          ${items.length} registros · ${sortedGroups.length} categorías ·
          <span style="color:#059669;font-weight:700;">Valor total: ${fmt(totalCost)}</span>
        </div>
      </td>
      <td style="vertical-align:top;text-align:right;width:120px;">
        <img src="${origin}/ranoro-logo.png" alt="Ranoro" style="height:44px;width:auto;object-fit:contain;" onerror="this.style.display='none'">
      </td>
    </tr>
  </table>

  <!-- Category sections -->
  ${categorySections}

  <!-- Footer -->
  <div style="margin-top:20px;padding-top:8px;border-top:1px solid #d1d5db;font-size:6.5pt;color:#9ca3af;text-align:center;">
    Reporte interno confidencial · Prohibida su distribución no autorizada · Ranoro © ${new Date().getFullYear()}
  </div>
</body>
</html>`;
}

// ─── Preview content (modal only — for display) ───────────────────────────────

function PreviewContent({ items }: { items: InventoryItem[] }) {
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });

  const grouped = useMemo(() => {
    const g: Record<string, InventoryItem[]> = {};
    items.forEach((item) => {
      const cat = item.category || "Sin Categoría";
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [items]);

  const totalCost = items
    .filter((i) => !i.isService)
    .reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9pt", color: "#111827", padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #d1d5db", paddingBottom: "12px", marginBottom: "18px" }}>
        <div>
          <div style={{ fontSize: "16pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>Reporte de Inventario</div>
          <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "4px" }}>Generado el {dateStr}</div>
          <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "2px" }}>
            {items.length} registros · {grouped.length} categorías ·{" "}
            <span style={{ color: "#059669", fontWeight: 700 }}>Valor total: {fmt(totalCost)}</span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ranoro-logo.png" alt="Ranoro" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
      </div>

      {/* Categories */}
      {grouped.map(([category, catItems]) => (
        <div key={category} style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "9pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #111827", paddingBottom: "3px", marginBottom: "5px" }}>
            {category}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "28%" }} /><col style={{ width: "13%" }} /><col style={{ width: "9%" }} />
              <col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#1f2937" }}>
                {[["Nombre del Artículo", "left"], ["SKU / Marca", "left"], ["Stock", "center"], ["Costo Unit.", "right"], ["P. Venta", "right"], ["Valuación", "right"]].map(([l, a]) => (
                  <th key={l} style={{ padding: "5px 7px", textAlign: a as any, fontSize: "7.5pt", color: "#fff", fontWeight: 700 }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catItems.map((item, idx) => {
                const qty = item.quantity ?? 0;
                const bg = idx % 2 === 0 ? "#fff" : "#f9fafb";
                const stockColor = item.isService ? "#7c3aed" : qty === 0 ? "#dc2626" : "#111827";
                return (
                  <tr key={item.id} style={{ background: bg }}>
                    <td style={{ padding: "3px 7px", borderBottom: "1px solid #e5e7eb", fontSize: "7.5pt", wordBreak: "break-word" }}>{item.name}</td>
                    <td style={{ padding: "3px 7px", borderBottom: "1px solid #e5e7eb", fontSize: "7.5pt", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sku || item.brand || "—"}</td>
                    <td style={{ padding: "3px 7px", borderBottom: "1px solid #e5e7eb", fontSize: "7.5pt", textAlign: "center", fontWeight: 700, color: stockColor }}>{item.isService ? "Serv." : qty}</td>
                    <td style={{ padding: "3px 7px", borderBottom: "1px solid #e5e7eb", fontSize: "7.5pt", textAlign: "right" }}>{fmt(item.unitPrice ?? 0)}</td>
                    <td style={{ padding: "3px 7px", borderBottom: "1px solid #e5e7eb", fontSize: "7.5pt", textAlign: "right", color: "#059669", fontWeight: 600 }}>{fmt(item.sellingPrice ?? 0)}</td>
                    <td style={{ padding: "3px 7px", borderBottom: "1px solid #e5e7eb", fontSize: "7.5pt", textAlign: "right", fontWeight: 700 }}>{item.isService ? "—" : fmt(qty * (item.unitPrice ?? 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ marginTop: "16px", paddingTop: "6px", borderTop: "1px solid #d1d5db", fontSize: "6.5pt", color: "#9ca3af", textAlign: "center" }}>
        Reporte interno confidencial · Ranoro © {new Date().getFullYear()}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface InventoryPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

export function InventoryPrintPreview({ open, onOpenChange, items }: InventoryPrintPreviewProps) {

  const handlePrint = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const html = buildPrintHTML(items, origin);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        // Remove iframe after print dialog closes
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 p-0"
        style={{ maxWidth: "680px", height: "92vh" }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Vista Previa — Reporte de Inventario</DialogTitle>
          <DialogDescription>
            {items.length} producto{items.length !== 1 ? "s" : ""} ·{" "}
            {[...new Set(items.map((i) => i.category || "Sin Categoría"))].length} categorías ·
            Desplázate para ver el reporte completo
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable preview — gray background simulating print environment */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: "#525659", padding: "24px 20px" }}
        >
          {/* White letter-proportioned page with shadow */}
          <div
            style={{
              background: "#fff",
              maxWidth: "612px",
              margin: "0 auto",
              boxShadow: "0 4px 32px rgba(0,0,0,0.45)",
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            <PreviewContent items={items} />
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cerrar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
