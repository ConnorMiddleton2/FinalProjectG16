import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Harborline Property Management | Final Project G16",
  description:
    "Contract-to-cash property management system skeleton for ACCY 628 Final Project G16.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="corporate">
      <body className={`${dmSans.variable} min-h-screen bg-base-200 antialiased`}>
        {children}
      </body>
    </html>
  );
}
