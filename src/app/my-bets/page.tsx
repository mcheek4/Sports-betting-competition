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
  commenceTime: string;
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

function cashOutValue(stake: number, potentialPayout: number) {
  return parseFloat((stake + (potentialPayout - stake) * 0.5).toFixed(2));
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

type ActionType = "cancel" | "cashout";

interface ConfirmState {
  betId?: string;
  parlayId?: string;
  action: ActionType;
  amount: number;
  label: string;
}

export default function MyBetsPage() {
  const { user, refreshUser } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<"straight" | "parlay">("straight");
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const autoSettle = async () => {
    setSettling(true);
    try {
      const res = await fetch("/api/bets/settle");
      const data = await res.json();
      if (data.count > 0) showToast(`Settled ${data.count} bet${data.count > 1 ? "s" : ""}`);
      else showToast("No completed games found to settle");
      await fetchBets();
      await refreshUser();
    } finally {
      setSettling(false);
    }
  };

  const requestAction = (state: ConfirmState) => setConfirm(state);

  const executeAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/bets/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirm.action,
          betId: confirm.betId,
          parlayId: confirm.parlayId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong");
      } else {
        if (confirm.action === "cancel") {
          showToast(`Bet cancelled — $${confirm.amount.toFixed(2)} returned to your balance`);
        } else {
          showToast(`Cashed out for $${confirm.amount.toFixed(2)}`);
        }
        await fetchBets();
        await refreshUser();
      }
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const filteredBets = bets.filter((b) => statusFilter === "all" || b.status === statusFilter);
  const filteredParlays = parlays.filter((p) => statusFilter === "all" || p.status === statusFilter);

  const totalWagered = bets.reduce((s, b) => s + b.stake, 0) + parlays.reduce((s, p) => s + p.stake, 0);
  const totalWon =
    bets.filter((b) => b.status === "won").reduce((s, b) => s + b.potentialPayout, 0) +
    parlays.filter((p) => p.status === "won").reduce((s, p) => s + p.potentialPayout, 0);
  const winCount =
    bets.filter((b) => b.status === "won").length + parlays.filter((p) => p.status === "won").length;
  const totalCount =
    bets.filter((b) => b.status !== "pending").length +
    parlays.filter((p) => p.status !== "pending").length;

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
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-2">
              {confirm.action === "cancel" ? "Cancel Bet?" : "Cash Out?"}
            </h3>
            <p className="text-gray-400 text-sm mb-1">{confirm.label}</p>
            {confirm.action === "cancel" ? (
              <p className="text-gray-300 text-sm">
                Your full stake of <span className="text-white font-semibold">${confirm.amount.toFixed(2)}</span> will be returned to your balance.
              </p>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">You&apos;ll receive a guaranteed payout of:</p>
                <p className="text-green-400 font-bold text-xl">${confirm.amount.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">= stake + 50% of potential profit</p>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirm(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
              >
                Never mind
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 ${
                  confirm.action === "cancel"
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-green-600 hover:bg-green-500"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : confirm.action === "cancel"
                  ? "Yes, Cancel Bet"
                  : `Cash Out $${confirm.amount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Bets</h1>
        <button
          onClick={autoSettle}
          disabled={settling}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 transition-colors disabled:opacity-50"
        >
          {settling ? "Settling..." : "Auto-settle from scores"}
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
              statusFilter === s
                ? "bg-white text-gray-900"
                : "bg-gray-800 text-gray-400 hover:text-white border border-gray-600"
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
            {filteredBets.map((bet) => {
              const now = new Date();
              const gameStarted = new Date(bet.commenceTime) <= now;
              const isPending = bet.status === "pending";
              const coValue = cashOutValue(bet.stake, bet.potentialPayout);
              const label = `${bet.selection} — ${bet.homeTeam} vs ${bet.awayTeam}`;

              return (
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
                        {bet.betType}{bet.line != null ? ` (${bet.line > 0 ? "+" : ""}${bet.line})` : ""} · {formatOdds(bet.odds)} · {formatDate(bet.commenceTime)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColors[bet.status] ?? ""}`}>
                        {bet.status}
                      </span>
                      <div className="text-sm font-semibold text-white mt-1 tabular-nums">
                        ${bet.stake} → <span className="text-green-400">${bet.potentialPayout.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                      {!gameStarted && (
                        <button
                          onClick={() => requestAction({ betId: bet.id, action: "cancel", amount: bet.stake, label })}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-300 border border-gray-600 hover:border-red-800 transition-colors"
                        >
                          Cancel Bet
                        </button>
                      )}
                      {gameStarted && (
                        <button
                          onClick={() => requestAction({ betId: bet.id, action: "cashout", amount: coValue, label })}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-green-900/30 hover:bg-green-900/60 text-green-400 border border-green-800 transition-colors"
                        >
                          Cash Out ${coValue.toFixed(2)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : filteredParlays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredParlays.map((parlay) => {
            const now = new Date();
            const anyStarted = parlay.legs.some((l) => new Date(l.bet.commenceTime) <= now);
            const allStarted = parlay.legs.every((l) => new Date(l.bet.commenceTime) <= now);
            const isPending = parlay.status === "pending";
            const coValue = cashOutValue(parlay.stake, parlay.potentialPayout);
            const label = `${parlay.legs.length}-leg parlay`;

            return (
              <div key={parlay.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-purple-400">PARLAY</span>
                      <span className="text-sm text-gray-400">{parlay.legs.length} legs</span>
                      {anyStarted && !allStarted && (
                        <span className="text-xs text-yellow-500">Some games live</span>
                      )}
                      {allStarted && (
                        <span className="text-xs text-red-400">All games live</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Combined odds: {formatOdds(parlay.combinedOdds)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColors[parlay.status] ?? ""}`}>
                      {parlay.status}
                    </span>
                    <div className="text-sm font-semibold text-white mt-1 tabular-nums">
                      ${parlay.stake} → <span className="text-green-400">${parlay.potentialPayout.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-700 pt-2 mb-3">
                  {parlay.legs.map((leg) => {
                    const legStarted = new Date(leg.bet.commenceTime) <= new Date();
                    return (
                      <div key={leg.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-300 min-w-0">
                          <SportIcon sport={leg.bet.sport} />
                          <span className="truncate">{leg.bet.selection}</span>
                          <span className="text-gray-500 shrink-0">
                            vs {leg.bet.awayTeam.split(" ").pop()}
                          </span>
                          {legStarted && <span className="text-red-400 shrink-0">●</span>}
                        </div>
                        <span className={`${leg.bet.odds > 0 ? "text-green-400" : "text-gray-400"} font-medium shrink-0`}>
                          {formatOdds(leg.bet.odds)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {isPending && (
                  <div className="flex gap-2 pt-2 border-t border-gray-700">
                    {!anyStarted && (
                      <button
                        onClick={() => requestAction({ parlayId: parlay.id, action: "cancel", amount: parlay.stake, label })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-300 border border-gray-600 hover:border-red-800 transition-colors"
                      >
                        Cancel Parlay
                      </button>
                    )}
                    {anyStarted && (
                      <button
                        onClick={() => requestAction({ parlayId: parlay.id, action: "cashout", amount: coValue, label })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-green-900/30 hover:bg-green-900/60 text-green-400 border border-green-800 transition-colors"
                      >
                        Cash Out ${coValue.toFixed(2)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
