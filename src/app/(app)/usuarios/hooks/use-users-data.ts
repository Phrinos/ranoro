// src/app/(app)/usuarios/hooks/use-users-data.ts
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, onSnapshot } from "firebase/firestore";
import type { User as AppUser, AppRole } from "@/types";
import { adminService } from "@/lib/services";

interface UsersData {
  users: AppUser[];
  roles: AppRole[];
  isLoading: boolean;
}

export function useUsersData(): UsersData {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadCount, setLoadCount] = useState(0);

  const isLoading = loadCount < 2;
  const done = () => setLoadCount((c) => c + 1);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as AppUser)));
      done();
    }));

    unsubs.push(adminService.onRolesUpdate((r) => { setRoles(r); done(); }));

    return () => unsubs.forEach((u) => u());
  }, []);

  return { users, roles, isLoading };
}
