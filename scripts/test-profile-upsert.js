import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testUserProfileUpsert() {
  const payload = {
    phone: '+919999900000',
    email: 'test@example.com',
    name: 'Test Member',
    preferences: {
      ridingoId: 'USR-TEST-1',
      userId: 'USR-TEST-1'
    },
    updated_at: new Date().toISOString()
  };

  console.log('Testing profiles upsert...');
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'phone' }).select();
  if (error) {
    console.log('[FAIL] Profiles upsert error:', error.message);
  } else {
    console.log('[PASS] Profiles upsert OK! Returned:', data[0]?.phone);
    await supabase.from('profiles').delete().eq('phone', '+919999900000');
    console.log('[PASS] Cleanup OK');
  }
}

testUserProfileUpsert().catch(console.error);
