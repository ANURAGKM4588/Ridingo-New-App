import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function probeColumns() {
  console.log('--- Probing trips table ---');
  // Try inserting an empty object to see what column error or constraint fails
  const { error: tripErr } = await supabase.from('trips').insert({});
  console.log('Insert {} into trips error:', tripErr?.message || tripErr);

  console.log('\n--- Probing profiles table ---');
  const { error: profErr } = await supabase.from('profiles').insert({});
  console.log('Insert {} into profiles error:', profErr?.message || profErr);
}

probeColumns().catch(console.error);
