import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Backdrop } from "@/components/Backdrop";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "NEONDEV Pulse — Uptime monitoring & status pages",
  description: "Know your site is down before your users do. Uptime checks, instant alerts and public status pages.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <Backdrop />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
