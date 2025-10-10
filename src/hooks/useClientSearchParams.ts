"use client";
import { useEffect, useState } from "react";

export function useClientSearchParams() {
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    const get = () => new URLSearchParams(window.location.search);
    setParams(get());
    const onPopState = () => setParams(get());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return params;
}
