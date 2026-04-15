
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

// Hack to suppress the "Encountered a script tag" warning from React 19
// caused by next-themes injecting an inline script to prevent FOUC.
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag while rendering React component")) {
      return;
    }
    originalError(...args);
  };
}

type Props = React.ComponentProps<typeof NextThemesProvider>;
export function ThemeProvider(props: Props) {
  return <NextThemesProvider {...props} />;
}

export { useTheme } from "next-themes";
