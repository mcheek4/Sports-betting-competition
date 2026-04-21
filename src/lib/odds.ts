export const SPORTS = [
  { key: "americanfootball_nfl", label: "NFL", icon: "🏈" },
  { key: "americanfootball_ncaaf", label: "College Football", icon: "🏈" },
  { key: "basketball_nba", label: "NBA", icon: "🏀" },
  { key: "baseball_mlb", label: "MLB", icon: "⚾" },
  { key: "icehockey_nhl", label: "NHL", icon: "🏒" },
  { key: "soccer_usa_mls", label: "MLS", icon: "⚽" },
] as const;

export type SportKey = (typeof SPORTS)[number]["key"];

const BASE_URL = "https://api.the-odds-api.com/v4";

export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed?: boolean;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface ScoreEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
  last_update: string | null;
}

const PREFERRED_BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus"];

export function getBestOdds(event: OddsEvent, market: string, outcomeName: string): number | null {
  let best: number | null = null;
  for (const book of event.bookmakers) {
    if (!PREFERRED_BOOKS.includes(book.key)) continue;
    const mkt = book.markets.find((m) => m.key === market);
    if (!mkt) continue;
    const outcome = mkt.outcomes.find((o) => o.name === outcomeName);
    if (!outcome) continue;
    if (best === null || outcome.price > best) best = outcome.price;
  }
  return best;
}

export function getEventMarkets(event: OddsEvent): {
  moneyline: { home: number | null; away: number | null };
  spread: { home: { odds: number; point: number } | null; away: { odds: number; point: number } | null };
  total: { over: { odds: number; point: number } | null; under: { odds: number; point: number } | null };
} {
  const getOutcome = (marketKey: string, name: string) => {
    for (const book of event.bookmakers) {
      if (!PREFERRED_BOOKS.includes(book.key)) continue;
      const mkt = book.markets.find((m) => m.key === marketKey);
      if (!mkt) continue;
      const o = mkt.outcomes.find((out) => out.name === name);
      if (o) return o;
    }
    return null;
  };

  const homeML = getOutcome("h2h", event.home_team);
  const awayML = getOutcome("h2h", event.away_team);
  const homeSpread = getOutcome("spreads", event.home_team);
  const awaySpread = getOutcome("spreads", event.away_team);
  const over = getOutcome("totals", "Over");
  const under = getOutcome("totals", "Under");

  return {
    moneyline: {
      home: homeML?.price ?? null,
      away: awayML?.price ?? null,
    },
    spread: {
      home: homeSpread ? { odds: homeSpread.price, point: homeSpread.point! } : null,
      away: awaySpread ? { odds: awaySpread.price, point: awaySpread.point! } : null,
    },
    total: {
      over: over ? { odds: over.price, point: over.point! } : null,
      under: under ? { odds: under.price, point: under.point! } : null,
    },
  };
}

export async function fetchOdds(sport: string, isLive = false): Promise<OddsEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey || apiKey === "YOUR_ODDS_API_KEY_HERE") {
    return getMockOdds(sport);
  }

  const eventStatus = isLive ? "inprogress" : "upcoming";
  const url = `${BASE_URL}/sports/${sport}/odds?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&eventStatus=${eventStatus}&bookmakers=draftkings,fanduel,betmgm,caesars,pointsbetus`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchScores(sport: string): Promise<ScoreEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey || apiKey === "YOUR_ODDS_API_KEY_HERE") return [];

  const url = `${BASE_URL}/sports/${sport}/scores?apiKey=${apiKey}&daysFrom=3`;
  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function getMockOdds(sport: string): OddsEvent[] {
  const sportLabel = SPORTS.find((s) => s.key === sport)?.label ?? sport;
  const now = new Date();
  const future1 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const future2 = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();
  const future3 = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const mockGames: Record<string, [string, string][]> = {
    americanfootball_nfl: [
      ["Kansas City Chiefs", "Buffalo Bills"],
      ["San Francisco 49ers", "Dallas Cowboys"],
      ["Philadelphia Eagles", "Baltimore Ravens"],
    ],
    americanfootball_ncaaf: [
      ["Alabama Crimson Tide", "Georgia Bulldogs"],
      ["Ohio State Buckeyes", "Michigan Wolverines"],
      ["Texas Longhorns", "Oklahoma Sooners"],
    ],
    basketball_nba: [
      ["Boston Celtics", "Golden State Warriors"],
      ["Los Angeles Lakers", "Miami Heat"],
      ["Denver Nuggets", "Milwaukee Bucks"],
    ],
    baseball_mlb: [
      ["New York Yankees", "Los Angeles Dodgers"],
      ["Houston Astros", "Atlanta Braves"],
      ["Chicago Cubs", "New York Mets"],
    ],
    icehockey_nhl: [
      ["Colorado Avalanche", "Tampa Bay Lightning"],
      ["Toronto Maple Leafs", "Boston Bruins"],
      ["Vegas Golden Knights", "Edmonton Oilers"],
    ],
    soccer_usa_mls: [
      ["LA Galaxy", "LAFC"],
      ["Seattle Sounders", "Portland Timbers"],
      ["Atlanta United", "Inter Miami"],
    ],
  };

  const games = mockGames[sport] ?? [["Home Team", "Away Team"]];
  const times = [future1, future2, future3];

  return games.map(([home, away], i) => ({
    id: `mock-${sport}-${i}`,
    sport_key: sport,
    sport_title: sportLabel,
    commence_time: times[i % times.length],
    completed: false,
    home_team: home,
    away_team: away,
    bookmakers: [
      {
        key: "draftkings",
        title: "DraftKings",
        markets: [
          {
            key: "h2h",
            last_update: now.toISOString(),
            outcomes: [
              { name: home, price: -130 + i * 20 },
              { name: away, price: +110 - i * 10 },
            ],
          },
          {
            key: "spreads",
            last_update: now.toISOString(),
            outcomes: [
              { name: home, price: -110, point: -3.5 + i },
              { name: away, price: -110, point: 3.5 - i },
            ],
          },
          {
            key: "totals",
            last_update: now.toISOString(),
            outcomes: [
              { name: "Over", price: -110, point: 47.5 + i * 2 },
              { name: "Under", price: -110, point: 47.5 + i * 2 },
            ],
          },
        ],
      },
    ],
  }));
}

export function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

export function calculatePayout(stake: number, americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return parseFloat((stake * decimal).toFixed(2));
}

export function combineParlayOdds(odds: number[]): number {
  const combined = odds.reduce((acc, o) => acc * americanToDecimal(o), 1);
  const american = combined >= 2 ? Math.round((combined - 1) * 100) : Math.round(-100 / (combined - 1));
  return american;
}
