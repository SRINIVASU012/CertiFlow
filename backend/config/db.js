import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient({
      log: process.env.PRISMA_LOG === 'true' ? ['query', 'info', 'warn', 'error'] : ['error', 'warn']
    });
  }
  prisma = global.cachedPrisma;
}

export default prisma;
