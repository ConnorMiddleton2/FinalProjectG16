import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { COMPANY_NAME, COMPANY_SHORT } from "@/lib/brand";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `${COMPANY_NAME} | Final Project G16`,
  description: `${COMPANY_SHORT} helps tenants apply for space and helps the property team run contracts, billing, and operations.`,
  icons: {
    icon: "/cpmc-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="corporate" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${fraunces.variable} min-h-screen bg-base-200 antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
