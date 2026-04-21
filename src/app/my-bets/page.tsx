"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Bet {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  betType: string;
  selection: string;
  line?: number | null;
  odds: number;
  stake: number;
  potentialPayout: number;
  status: string;
  isLive: boolean;
  createdAt: string;
  settledAt?: string | null;
}

interface ParlayLeg {
  id: string;
  bet: Bet;
}

interface Parlay {
  id: string;
  combinedOdds: number;
  stake: number;
  potentialPayout: number;
  status: string;
  createdAt: string;
  settledAt?: string | null;
  legs: ParlayLeg[];
}

type StatusFilter = "all" | "pending" | "won" | "lost" | "push";

const statusColors: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  won: "text-green-400 bg-green-900/30 border-green-800",
  lost: "text-red-400 bg-red-900/30 border-red-800",
  push: "text-blue-400 bg-blue-900/30 border-blue-800",
  void: "text-gray-400 bg-gray-700 border-gray-600",
};

function formatOdds(o: number) {
  return o > 0 ? `+${o}` : `${o}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SportIcon({ sport }: { sport: string }) {
  const icons: Record<string, string> = {
    americanfootball_nfl: "🏈",
    americanfootball_ncaaf: "🏈",
    basketball_nba: "🏀",
    baseball_mlb: "⚾",
    icehockey_nhl: "🏒",
    soccer_usa_mls: "⚽",
  };
  return <>{icons[sport] ?? "🏅"}</>;
}

export default function MyBetsPage() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<"straight" | "parlay">("straight");
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);

  const fetchBets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bets?type=all");
      const data = await res.json();
      setBets(data.bets ?? []);
      setParlays(data.parlays ?? []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchBets();
  }, [user]);

  const autoSettle = async () => {
    setSettling("auto");
    try {
      await fetch("/api/bets/settle");
      await fetchBets();
    } finally {
      setSettling(null);
    }
  };

  const filteredBets = bets.filter((b) => statusFilter === "all" || b.status === statusFilter);
  const filteredParlays = parlays.filter((p) => statusFilter === "all" || p.status === statusFilter);

  const totalWagered = bets.reduce((s, b) => s + b.stake, 0) + parlays.reduce((s, p) => s + p.stake, 0);
  const totalWon = bets.filter((b) => b.status === "won").reduce((s, b) => s + b.potentialPayout, 0) +
    parlays.filter((p) => p.status === "won").reduce((s, p) => s + p.potentialPayout, 0);
  const winCount = bets.filter((b) => b.status === "won").length + parlays.filter((p) => p.status === "won").length;
  const totalCount = bets.filter((b) => b.status !== "pending").length + parlays.filter((p) => p.status !== "pending").length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-gray-400 mb-3">Please log in to view your bets</p>
          <Link href="/login" className="text-green-400 hover:underline">Log in →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Bets</h1>
        <button
          onClick={autoSettle}
          disabled={settling === "auto"}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 transition-colors disabled:opacity-50"
        >
          {settling === "auto" ? "Settling..." : "Auto-settle from scores"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Total Wagered</div>
          <div className="font-bold text-white tabular-nums">${totalWagered.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Total Won</div>
          <div className="font-bold text-green-400 tabular-nums">${totalWon.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="font-bold text-white">
            {totalCount > 0 ? `${Math.round((winCount / totalCount) * 100)}%` : "—"}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Total Bets</div>
          <div className="font-bold text-white">{bets.length + parlays.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("straight")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "straight" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-600"}`}
        >
          Straight Bets ({bets.length})
        </button>
        <button
          onClick={() => setTab("parlay")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "parlay" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-600"}`}
        >
          Parlays ({parlays.length})
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", "pending", "won", "lost", "push"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              statusFilter === s ? "bg-white text-gray-900" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 h-20 animate-pulse" />
          ))}
        </div>
      ) : tab === "straight" ? (
        filteredBets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filteredBets.map((bet) => (
              <div key={bet.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base"><SportIcon sport={bet.sport} /></span>
                      <span className="font-semibold text-white truncate">{bet.selection}</span>
                      {bet.isLive && <span className="text-red-400 text-xs font-medium">LIVE</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {bet.homeTeam} vs {bet.awayTeam}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {bet.betType}{bet.line != null ? ` (${bet.line > 0 ? "+" : ""}${bet.line})` : ""} · {formatOdds(bet.odds)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColors[bet.status] ?? ""}`}>
                      {bet.status}
                    </span>
                    <div className="text-sm font-semibold text-white mt-1 tabular-nums">
                      ${bet.stake} → <span className="text-green-400">${bet.potentialPayout.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{formatDate(bet.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredParlays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredParlays.map((parlay) => (
            <div key={parlay.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-purple-400">PARLAY</span>
                    <span className="text-sm text-gray-400">{parlay.legs.length} legs</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Combined odds: {formatOdds(parlay.combinedOdds)}</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColors[parlay.status] ?? ""}`}>
                    {parlay.status}
                  </span>
                  <div className="text-sm font-semibold text-white mt-1 tabular-nums">
                    ${parlay.stake} → <span className="text-green-400">${parlay.potentialPayout.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{formatDate(parlay.createdAt)}</div>
                </div>
              </div>
              <div className="space-y-1.5 border-t border-gray-700 pt-2">
                {parlay.legs.map((leg) => (
                  <div key={leg.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-300 min-w-0">
                      <SportIcon sport={leg.bet.sport} />
                      <span className="truncate">{leg.bet.selection}</span>
                      <span className="text-gray-500 shrink-0">vs {leg.bet.awayTeam.split(" ").pop()}</span>
                    </div>
                    <span className={`${leg.bet.odds > 0 ? "text-green-400" : "text-gray-400"} font-medium shrink-0`}>
                      {formatOdds(leg.bet.odds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🎯</div>
      <p className="text-gray-400">No bets found</p>
      <Link href="/games" className="text-green-400 hover:underline text-sm mt-2 inline-block">
        Browse games →
      </Link>
    </div>
  );
}
