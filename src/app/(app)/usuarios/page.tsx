// src/app/(app)/usuarios/page.tsx
"use client";

/**
 * /usuarios — System Users & Roles module
 * 
 * Separates system concerns (auth users, roles, permissions) from HR (personal).
 * Reuses the existing user management and roles content from personal-old.
 */

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsersData } from "./hooks/use-users-data";
import { UsersListTab } from "./components/users-list-tab";
import dynamic from "next/dynamic";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import type { User as AppUser } from "@/types";

const RolesPageContent = dynamic(
  () => import("@/app/(app)/usuarios/components/roles-content").then((m) => ({ default: m.RolesPageContent })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

const TABS = [
  { value: "usuarios", label: "Usuarios del Sistema" },
  { value: "roles", label: "Roles y Permisos" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function UsuariosPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) || "usuarios";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const { users, roles, isLoading } = useUsersData();

  const currentUser = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? "null") as AppUser | null; }
    catch { return null; }
  })();

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-black tracking-tight">Usuarios del Sistema</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gestión de accesos, roles y permisos del sistema.
        </p>
      </div>

      {/* Tab Pills */}
      <div className="flex gap-1 p-1.5 bg-muted/70 backdrop-blur-xs rounded-xl overflow-x-auto ring-1 ring-muted mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              "shrink-0 flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
              activeTab === tab.value
                ? "bg-red-700 text-white shadow-md scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "usuarios" && (
          <UsersListTab users={users} />
        )}
        {activeTab === "roles" && (
          <RolesPageContent currentUser={currentUser} initialRoles={roles} />
        )}
      </div>
    </div>
  );
}

export default withSuspense(UsuariosPageInner, null);
