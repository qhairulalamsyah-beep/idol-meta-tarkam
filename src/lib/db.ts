import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { getConfig } from '@/lib/config'
import { dbLogger } from '@/lib/logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton — supports:
 * - PostgreSQL (Supabase, Neon, etc.) for production
 * - Local SQLite for development (fallback)
 * 
 * Configuration is loaded from environment variables via config module.
 * No hardcoded connection strings.
 */

function createPrismaClient(): PrismaClient {
  const config = getConfig()
  const isPostgreSQL = config.database.isPostgreSQL
  
  dbLogger.info('Initializing database connection', {
    type: isPostgreSQL ? 'PostgreSQL' : 'SQLite',
    environment: config.env,
  })
  
  // Configure logging based on environment
  const logLevels: Prisma.LogLevel[] = config.app.isDevelopment 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error']
  
  return new PrismaClient({
    log: logLevels.map((level) => ({
      emit: 'event',
      level,
    })),
  })
}

// Initialize or reuse existing client
let prismaClient: PrismaClient

if (!globalForPrisma.prisma) {
  prismaClient = createPrismaClient()
  globalForPrisma.prisma = prismaClient
  
  // Setup query logging for development
  if (getConfig().app.isDevelopment) {
    prismaClient.$on('query', (e: Prisma.QueryEvent) => {
      dbLogger.debug('Query executed', {
        query: e.query,
        duration: e.duration,
        params: e.params,
      })
    })
  }
  
  // Log errors
  prismaClient.$on('error', (e: Prisma.LogEvent) => {
    dbLogger.error('Prisma error', new Error(e.message))
  })
  
  dbLogger.info('Database client initialized successfully')
} else {
  prismaClient = globalForPrisma.prisma
}

export const db = prismaClient

// Type export for convenience
export type PrismaTransactionClient = Prisma.TransactionClient

// Graceful shutdown helper
export async function disconnectDb(): Promise<void> {
  try {
    await db.$disconnect()
    dbLogger.info('Database connection closed')
  } catch (error) {
    dbLogger.error('Failed to close database connection', error)
    throw error
  }
}
