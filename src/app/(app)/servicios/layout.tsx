// src/app/(app)/servicios/layout.tsx
import React from "react";
import { ServicesProvider } from "./components/providers/services-provider";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <ServicesProvider>{children}</ServicesProvider>;
}
