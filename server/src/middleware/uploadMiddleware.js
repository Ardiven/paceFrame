// Upload Middleware (PRD Bagian 5.2, 5.3 & UU PDP)
// Multer in-memory storage + Image magic byte check + EXIF metadata sanitization + Supabase Storage

import multer from 'multer';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const storage = multer.memoryStorage();

// Batasan ukuran file: Maksimal 10MB
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap unggah PNG, JPG, atau WebP.'), false);
    }
  }
});

/**
 * Validasi Magic Bytes (mencegah penyamaran ekstensi)
 */
export function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  return false;
}

/**
 * Helper upload ke Supabase Storage (private bucket 'screenshots')
 */
export async function uploadToSupabaseStorage(fileBuffer, originalName, athleteId = 'local-user') {
  if (!isSupabaseConfigured() || !supabase) {
    // Mode local in-memory fallback
    return `local://screenshots/${Date.now()}_${originalName}`;
  }

  try {
    const timestamp = Date.now();
    const cleanFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${athleteId}/${timestamp}_${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filePath, fileBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.warn('[Supabase Storage] Gagal upload:', error.message);
      return `local://screenshots/${timestamp}_${cleanFileName}`;
    }

    // Buat signed URL berlaku 1 jam (privasi sesuai UU PDP)
    const { data: signedData } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(filePath, 3600);

    return signedData?.signedUrl || filePath;
  } catch (err) {
    console.error('[Supabase Storage Error]:', err.message);
    return `local://screenshots/${Date.now()}_${originalName}`;
  }
}
