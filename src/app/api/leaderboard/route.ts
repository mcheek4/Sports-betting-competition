import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      balance: true,
      createdAt: true,
      bets: {
        select: {
          status: true,
          stake: true,
          potentialPayout: true,
        },
      },
      parlays: {
        select: {
          status: true,
          stake: true,
          potentialPayout: true,
        },
      },
    },
    orderBy: { balance: "desc" },
  });

  const leaderboard = users.map((user) => {
    const allBets = [
      ...user.bets.map((b) => ({ status: b.status, stake: b.stake, payout: b.potentialPayout })),
      ...user.parlays.map((p) => ({ status: p.status, stake: p.stake, payout: p.potentialPayout })),
    ];

    const totalBets = allBets.length;
    const won = allBets.filter((b) => b.status === "won").length;
    const winRate = totalBets > 0 ? Math.round((won / totalBets) * 100) : 0;
    const profit = user.balance - 10000;

    return {
      id: user.id,
      username: user.username,
      balance: user.balance,
      profit,
      totalBets,
      won,
      winRate,
    };
  });

  return NextResponse.json(leaderboard);
}
