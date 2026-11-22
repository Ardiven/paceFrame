// Singleton Prisma Client
// Falls back gracefully if DATABASE_URL is not set (in-memory mode)

import { isSupabaseConfigured } from '../../config/supabase.js';

let prisma = null;

export async function getPrismaClient() {
  if (prisma) return prisma;

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    await prisma.$connect();
    console.log('⚡ Prisma Client connected to Supabase DB.');
    return prisma;
  } catch (err) {
    console.warn('[Prisma] Koneksi gagal, fallback ke in-memory mode:', err.message);
    return null;
  }
}

export function getPrismaSync() {
  return prisma;
}
