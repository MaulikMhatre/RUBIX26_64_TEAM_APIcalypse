"use client";
import React, { useEffect, useState } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";


import Navbar from "@/components/Navbar";
import GlobalAlertBanner from "@/components/GlobalAlertBanner";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for Phrelis OS Auth Token
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, [pathname]); // Re-check on route change

  // Determine if we are on the login page
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-[#020617] min-h-screen flex flex-col transition-colors duration-500`}
        suppressHydrationWarning
      >
        <ToastProvider>
          {!isLoginPage && isAuthenticated && (
            <>
              <GlobalAlertBanner />
              <Navbar />
            </>
          )}

          <main className="flex-grow w-full">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}