// src/app/(app)/personal/hooks/use-staff-data.ts
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import type { User, ServiceRecord } from "@/types";

// ── Hook ──────────────────────────────────────────────────────────────────────

interface StaffData {
  staff: User[];                // All users (non-archived)
  archivedStaff: User[];
  services: ServiceRecord[];   // For commissions/performance calc
  isLoading: boolean;
}

export function useStaffData(): StaffData {
  const [staff, setStaff] = useState<User[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loadCount, setLoadCount] = useState(0);

  const isLoading = loadCount < 2;
  const done = () => setLoadCount((c) => c + 1);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, "users"), (snap) => {
      setStaff(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as User)));
      done();
    }));

    unsubs.push(onSnapshot(
      query(collection(db, "serviceRecords"), orderBy("createdAt", "desc")),
      (snap) => {
        setServices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ServiceRecord)));
        done();
      }
    ));

    return () => unsubs.forEach((u) => u());
  }, []);

  const activeStaff = useMemo(() => staff.filter((s) => !s.isArchived), [staff]);
  const archivedStaff = useMemo(() => staff.filter((s) => s.isArchived), [staff]);

  return { staff: activeStaff, archivedStaff, services, isLoading };
}
