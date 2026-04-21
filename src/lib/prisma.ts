import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl = `file:${path.resolve(process.cwd(), "dev.db")}`;

function createPrismaClient() {
  const factory = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter: factory });
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
