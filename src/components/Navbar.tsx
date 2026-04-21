"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBetSlip } from "@/context/BetSlipContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { legs, toggleOpen, isOpen } = useBetSlip();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/games", label: "Games" },
    { href: "/my-bets", label: "My Bets" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-green-400 font-bold text-xl tracking-tight">
              PropShop
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="text-gray-400">{user.username}</span>
                  <span className="bg-green-900 text-green-300 px-2 py-0.5 rounded font-mono font-semibold">
                    ${user.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={toggleOpen}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isOpen ? "bg-green-600 text-white" : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  Bet Slip
                  {legs.length > 0 && (
                    <span className="bg-green-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {legs.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-md text-sm text-gray-300 hover:text-white">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
