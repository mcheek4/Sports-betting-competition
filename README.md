# PropShop — Play Money Sports Betting

Compete with friends using **$10,000 in play money** on NFL, NBA, MLB, NHL, College Football, and MLS games. Real odds pulled from DraftKings, FanDuel, BetMGM, and Caesars via [The Odds API](https://the-odds-api.com).

## Features

- **$10K starting balance** for every user
- **Pre-game and live betting** on 6 sports
- **Straight bets**: moneyline, spread, over/under
- **Parlays**: combine 2+ legs for bigger payouts
- **Leaderboard**: see who's up and who's down
- **Auto-settle**: fetch completed game scores and settle pending bets
- **Mock data mode**: works without an Odds API key (great for dev)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 3. Run database migrations
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Getting Real Odds

1. Sign up at [the-odds-api.com](https://the-odds-api.com) (free tier: 500 requests/month)
2. Add your key to `.env`:
   ```
   ODDS_API_KEY=your_key_here
   ```
3. Without a key, mock odds are shown so the UI is always functional

## Settling Bets

Bets stay in `pending` status until settled. Two ways to settle:

- **Auto-settle**: Click "Auto-settle from scores" on the My Bets page — fetches completed game scores and resolves all your pending bets automatically
- **Manual**: Use `POST /api/bets/settle` with `{ betId, result: "won"|"lost"|"push"|"void" }`

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + SQLite (no external database needed)
- **Tailwind CSS v4**
- **jose** for JWT session management
- **bcryptjs** for password hashing
- **The Odds API** for live odds

## Sports Supported

| Sport | Key |
|-------|-----|
| NFL | `americanfootball_nfl` |
| College Football | `americanfootball_ncaaf` |
| NBA | `basketball_nba` |
| MLB | `baseball_mlb` |
| NHL | `icehockey_nhl` |
| MLS | `soccer_usa_mls` |
