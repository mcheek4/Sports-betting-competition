"use client";

import { useEffect, useState, useCallback } from "react";
import GameCard from "@/components/GameCard";
import { OddsEvent, SPORTS } from "@/lib/odds";

type Tab = "upcoming" | "live";

interface OddsResponse {
  events: OddsEvent[];
  isMock: boolean;
  requestsRemaining?: number;
  error?: string;
}

export default function GamesPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [sport, setSport] = useState("all");
  const [response, setResponse] = useState<OddsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadOdds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sport, live: String(tab === "live") });
      const res = await fetch(`/api/odds?${params}`);
      const data = await res.json();
      setResponse(data);
      setLastUpdated(new Date());
    } catch {
      setResponse({ events: [], isMock: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }, [sport, tab]);

  useEffect(() => {
    loadOdds();
  }, [loadOdds]);

  // Auto-refresh live odds every 30s
  useEffect(() => {
    if (tab !== "live") return;
    const interval = setInterval(loadOdds, 30000);
    return () => clearInterval(interval);
  }, [tab, loadOdds]);

  const events = response?.events ?? [];
  const isMock = response?.isMock ?? true;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <div className="flex items-center gap-3 mt-0.5">
            {lastUpdated && (
              <p className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
                {tab === "live" && " · auto-refreshes every 30s"}
              </p>
            )}
            {!loading && response && (
              isMock ? (
                <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded-full">
                  Demo odds — add ODDS_API_KEY for real lines
                </span>
              ) : (
                <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Live odds
                  {response.requestsRemaining != null && response.requestsRemaining >= 0 && (
                    <span className="text-green-600 ml-1">{response.requestsRemaining} calls left</span>
                  )}
                </span>
              )
            )}
            {response?.error && (
              <span className="text-xs bg-red-900/50 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                {response.error}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={loadOdds}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-800 p-1 w-fit mb-5 border border-gray-700">
        {(["upcoming", "live"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "live" ? "🔴 Live" : "📅 Upcoming"}
          </button>
        ))}
      </div>

      {/* Sport filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSport("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            sport === "all"
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white border border-gray-600"
          }`}
        >
          All Sports
        </button>
        {SPORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSport(s.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sport === s.key
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white border border-gray-600"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 h-48 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{tab === "live" ? "🔴" : "📅"}</div>
          <p className="text-gray-400 text-lg">
            {tab === "live" ? "No live games right now" : "No upcoming games found"}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {tab === "live"
              ? "Check back when games are in progress"
              : "Try a different sport or check back later"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <GameCard key={event.id} event={event} isLive={tab === "live"} />
          ))}
        </div>
      )}
    </div>
  );
}
