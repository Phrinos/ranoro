// src/app/(app)/punto-de-venta/hooks/use-pos-data.ts
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebaseClient";
import {
  collection, onSnapshot, orderBy, query, Timestamp,
} from "firebase/firestore";
import type { Supplier, SaleReceipt } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PosInventoryItem {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category: string;
  brand?: string;
  isService: boolean;
  unitType?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  lowStockThreshold: number;
  supplierId?: string;
  supplierName?: string;
  yield?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosCategory {
  id: string;
  name: string;
  type: "product" | "service";
}

export interface PosPayableAccount {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  purchaseId?: string;
  [k: string]: any;
}

export interface PosPurchase {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceId: string;
  invoiceDate: string;
  invoiceTotal: number;
  paymentMethod: string;
  status: string;
  items: any[];
  [k: string]: any;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function tsToIso(v: any): string | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return undefined;
}

function docToItem(id: string, data: any): PosInventoryItem {
  return {
    id,
    name: data.name ?? "",
    sku: data.sku,
    description: data.description,
    category: data.category ?? "",
    brand: data.brand,
    isService: data.isService ?? false,
    unitType: data.unitType,
    costPrice: Number(data.costPrice ?? data.unitPrice ?? 0),
    salePrice: Number(data.salePrice ?? data.sellingPrice ?? 0),
    stock: Number(data.stock ?? data.quantity ?? 0),
    lowStockThreshold: Number(data.lowStockThreshold ?? 5),
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    yield: data.yield,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface PosData {
  items: PosInventoryItem[];
  categories: PosCategory[];
  suppliers: Supplier[];
  sales: SaleReceipt[];
  purchases: PosPurchase[];
  payables: PosPayableAccount[];
  isLoading: boolean;
  // helpers
  getItemById: (id: string) => PosInventoryItem | undefined;
  getSupplierById: (id: string) => Supplier | undefined;
  kpis: {
    totalProducts: number;
    totalServices: number;
    lowStock: number;
    outOfStock: number;
    inventoryValue: number;
  };
}

export function usePosData(): PosData {
  const [items, setItems] = useState<PosInventoryItem[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<SaleReceipt[]>([]);
  const [purchases, setPurchases] = useState<PosPurchase[]>([]);
  const [payables, setPayables] = useState<PosPayableAccount[]>([]);
  const [loadCount, setLoadCount] = useState(0);

  const isLoading = loadCount < 6;

  useEffect(() => {
    const done = () => setLoadCount((c) => c + 1);
    const unsubs: (() => void)[] = [];

    // inventoryItems — nueva colección limpia
    unsubs.push(
      onSnapshot(query(collection(db, "inventoryItems"), orderBy("name")), (snap) => {
        setItems(snap.docs.map((d) => docToItem(d.id, d.data())));
        done();
      })
    );

    // inventoryCategories
    unsubs.push(
      onSnapshot(collection(db, "inventoryCategories"), (snap) => {
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PosCategory))
        );
        done();
      })
    );

    // suppliers
    unsubs.push(
      onSnapshot(query(collection(db, "suppliers"), orderBy("name")), (snap) => {
        setSuppliers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Supplier))
        );
        done();
      })
    );

    // sales
    unsubs.push(
      onSnapshot(query(collection(db, "sales"), orderBy("saleDate", "desc")), (snap) => {
        setSales(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as SaleReceipt)));
        done();
      })
    );

    // purchases
    unsubs.push(
      onSnapshot(
        query(collection(db, "purchases"), orderBy("invoiceDate", "desc")),
        (snap) => {
          setPurchases(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PosPurchase))
          );
          done();
        }
      )
    );

    // payableAccounts
    unsubs.push(
      onSnapshot(collection(db, "payableAccounts"), (snap) => {
        setPayables(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PosPayableAccount))
        );
        done();
      })
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  const getItemById = useMemo(
    () =>
      (id: string) =>
        items.find((i) => i.id === id),
    [items]
  );

  const getSupplierById = useMemo(
    () =>
      (id: string) =>
        suppliers.find((s) => s.id === id),
    [suppliers]
  );

  const kpis = useMemo(() => {
    const products = items.filter((i) => !i.isService);
    return {
      totalProducts: products.length,
      totalServices: items.filter((i) => i.isService).length,
      lowStock: products.filter(
        (i) => i.stock > 0 && i.stock <= i.lowStockThreshold
      ).length,
      outOfStock: products.filter((i) => i.stock === 0).length,
      inventoryValue: products.reduce((s, i) => s + i.stock * i.costPrice, 0),
    };
  }, [items]);

  return {
    items,
    categories,
    suppliers,
    sales,
    purchases,
    payables,
    isLoading,
    getItemById,
    getSupplierById,
    kpis,
  };
}
