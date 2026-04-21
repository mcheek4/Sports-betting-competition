import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BetSlipProvider } from "@/context/BetSlipContext";
import Navbar from "@/components/Navbar";
import BetSlip from "@/components/BetSlip";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PropShop — Play Money Sports Betting",
  description: "Compete with friends using $10K in play money across NFL, NBA, MLB, NHL, NCAAF, and MLS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <AuthProvider>
          <BetSlipProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <BetSlip />
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
