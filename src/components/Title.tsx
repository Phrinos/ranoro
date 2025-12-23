// src/components/Title.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Title({
  title,
  children,
  className,
}: {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const content = title ?? children;
  return (
    <h1 className={cn("text-xl font-semibold leading-tight", className)}>
      {content}
    </h1>
  );
}
