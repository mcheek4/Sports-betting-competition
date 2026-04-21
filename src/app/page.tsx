"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface LeaderboardEntry {
  id: string;
  username: string;
  balance: number;
  profit: number;
  totalBets: number;
  won: number;
  winRate: number;
}

interface RecentBet {
  id: string;
  homeTeam: string;
  awayTeam: string;
  betType: string;
  selection: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  status: string;
}

interface RecentParlay {
  id: string;
  combinedOdds: number;
  stake: number;
  potentialPayout: number;
  status: string;
  legs: { bet: RecentBet }[];
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBets, setRecentBets] = useState<{ bets: RecentBet[]; parlays: RecentParlay[] }>({
    bets: [],
    parlays: [],
  });

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then(setLeaderboard)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bets?type=all")
      .then((r) => r.json())
      .then(setRecentBets)
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl font-bold text-white mb-3">PropShop</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
          Compete with your friends using $10,000 in play money. Bet on NFL, NBA, MLB, NHL, College Football, and MLS
          games.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
          >
            Get Started — Free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Log In
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: "💰",
              title: "$10K Play Money",
              desc: "Everyone starts with $10,000. No real money, just bragging rights.",
            },
            {
              icon: "🎰",
              title: "Real Odds",
              desc: "Live odds from DraftKings, FanDuel, BetMGM, and Caesars.",
            },
            {
              icon: "🏅",
              title: "Parlays & Live Bets",
              desc: "Build multi-leg parlays and bet on games in progress.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pendingBets = recentBets.bets.filter((b) => b.status === "pending").length;
  const pendingParlays = recentBets.parlays.filter((p) => p.status === "pending").length;
  const userRank = leaderboard.findIndex((u) => u.id === user.id) + 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome back, {user.username}</h1>
        <p className="text-gray-400 text-sm mt-1">Rank #{userRank || "—"} on the leaderboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Balance"
          value={`$${user.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="green"
        />
        <StatCard
          label="Profit / Loss"
          value={`${user.balance - 10000 >= 0 ? "+" : ""}$${(user.balance - 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color={user.balance >= 10000 ? "green" : "red"}
        />
        <StatCard label="Pending Bets" value={String(pendingBets + pendingParlays)} color="yellow" />
        <StatCard label="Rank" value={`#${userRank || "—"}`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Bets</h2>
            <Link href="/my-bets" className="text-sm text-green-400 hover:text-green-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentBets.bets.length === 0 && recentBets.parlays.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                <p className="text-gray-400 mb-3">No bets yet</p>
                <Link href="/games" className="text-green-400 hover:underline text-sm">
                  Browse games →
                </Link>
              </div>
            ) : (
              [
                ...recentBets.bets.slice(0, 3).map((b) => ({ ...b, kind: "straight" as const })),
                ...recentBets.parlays.slice(0, 2).map((p) => ({ ...p, kind: "parlay" as const })),
              ].map((item) => <BetRow key={item.id} item={item} />)
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
            <Link href="/leaderboard" className="text-sm text-green-400 hover:text-green-300">
              Full board →
            </Link>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No players yet</div>
            ) : (
              leaderboard.slice(0, 5).map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-700 last:border-0 ${entry.id === user.id ? "bg-green-900/20" : ""}`}
                >
                  <span className="text-sm font-bold text-gray-500 w-5">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-white truncate">{entry.username}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${entry.balance >= 10000 ? "text-green-400" : "text-red-400"}`}
                  >
                    ${entry.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "yellow" | "blue";
}) {
  const colors = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
  };
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${colors[color]}`}>{value}</div>
    </div>
  );
}

function BetRow({
  item,
}: {
  item: (RecentBet & { kind: "straight" }) | (RecentParlay & { kind: "parlay" });
}) {
  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-900/30",
    won: "text-green-400 bg-green-900/30",
    lost: "text-red-400 bg-red-900/30",
    push: "text-blue-400 bg-blue-900/30",
    void: "text-gray-400 bg-gray-800",
  };

  if (item.kind === "parlay") {
    return (
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Parlay ({item.legs.length} legs)</div>
            <div className="text-xs text-gray-400">{item.legs.map((l) => l.bet.selection).join(" + ")}</div>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] ?? ""}`}>
              {item.status}
            </span>
            <div className="text-xs text-gray-400 mt-1">
              ${item.stake} → ${item.potentialPayout.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-white">{item.selection}</div>
          <div className="text-xs text-gray-400">
            {item.homeTeam} vs {item.awayTeam} · {item.betType} ·{" "}
            {item.odds > 0 ? `+${item.odds}` : item.odds}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] ?? ""}`}>
            {item.status}
          </span>
          <div className="text-xs text-gray-400 mt-1">
            ${item.stake} → ${item.potentialPayout.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
