
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://ranoro.mx"),
  title: "Ranoro V1.4",
  description: "Software para la gestión de talleres mecánicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
       <head>
        {/* The script is removed as ThemeProvider is no longer global */}
      </head>
      <body className={inter.className}>
          {children}
        </body>
    </html>
  );
}
