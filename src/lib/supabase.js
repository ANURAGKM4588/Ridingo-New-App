import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
