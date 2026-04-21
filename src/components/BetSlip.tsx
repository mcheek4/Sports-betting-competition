"use client";

import { useState } from "react";
import { useBetSlip } from "@/context/BetSlipContext";
import { useAuth } from "@/context/AuthContext";
import { combineParlayOdds, calculatePayout, americanToDecimal } from "@/lib/odds";

function formatOdds(o: number) {
  return o > 0 ? `+${o}` : `${o}`;
}

export default function BetSlip() {
  const { legs, removeLeg, clearSlip, isOpen } = useBetSlip();
  const { user, refreshUser } = useAuth();
  const [stake, setStake] = useState("");
  const [parlayMode, setParlayMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const stakeNum = parseFloat(stake) || 0;

  const combinedOdds = legs.length > 1 ? combineParlayOdds(legs.map((l) => l.odds)) : legs[0]?.odds ?? 0;
  const parlayPayout = stakeNum > 0 && legs.length > 0 ? calculatePayout(stakeNum, combinedOdds) : 0;

  const handlePlaceBet = async () => {
    if (!user) return;
    if (stakeNum <= 0) { setMessage({ type: "error", text: "Enter a valid stake" }); return; }
    if (stakeNum > user.balance) { setMessage({ type: "error", text: "Insufficient balance" }); return; }
    if (parlayMode && legs.length < 2) { setMessage({ type: "error", text: "Need 2+ legs for a parlay" }); return; }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: parlayMode ? "parlay" : "straight",
          stake: stakeNum,
          legs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to place bet" });
      } else {
        setMessage({ type: "success", text: parlayMode ? "Parlay placed!" : "Bet placed!" });
        clearSlip();
        setStake("");
        await refreshUser();
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-full sm:w-96 bg-gray-900 border-t sm:border border-gray-700 sm:rounded-tl-xl z-50 shadow-2xl max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="font-bold text-white">Bet Slip ({legs.length})</h3>
        <div className="flex items-center gap-2">
          {legs.length > 1 && (
            <button
              onClick={() => setParlayMode(!parlayMode)}
              className={`text-xs px-2 py-1 rounded transition-colors ${parlayMode ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
            >
              Parlay
            </button>
          )}
          <button onClick={clearSlip} className="text-gray-500 hover:text-gray-300 text-xs">Clear</button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-2">
        {legs.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">Add selections from the Games page</p>
        )}
        {legs.map((leg) => {
          const id = `${leg.eventId}-${leg.betType}-${leg.selection}`;
          const singlePayout = stakeNum > 0 ? calculatePayout(stakeNum, leg.odds) : 0;
          return (
            <div key={id} className="bg-gray-800 rounded-lg p-3 text-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{leg.label}</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {leg.homeTeam} vs {leg.awayTeam}
                  </div>
                  {leg.isLive && <span className="text-red-400 text-xs font-medium">● LIVE</span>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`font-bold ${leg.odds > 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatOdds(leg.odds)}
                  </span>
                  <button onClick={() => removeLeg(id)} className="text-gray-600 hover:text-gray-400">✕</button>
                </div>
              </div>
              {!parlayMode && stakeNum > 0 && (
                <div className="mt-1.5 text-xs text-gray-400">
                  Win: <span className="text-green-400 font-medium">${singlePayout.toFixed(2)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {legs.length > 0 && (
        <div className="border-t border-gray-700 p-4 space-y-3">
          {parlayMode && legs.length > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Combined odds</span>
              <span className={`font-bold ${combinedOdds > 0 ? "text-green-400" : "text-red-400"}`}>
                {formatOdds(combinedOdds)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="Wager amount"
              min="1"
              step="1"
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">To win</span>
            <span className="text-green-400 font-bold">
              ${parlayMode ? (parlayPayout - stakeNum).toFixed(2) : legs.length === 1 ? (calculatePayout(stakeNum, legs[0].odds) - stakeNum).toFixed(2) : "—"}
            </span>
          </div>

          {message && (
            <div className={`text-xs rounded px-2 py-1.5 ${message.type === "error" ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={submitting || !user || stakeNum <= 0}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {submitting ? "Placing..." : `Place ${parlayMode ? "Parlay" : legs.length > 1 ? `${legs.length} Bets` : "Bet"}`}
          </button>

          {!user && (
            <p className="text-xs text-gray-500 text-center">
              <a href="/login" className="text-green-400 hover:underline">Login</a> to place bets
            </p>
          )}
        </div>
      )}
    </div>
  );
}
