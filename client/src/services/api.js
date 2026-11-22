// API Helper — PaceFrame AI
// Auto-injects Authorization header jika session Supabase aktif

/**
 * apiFetch: Wrapper fetch yang menambahkan Bearer token jika session tersedia
 * @param {string} url - Endpoint URL relatif (mis. '/api/schedules')
 * @param {RequestInit} options - Fetch options (method, body, headers, dll)
 * @param {object|null} session - Supabase session object (atau null)
 */
export async function apiFetch(url, options = {}, session = null) {
  const headers = {
    ...(options.headers || {}),
  };

  // Tambahkan Content-Type JSON secara default kecuali multipart
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject Bearer token jika session valid
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
