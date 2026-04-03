import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton — supports:
 * - PostgreSQL (Supabase, Neon, etc.) for production
 * - Local SQLite for development (fallback)
 *
 * Set DATABASE_URL for PostgreSQL connection
 * Set DIRECT_DATABASE_URL for direct connection (migrations)
 */

function createPrismaClient(): PrismaClient {
  // PostgreSQL path (production - Supabase, Neon, etc.)
  if (process.env.DATABASE_URL?.startsWith('postgresql://')) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });
  }

  // Local SQLite fallback (development)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Type export for convenience
export type PrismaTransactionClient = Prisma.TransactionClient;
