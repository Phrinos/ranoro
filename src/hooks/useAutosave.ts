// src/hooks/useAutosave.ts
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

interface UseAutosaveOptions<T extends Record<string, any>> {
  form: UseFormReturn<T>;
  /** Called to persist current form values. Should NOT navigate away. */
  onSave: (values: T) => Promise<void>;
  /** Interval in ms between autosaves (default: 30000 = 30s) */
  interval?: number;
  /** Whether autosave is enabled (disable for read-only, or before first hydration) */
  enabled?: boolean;
}

interface UseAutosaveReturn {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  /** Trigger an immediate save (returns a promise) */
  saveNow: () => Promise<void>;
  /** Whether the form has unsaved changes */
  hasUnsavedChanges: boolean;
}

export function useAutosave<T extends Record<string, any>>({
  form,
  onSave,
  interval = 30_000,
  enabled = true,
}: UseAutosaveOptions<T>): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { formState: { isDirty, dirtyFields } } = form;
  const hasUnsavedChanges = isDirty && Object.keys(dirtyFields).length > 0;

  // Update status when form becomes dirty
  useEffect(() => {
    if (hasUnsavedChanges && status === "saved") {
      setStatus("unsaved");
    } else if (hasUnsavedChanges && status === "idle") {
      setStatus("unsaved");
    }
  }, [hasUnsavedChanges, status]);

  const performSave = useCallback(async () => {
    if (savingRef.current) return;
    if (!hasUnsavedChanges) return;

    savingRef.current = true;
    setStatus("saving");

    try {
      const values = form.getValues();
      await onSave(values);
      // Reset dirty state after successful save
      form.reset(values, { keepValues: true, keepDirty: false, keepErrors: true });
      setLastSavedAt(new Date());
      setStatus("saved");
    } catch (err) {
      console.error("[Autosave] Save failed:", err);
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [form, onSave, hasUnsavedChanges]);

  // Interval autosave
  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(() => {
      if (hasUnsavedChanges && !savingRef.current) {
        performSave();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, hasUnsavedChanges, performSave]);

  // Warn on page unload if there are unsaved changes
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Trigger a save attempt
        performSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, hasUnsavedChanges, performSave]);

  return {
    status,
    lastSavedAt,
    saveNow: performSave,
    hasUnsavedChanges,
  };
}
