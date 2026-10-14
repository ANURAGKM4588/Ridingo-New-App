import { createClient } from '@supabase/supabase-js';

// Live Supabase Production Endpoint & Anon Key (Guaranteed never fallback to localhost)
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://xxmcjgonsxpjrgdxchwl.supabase.co';

export const SUPABASE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY)) ||
  'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});
