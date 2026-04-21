"use client";

import { OddsEvent, getEventMarkets } from "@/lib/odds";
import { useBetSlip } from "@/context/BetSlipContext";
import { SPORTS } from "@/lib/odds";

interface GameCardProps {
  event: OddsEvent & { _sportLabel?: string; _sportIcon?: string };
  isLive?: boolean;
}

function formatOdds(o: number | null) {
  if (o === null) return "—";
  return o > 0 ? `+${o}` : `${o}`;
}

function formatLine(point: number) {
  return point > 0 ? `+${point}` : `${point}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function GameCard({ event, isLive = false }: GameCardProps) {
  const { addLeg } = useBetSlip();
  const markets = getEventMarkets(event);
  const sportInfo = SPORTS.find((s) => s.key === event.sport_key);
  const sportIcon = event._sportIcon ?? sportInfo?.icon ?? "🏅";
  const sportLabel = event._sportLabel ?? sportInfo?.label ?? event.sport_title;

  const addBet = (
    betType: "moneyline" | "spread" | "total",
    selection: string,
    odds: number,
    line?: number,
    label?: string
  ) => {
    addLeg({
      eventId: event.id,
      sport: event.sport_key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: event.commence_time,
      betType,
      selection,
      odds,
      line,
      isLive,
      label: label ?? `${selection} ${betType}`,
    });
  };

  const btnClass = (odds: number | null) =>
    `flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
      odds === null
        ? "border-gray-700 text-gray-600 cursor-not-allowed"
        : "border-gray-600 hover:border-green-500 hover:bg-green-900/20 text-white active:scale-95"
    }`;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-750 border-b border-gray-700">
        <span className="text-xs text-gray-400">
          {sportIcon} {sportLabel}
        </span>
        <div className="flex items-center gap-2">
          {isLive && <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />LIVE</span>}
          <span className="text-xs text-gray-500">{formatTime(event.commence_time)}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <div className="space-y-1.5">
            <div className="font-semibold text-white">{event.away_team}</div>
            <div className="font-semibold text-white">@ {event.home_team}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center text-xs text-gray-400 mb-1">Moneyline</div>
          <div className="text-center text-xs text-gray-400 mb-1">Spread</div>
          <div className="text-center text-xs text-gray-400 mb-1">Total</div>

          {/* Away row */}
          <button
            disabled={markets.moneyline.away === null}
            onClick={() => markets.moneyline.away !== null && addBet("moneyline", event.away_team, markets.moneyline.away, undefined, `${event.away_team} ML`)}
            className={btnClass(markets.moneyline.away)}
          >
            <span className={markets.moneyline.away && markets.moneyline.away > 0 ? "text-green-400" : "text-red-400"}>
              {formatOdds(markets.moneyline.away)}
            </span>
          </button>
          <button
            disabled={markets.spread.away === null}
            onClick={() => markets.spread.away !== null && addBet("spread", event.away_team, markets.spread.away.odds, markets.spread.away.point, `${event.away_team} ${formatLine(markets.spread.away.point)}`)}
            className={btnClass(markets.spread.away?.odds ?? null)}
          >
            {markets.spread.away ? (
              <>
                <span className="text-gray-300">{formatLine(markets.spread.away.point)}</span>
                <span className="text-gray-400">{formatOdds(markets.spread.away.odds)}</span>
              </>
            ) : "—"}
          </button>
          <button
            disabled={markets.total.over === null}
            onClick={() => markets.total.over !== null && addBet("total", "Over", markets.total.over.odds, markets.total.over.point, `Over ${markets.total.over.point}`)}
            className={btnClass(markets.total.over?.odds ?? null)}
          >
            {markets.total.over ? (
              <>
                <span className="text-gray-300">O {markets.total.over.point}</span>
                <span className="text-gray-400">{formatOdds(markets.total.over.odds)}</span>
              </>
            ) : "—"}
          </button>

          {/* Home row */}
          <button
            disabled={markets.moneyline.home === null}
            onClick={() => markets.moneyline.home !== null && addBet("moneyline", event.home_team, markets.moneyline.home, undefined, `${event.home_team} ML`)}
            className={btnClass(markets.moneyline.home)}
          >
            <span className={markets.moneyline.home && markets.moneyline.home > 0 ? "text-green-400" : "text-red-400"}>
              {formatOdds(markets.moneyline.home)}
            </span>
          </button>
          <button
            disabled={markets.spread.home === null}
            onClick={() => markets.spread.home !== null && addBet("spread", event.home_team, markets.spread.home.odds, markets.spread.home.point, `${event.home_team} ${formatLine(markets.spread.home.point)}`)}
            className={btnClass(markets.spread.home?.odds ?? null)}
          >
            {markets.spread.home ? (
              <>
                <span className="text-gray-300">{formatLine(markets.spread.home.point)}</span>
                <span className="text-gray-400">{formatOdds(markets.spread.home.odds)}</span>
              </>
            ) : "—"}
          </button>
          <button
            disabled={markets.total.under === null}
            onClick={() => markets.total.under !== null && addBet("total", "Under", markets.total.under.odds, markets.total.under.point, `Under ${markets.total.under.point}`)}
            className={btnClass(markets.total.under?.odds ?? null)}
          >
            {markets.total.under ? (
              <>
                <span className="text-gray-300">U {markets.total.under.point}</span>
                <span className="text-gray-400">{formatOdds(markets.total.under.odds)}</span>
              </>
            ) : "—"}
          </button>
        </div>
      </div>
    </div>
  );
}
