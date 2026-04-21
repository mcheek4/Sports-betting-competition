import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Cash out value: stake + 50% of potential profit
function cashOutValue(stake: number, potentialPayout: number): number {
  const profit = potentialPayout - stake;
  return parseFloat((stake + profit * 0.5).toFixed(2));
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, betId, parlayId } = await req.json();

  if (!action || !["cancel", "cashout"].includes(action)) {
    return NextResponse.json({ error: "action must be 'cancel' or 'cashout'" }, { status: 400 });
  }
  if (!betId && !parlayId) {
    return NextResponse.json({ error: "betId or parlayId required" }, { status: 400 });
  }

  // --- Straight bet ---
  if (betId) {
    const bet = await prisma.bet.findUnique({ where: { id: betId } });
    if (!bet || bet.userId !== session.userId) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }
    if (bet.status !== "pending") {
      return NextResponse.json({ error: "Bet is already settled" }, { status: 400 });
    }

    const now = new Date();
    const gameStarted = new Date(bet.commenceTime) <= now;

    if (action === "cancel") {
      if (gameStarted) {
        return NextResponse.json({ error: "Game has already started — use Cash Out instead" }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.bet.update({ where: { id: betId }, data: { status: "void", settledAt: now } });
        await tx.user.update({ where: { id: session.userId }, data: { balance: { increment: bet.stake } } });
      });
      return NextResponse.json({ ok: true, refund: bet.stake, action: "cancel" });
    }

    if (action === "cashout") {
      if (!gameStarted) {
        return NextResponse.json({ error: "Game hasn't started yet — use Cancel instead" }, { status: 400 });
      }
      const payout = cashOutValue(bet.stake, bet.potentialPayout);
      await prisma.$transaction(async (tx) => {
        await tx.bet.update({ where: { id: betId }, data: { status: "won", settledAt: now } });
        await tx.user.update({ where: { id: session.userId }, data: { balance: { increment: payout } } });
      });
      return NextResponse.json({ ok: true, payout, action: "cashout" });
    }
  }

  // --- Parlay ---
  if (parlayId) {
    const parlay = await prisma.parlay.findUnique({
      where: { id: parlayId },
      include: { legs: { include: { bet: true } } },
    });
    if (!parlay || parlay.userId !== session.userId) {
      return NextResponse.json({ error: "Parlay not found" }, { status: 404 });
    }
    if (parlay.status !== "pending") {
      return NextResponse.json({ error: "Parlay is already settled" }, { status: 400 });
    }

    const now = new Date();
    // Parlay is "started" if any leg's game has begun
    const anyStarted = parlay.legs.some((l) => new Date(l.bet.commenceTime) <= now);

    if (action === "cancel") {
      if (anyStarted) {
        return NextResponse.json({ error: "At least one game has started — use Cash Out instead" }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.parlay.update({ where: { id: parlayId }, data: { status: "void", settledAt: now } });
        await Promise.all(parlay.legs.map((l) =>
          tx.bet.update({ where: { id: l.betId }, data: { status: "void", settledAt: now } })
        ));
        await tx.user.update({ where: { id: session.userId }, data: { balance: { increment: parlay.stake } } });
      });
      return NextResponse.json({ ok: true, refund: parlay.stake, action: "cancel" });
    }

    if (action === "cashout") {
      if (!anyStarted) {
        return NextResponse.json({ error: "No games have started yet — use Cancel for a full refund" }, { status: 400 });
      }
      const payout = cashOutValue(parlay.stake, parlay.potentialPayout);
      await prisma.$transaction(async (tx) => {
        await tx.parlay.update({ where: { id: parlayId }, data: { status: "won", settledAt: now } });
        await Promise.all(parlay.legs.map((l) =>
          tx.bet.update({ where: { id: l.betId }, data: { status: "won", settledAt: now } })
        ));
        await tx.user.update({ where: { id: session.userId }, data: { balance: { increment: payout } } });
      });
      return NextResponse.json({ ok: true, payout, action: "cashout" });
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
