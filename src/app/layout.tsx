import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
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
  title: "Harborline Property Management | Final Project G16",
  description:
    "Harborline helps tenants apply for space and helps the property team run contracts, billing, and operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="corporate">
      <body
        className={`${outfit.variable} ${fraunces.variable} min-h-screen bg-base-200 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
