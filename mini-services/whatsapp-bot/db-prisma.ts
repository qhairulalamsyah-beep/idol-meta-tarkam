/**
 * Prisma Database Client for WhatsApp Bot
 * Connects to Supabase PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

// Helper types
export interface DbRow {
  [key: string]: unknown;
}

/**
 * Check if Prisma is connected
 */
export async function isDbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
