
// src/app/(app)/inventario/components/inventory-report-content.tsx
"use client";

import React, { useMemo } from 'react';
import type { InventoryItem } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// Generates a standalone HTML string for letter-size printing.
// Opens in a new window — completely independent from the app CSS.
// ─────────────────────────────────────────────────────────────────────────────
export function generateInventoryPrintHTML(items: InventoryItem[]): string {
  const date = new Date();
  const dateStr = format(date, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });

  // Group by category, sorted
  const grouped: Record<string, InventoryItem[]> = {};
  items.forEach(item => {
    const cat = item.category || 'Sin Categoría';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const sortedCategories = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'es'));

  const totalCost = items
    .filter(i => !i.isService)
    .reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0);

  const categoryHTML = sortedCategories.map(([category, catItems]) => {
    const rows = catItems.map((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
      const valuation = item.isService ? '—' : fmt((item.quantity ?? 0) * (item.unitPrice ?? 0));
      return `
        <tr style="background:${bg}; page-break-inside:avoid;">
          <td style="padding:5px 8px; border-bottom:1px solid #e5e7eb; font-size:8pt; color:#1f2937; max-width:160px; word-break:break-word;">${item.name}</td>
          <td style="padding:5px 8px; border-bottom:1px solid #e5e7eb; font-size:8pt; color:#6b7280;">${item.sku || item.brand || '—'}</td>
          <td style="padding:5px 8px; border-bottom:1px solid #e5e7eb; font-size:8pt; text-align:center; font-weight:700; color:${item.isService ? '#7c3aed' : ((item.quantity ?? 0) === 0 ? '#dc2626' : '#111827')};">
            ${item.isService ? 'Serv.' : (item.quantity ?? 0)}
          </td>
          <td style="padding:5px 8px; border-bottom:1px solid #e5e7eb; font-size:8pt; text-align:right; color:#374151;">${fmt(item.unitPrice ?? 0)}</td>
          <td style="padding:5px 8px; border-bottom:1px solid #e5e7eb; font-size:8pt; text-align:right; color:#059669; font-weight:600;">${fmt(item.sellingPrice ?? 0)}</td>
          <td style="padding:5px 8px; border-bottom:1px solid #e5e7eb; font-size:8pt; text-align:right; font-weight:700; color:#111827;">${valuation}</td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:24px; page-break-inside:avoid;">
        <h2 style="font-size:11pt; font-weight:700; color:#111827; border-bottom:2px solid #111827; padding-bottom:4px; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.03em;">${category}</h2>
        <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
          <colgroup>
            <col style="width:28%">
            <col style="width:14%">
            <col style="width:8%">
            <col style="width:15%">
            <col style="width:15%">
            <col style="width:20%">
          </colgroup>
          <thead>
            <tr style="background:#1f2937;">
              <th style="padding:6px 8px; text-align:left; font-size:7.5pt; color:#fff; font-weight:600;">Nombre del Artículo</th>
              <th style="padding:6px 8px; text-align:left; font-size:7.5pt; color:#fff; font-weight:600;">SKU / Marca</th>
              <th style="padding:6px 8px; text-align:center; font-size:7.5pt; color:#fff; font-weight:600;">Stock</th>
              <th style="padding:6px 8px; text-align:right; font-size:7.5pt; color:#fff; font-weight:600;">Costo Unit.</th>
              <th style="padding:6px 8px; text-align:right; font-size:7.5pt; color:#fff; font-weight:600;">P. Venta</th>
              <th style="padding:6px 8px; text-align:right; font-size:7.5pt; color:#fff; font-weight:600;">Valuación (Costo)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Inventario — Ranoro</title>
  <style>
    @page {
      size: letter;
      margin: 15mm 15mm 20mm 15mm;
    }
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
<body>
  <!-- Header -->
  <table style="width:100%; margin-bottom:20px; border-bottom:2px solid #d1d5db; padding-bottom:12px;">
    <tr>
      <td style="vertical-align:middle;">
        <div style="font-size:22pt; font-weight:800; color:#111827; text-transform:uppercase; letter-spacing:0.02em;">Reporte de Inventario</div>
        <div style="font-size:8.5pt; color:#6b7280; margin-top:4px;">Generado el ${dateStr}</div>
        <div style="font-size:8.5pt; color:#6b7280; margin-top:2px;">${items.length} registros en ${sortedCategories.length} categorías &nbsp;|&nbsp; Valor total del inventario: <strong style="color:#059669;">${fmt(totalCost)}</strong></div>
      </td>
      <td style="vertical-align:middle; text-align:right; width:120px;">
        <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/ranoro-logo.png" alt="Ranoro" style="height:48px; width:auto; object-fit:contain;" onerror="this.style.display='none'">
      </td>
    </tr>
  </table>

  <!-- Categories -->
  ${categoryHTML}

  <!-- Footer -->
  <div style="margin-top:24px; padding-top:8px; border-top:1px solid #d1d5db; font-size:7pt; color:#9ca3af; text-align:center;">
    Reporte interno confidencial · Prohibida su distribución no autorizada · Ranoro © ${new Date().getFullYear()}
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// React component for the PREVIEW inside the dialog.
// Simple, clean table — no Tailwind quirks, plain inline styles.
// ─────────────────────────────────────────────────────────────────────────────
interface InventoryReportContentProps {
  items: InventoryItem[];
}

const InventoryReportContent = React.forwardRef<HTMLDivElement, InventoryReportContentProps>(
  ({ items }, ref) => {
    const date = new Date();
    const dateStr = format(date, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });

    const grouped = useMemo(() => {
      const g: Record<string, InventoryItem[]> = {};
      items.forEach(item => {
        const cat = item.category || 'Sin Categoría';
        if (!g[cat]) g[cat] = [];
        g[cat].push(item);
      });
      return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, 'es'));
    }, [items]);

    const totalCost = useMemo(() =>
      items.filter(i => !i.isService).reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0),
    [items]);

    return (
      <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', color: '#111827', fontSize: '9pt', background: '#fff', padding: '8px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #d1d5db', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '18pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Reporte de Inventario</div>
            <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '4px' }}>Generado el {dateStr}</div>
            <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '2px' }}>
              {items.length} registros · {grouped.length} categorías · Valor: <strong style={{ color: '#059669' }}>{fmt(totalCost)}</strong>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ranoro-logo.png" alt="Ranoro" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Categories */}
        {grouped.map(([category, catItems]) => (
          <div key={category} style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10pt', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #111827', paddingBottom: '3px', marginBottom: '6px', letterSpacing: '0.03em' }}>
              {category}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#1f2937' }}>
                  {['Nombre del Artículo', 'SKU / Marca', 'Stock', 'Costo Unit.', 'P. Venta', 'Valuación (Costo)'].map((h, i) => (
                    <th key={i} style={{ padding: '5px 8px', color: '#fff', fontWeight: 600, fontSize: '7.5pt', textAlign: i >= 2 ? (i === 2 ? 'center' : 'right') as any : 'left' as any }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catItems.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '8pt', wordBreak: 'break-word' }}>{item.name}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '8pt', color: '#6b7280' }}>{item.sku || item.brand || '—'}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '8pt', textAlign: 'center', fontWeight: 700, color: item.isService ? '#7c3aed' : ((item.quantity ?? 0) === 0 ? '#dc2626' : '#111827') }}>
                      {item.isService ? 'Serv.' : (item.quantity ?? 0)}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '8pt', textAlign: 'right' }}>{fmt(item.unitPrice ?? 0)}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '8pt', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt(item.sellingPrice ?? 0)}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '8pt', textAlign: 'right', fontWeight: 700 }}>
                      {item.isService ? '—' : fmt((item.quantity ?? 0) * (item.unitPrice ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ marginTop: '20px', paddingTop: '8px', borderTop: '1px solid #d1d5db', fontSize: '7pt', color: '#9ca3af', textAlign: 'center' }}>
          Reporte interno confidencial · Prohibida su distribución no autorizada · Ranoro © {new Date().getFullYear()}
        </div>
      </div>
    );
  }
);

InventoryReportContent.displayName = 'InventoryReportContent';
export default InventoryReportContent;
