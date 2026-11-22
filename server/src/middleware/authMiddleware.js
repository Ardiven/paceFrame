// Authentication Middleware (PRD Bagian 6.2)
// Mendukung Supabase Auth JWT dan Single-User Bypass Mode

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export const authMiddleware = async (req, res, next) => {
  // Mode Single-User / Local Personal Use: default diizinkan
  const isSingleUser = process.env.SINGLE_USER_MODE !== 'false';

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isSingleUser) {
      req.user = {
        id: process.env.SINGLE_USER_ATHLETE_ID || 'local-user',
        email: 'victor@paceframe.local',
        role: 'authenticated'
      };
      return next();
    }
    return res.status(401).json({ error: 'Akses ditolak: Token autentikasi tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];

  if (!isSupabaseConfigured() || !supabase) {
    req.user = {
      id: process.env.SINGLE_USER_ATHLETE_ID || 'local-user',
      email: 'victor@paceframe.local',
      role: 'authenticated'
    };
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      if (isSingleUser) {
        req.user = {
          id: process.env.SINGLE_USER_ATHLETE_ID || 'local-user',
          email: 'victor@paceframe.local',
          role: 'authenticated'
        };
        return next();
      }
      return res.status(401).json({ error: 'Sesi kedaluwarsa atau tidak valid: ' + (error?.message || '') });
    }

    req.user = user;
    next();
  } catch (err) {
    if (isSingleUser) {
      req.user = { id: 'local-user', email: 'victor@paceframe.local' };
      return next();
    }
    return res.status(500).json({ error: 'Gagal memverifikasi identitas pengguna' });
  }
};
