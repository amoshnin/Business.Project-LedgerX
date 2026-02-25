import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import { BackendStatusProvider } from "@/components/providers/BackendStatusProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LedgerX",
    template: "%s | LedgerX",
  },
  description: "Enterprise-grade high-concurrency payment engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        <BackendStatusProvider>
          <div className="relative min-h-screen overflow-x-clip">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(20,184,166,0.15),transparent_35%)]" />

            <header className="border-b border-border/70 bg-background/80 backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center justify-between px-4 sm:px-6 lg:px-6 xl:px-8">
                <Link
                  href="/"
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                    LedgerX
                  </span>
                </Link>

                <nav className="flex items-center gap-2 text-sm text-muted-foreground sm:gap-4">
                  <Link
                    href="/demo"
                    className="rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Demo
                  </Link>
                  <Link
                    href="/architecture"
                    className="rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Architecture
                  </Link>
                </nav>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[92rem] px-4 pt-8 pb-12 sm:px-6 sm:pt-10 lg:px-6 xl:px-8">
              {children}
            </main>
          </div>
          <Toaster />
        </BackendStatusProvider>
      </body>
    </html>
  );
}
