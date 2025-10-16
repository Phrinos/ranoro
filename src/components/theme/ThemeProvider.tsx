
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

type Props = React.ComponentProps<typeof NextThemesProvider>;
export function ThemeProvider(props: Props) {
  return <NextThemesProvider {...props} />;
}

export { useTheme } from "next-themes";
