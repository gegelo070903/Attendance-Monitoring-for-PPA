import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Attendance Monitoring System - PPA",
  description: "Employee attendance tracking and monitoring system for PPA",
  icons: {
    icon: "/images/ppa-logo-nobg.png",
    shortcut: "/images/ppa-logo-nobg.png",
    apple: "/images/ppa-logo-nobg.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
