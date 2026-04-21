import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculatePayout, combineParlayOdds } from "@/lib/odds";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "all"; // "straight" | "parlay" | "all"
  const status = searchParams.get("status"); // "pending" | "won" | "lost" etc

  const whereClause = status ? { userId: session.userId, status } : { userId: session.userId };

  if (type === "parlay") {
    const parlays = await prisma.parlay.findMany({
      where: whereClause,
      include: { legs: { include: { bet: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(parlays);
  }

  if (type === "straight") {
    const bets = await prisma.bet.findMany({
      where: { ...whereClause, parlayLeg: null },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bets);
  }

  const [bets, parlays] = await Promise.all([
    prisma.bet.findMany({
      where: { ...whereClause, parlayLeg: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parlay.findMany({
      where: whereClause,
      include: { legs: { include: { bet: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ bets, parlays });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, stake, legs } = body;

    if (!stake || stake <= 0) {
      return NextResponse.json({ error: "Invalid stake" }, { status: 400 });
    }
    if (!legs || !Array.isArray(legs) || legs.length === 0) {
      return NextResponse.json({ error: "No bet selections" }, { status: 400 });
    }
    if (type === "parlay" && legs.length < 2) {
      return NextResponse.json({ error: "Parlays require at least 2 legs" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.balance < stake) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    for (const leg of legs) {
      if (!leg.eventId || !leg.betType || !leg.selection || leg.odds == null) {
        return NextResponse.json({ error: "Invalid bet leg data" }, { status: 400 });
      }
    }

    if (type === "parlay") {
      const allOdds = legs.map((l: { odds: number }) => l.odds);
      const combinedOdds = combineParlayOdds(allOdds);
      const potentialPayout = calculatePayout(stake, combinedOdds);

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: session.userId },
          data: { balance: { decrement: stake } },
        });

        const createdBets = await Promise.all(
          legs.map((leg: BetLeg) =>
            tx.bet.create({
              data: {
                userId: session.userId,
                eventId: leg.eventId,
                sport: leg.sport,
                homeTeam: leg.homeTeam,
                awayTeam: leg.awayTeam,
                commenceTime: new Date(leg.commenceTime),
                betType: leg.betType,
                selection: leg.selection,
                line: leg.line ?? null,
                odds: leg.odds,
                stake: 0,
                potentialPayout: 0,
                isLive: leg.isLive ?? false,
              },
            })
          )
        );

        const parlay = await tx.parlay.create({
          data: {
            userId: session.userId,
            combinedOdds,
            stake,
            potentialPayout,
            legs: {
              create: createdBets.map((bet) => ({ betId: bet.id })),
            },
          },
          include: { legs: { include: { bet: true } } },
        });

        return parlay;
      });

      return NextResponse.json(result, { status: 201 });
    }

    // Straight bet
    const leg = legs[0] as BetLeg;
    const potentialPayout = calculatePayout(stake, leg.odds);

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.userId },
        data: { balance: { decrement: stake } },
      });

      return tx.bet.create({
        data: {
          userId: session.userId,
          eventId: leg.eventId,
          sport: leg.sport,
          homeTeam: leg.homeTeam,
          awayTeam: leg.awayTeam,
          commenceTime: new Date(leg.commenceTime),
          betType: leg.betType,
          selection: leg.selection,
          line: leg.line ?? null,
          odds: leg.odds,
          stake,
          potentialPayout,
          isLive: leg.isLive ?? false,
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface BetLeg {
  eventId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  betType: string;
  selection: string;
  line?: number;
  odds: number;
  isLive?: boolean;
}
