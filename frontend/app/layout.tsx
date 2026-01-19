import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GlobalAlertBanner from "@/components/GlobalAlertBanner";

import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hospital OS",
  description: "AI-Powered Hospital Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <ToastProvider>
          <GlobalAlertBanner />
          <Navbar />
          <main className="flex-grow w-full">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}

