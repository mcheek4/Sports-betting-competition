import { NextRequest, NextResponse } from "next/server";
import { fetchOdds, SPORTS } from "@/lib/odds";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") ?? "all";
  const isLive = searchParams.get("live") === "true";

  try {
    if (sport === "all") {
      const results = await Promise.all(
        SPORTS.map((s) => fetchOdds(s.key, isLive).then(({ events }) =>
          events.map((e) => ({ ...e, sport_key: s.key, _sportLabel: s.label, _sportIcon: s.icon }))
        ))
      );
      const allEvents = results.flat().sort(
        (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
      );
      // isMock is true only if ALL results are mock (no key set)
      const isMock = !process.env.ODDS_API_KEY || process.env.ODDS_API_KEY === "YOUR_ODDS_API_KEY_HERE";
      return NextResponse.json({ events: allEvents, isMock });
    }

    const validSport = SPORTS.find((s) => s.key === sport);
    if (!validSport) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 });
    }

    const result = await fetchOdds(sport, isLive);
    return NextResponse.json({ events: result.events, isMock: result.isMock, requestsRemaining: result.requestsRemaining, error: result.error });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch odds" }, { status: 500 });
  }
}
