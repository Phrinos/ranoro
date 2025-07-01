
"use client";

// This file is effectively replaced by PurchaseItemSelectionDialog.tsx and PurchaseDetailsEntryDialog.tsx
// Keeping it here as a placeholder for removal, or it can be deleted.
// For now, I'll empty its content as its functionality is moved.

export function PurchaseEntryDialog() {
  // This component is no longer used. Its functionality has been split into
  // PurchaseItemSelectionDialog.tsx and PurchaseDetailsEntryDialog.tsx
  // and managed by InventarioPage.tsx
  return null;
}

export type PurchaseEntryFormValues = { // Keep type for compatibility if referenced elsewhere during refactor
  sku: string;
  quantity: number;
  purchasePrice: number;
};
