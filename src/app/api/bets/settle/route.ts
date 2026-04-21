import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchScores, SPORTS } from "@/lib/odds";

// Manually settle a bet result (admin-like, or auto from scores)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { betId, parlayId, result } = await req.json();
  if (!result || !["won", "lost", "push", "void"].includes(result)) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  if (betId) {
    const bet = await prisma.bet.findUnique({ where: { id: betId }, include: { user: true } });
    if (!bet || bet.userId !== session.userId) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }
    if (bet.status !== "pending") {
      return NextResponse.json({ error: "Bet already settled" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.bet.update({
        where: { id: betId },
        data: { status: result, settledAt: new Date() },
      });

      if (result === "won") {
        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: { increment: bet.potentialPayout } },
        });
      } else if (result === "push" || result === "void") {
        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: { increment: bet.stake } },
        });
      }
    });

    return NextResponse.json({ ok: true });
  }

  if (parlayId) {
    const parlay = await prisma.parlay.findUnique({
      where: { id: parlayId },
      include: { legs: { include: { bet: true } }, user: true },
    });
    if (!parlay || parlay.userId !== session.userId) {
      return NextResponse.json({ error: "Parlay not found" }, { status: 404 });
    }
    if (parlay.status !== "pending") {
      return NextResponse.json({ error: "Parlay already settled" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.parlay.update({
        where: { id: parlayId },
        data: { status: result, settledAt: new Date() },
      });
      await Promise.all(
        parlay.legs.map((leg) =>
          tx.bet.update({
            where: { id: leg.betId },
            data: { status: result, settledAt: new Date() },
          })
        )
      );

      if (result === "won") {
        await tx.user.update({
          where: { id: parlay.userId },
          data: { balance: { increment: parlay.potentialPayout } },
        });
      } else if (result === "push" || result === "void") {
        await tx.user.update({
          where: { id: parlay.userId },
          data: { balance: { increment: parlay.stake } },
        });
      }
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "betId or parlayId required" }, { status: 400 });
}

// Auto-settle from scores API
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settled: string[] = [];

  for (const sport of SPORTS) {
    const scores = await fetchScores(sport.key);
    const completedGames = scores.filter((s) => s.completed && s.scores);

    for (const game of completedGames) {
      const pendingBets = await prisma.bet.findMany({
        where: { eventId: game.id, status: "pending", userId: session.userId },
      });

      if (pendingBets.length === 0) continue;

      const homeScore = game.scores?.find((s) => s.name === game.home_team);
      const awayScore = game.scores?.find((s) => s.name === game.away_team);
      if (!homeScore || !awayScore) continue;

      const homePoints = parseFloat(homeScore.score);
      const awayPoints = parseFloat(awayScore.score);

      for (const bet of pendingBets) {
        let result: "won" | "lost" | "push" = "lost";

        if (bet.betType === "moneyline") {
          const winner = homePoints > awayPoints ? game.home_team : awayPoints > homePoints ? game.away_team : null;
          if (!winner) result = "push";
          else result = bet.selection === winner ? "won" : "lost";
        } else if (bet.betType === "spread" && bet.line != null) {
          const adjustedHome = homePoints + bet.line;
          if (bet.selection === game.home_team) {
            result = adjustedHome > awayPoints ? "won" : adjustedHome === awayPoints ? "push" : "lost";
          } else {
            const adjustedAway = awayPoints - bet.line;
            result = adjustedAway > homePoints ? "won" : adjustedAway === homePoints ? "push" : "lost";
          }
        } else if (bet.betType === "total" && bet.line != null) {
          const total = homePoints + awayPoints;
          if (total === bet.line) result = "push";
          else if (bet.selection === "Over") result = total > bet.line ? "won" : "lost";
          else result = total < bet.line ? "won" : "lost";
        }

        await prisma.$transaction(async (tx) => {
          await tx.bet.update({ where: { id: bet.id }, data: { status: result, settledAt: new Date() } });
          if (result === "won") {
            await tx.user.update({ where: { id: bet.userId }, data: { balance: { increment: bet.potentialPayout } } });
          } else if (result === "push") {
            await tx.user.update({ where: { id: bet.userId }, data: { balance: { increment: bet.stake } } });
          }
        });

        settled.push(bet.id);
      }
    }
  }

  return NextResponse.json({ settled, count: settled.length });
}
