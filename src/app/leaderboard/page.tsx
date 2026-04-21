"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface LeaderboardEntry {
  id: string;
  username: string;
  balance: number;
  profit: number;
  totalBets: number;
  won: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-1">Everyone starts with $10,000. Who&apos;s up?</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 h-16 animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No players yet. Invite your friends!</div>
      ) : (
        <div className="space-y-2">
          {data.map((entry, i) => {
            const isMe = entry.id === user?.id;
            const isTop3 = i < 3;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-colors ${
                  isMe
                    ? "bg-green-900/20 border-green-700"
                    : isTop3
                    ? "bg-gray-800 border-gray-600"
                    : "bg-gray-800 border-gray-700"
                }`}
              >
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className="text-xl">{medals[i]}</span>
                  ) : (
                    <span className="text-gray-500 font-bold">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${isMe ? "text-green-300" : "text-white"}`}>
                      {entry.username}
                    </span>
                    {isMe && <span className="text-xs text-green-500 font-medium">(you)</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {entry.totalBets} bets · {entry.winRate}% win rate
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-bold tabular-nums ${entry.balance >= 10000 ? "text-green-400" : "text-red-400"}`}>
                    ${entry.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                  <div className={`text-xs tabular-nums ${entry.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {entry.profit >= 0 ? "+" : ""}${entry.profit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
