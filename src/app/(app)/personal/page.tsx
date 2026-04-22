// src/app/(app)/personal/page.tsx
"use client";

/**
 * /personal — HR module
 * 
 * Wraps existing personal-old tabs (comisiones, rendimiento, sueldos)
 * using the new URL-synced pill navigation pattern.
 * Staff directory and individual profiles are at /personal/[id].
 */

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffData } from "./hooks/use-staff-data";
import { StaffListTab } from "./components/staff-list-tab";
import dynamic from "next/dynamic";

const ComisionesContent = dynamic(
  () => import("@/app/(app)/personal/components/comisiones-content"),
  { ssr: false, loading: () => <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> }
);

const TABS = [
  { value: "directorio", label: "Directorio" },
  { value: "comisiones", label: "Comisiones" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function PersonalPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) || "directorio";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const { staff, archivedStaff, services, isLoading } = useStaffData();

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
      <div className="mb-6 pl-4 border-l-[3px] border-primary">
        <h1 className="text-2xl font-black tracking-tight">Personal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Directorio del equipo, comisiones y rendimiento laboral.
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
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "directorio" && (
          <StaffListTab staff={staff} archivedStaff={archivedStaff} />
        )}
        {activeTab === "comisiones" && (
          <ComisionesContent allServices={services} allUsers={staff} />
        )}
      </div>
    </div>
  );
}

export default function PersonalPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PersonalPageInner />
    </Suspense>
  );
}
