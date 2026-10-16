import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testCleanTripUpsert() {
  const testTripId = 'TRP_CLEAN_' + Date.now();
  const row = {
    id: testTripId,
    cat: 'hourly',
    qty: 4,
    pickup: 'Kochi Marine Drive',
    drop_loc: 'Kakkanad Infopark',
    when_ts: Date.now(),
    fare: 600,
    advance: 180,
    status: 'requested',
    driver: null,
    car: {
      brand: 'Toyota',
      model: 'Innova',
      reg: 'KL 07 CD 1234',
      distanceKm: 15.5,
      distanceText: '15.5 km',
      durationText: '35 mins',
      eta: '35 mins'
    },
    rider: {
      name: 'John Doe',
      phone: '+919876543210'
    },
    cashback: 50,
    by_who: '+919876543210'
  };

  console.log('Testing clean trip upsert...');
  const { data, error } = await supabase.from('trips').upsert(row).select();
  if (error) {
    console.log('[FAIL] Upsert error:', error.message);
  } else {
    console.log('[PASS] Upsert successful! Row ID:', data[0]?.id);
    await supabase.from('trips').delete().eq('id', testTripId);
    console.log('[PASS] Test cleanup successful!');
  }
}

testCleanTripUpsert().catch(console.error);
