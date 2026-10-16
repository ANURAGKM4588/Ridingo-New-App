import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testProfiles() {
  console.log('Testing profiles with phone...');
  const { data, error } = await supabase.from('profiles').insert({
    phone: '+919999999999'
  }).select();
  console.log('Insert phone result:', { data, error });
  if (data && data[0]) {
    console.log('PROFILES COLUMNS:', Object.keys(data[0]));
    await supabase.from('profiles').delete().eq('phone', '+919999999999');
  }
}

async function testTrips() {
  console.log('\nTesting trips with id...');
  const { data, error } = await supabase.from('trips').insert({
    id: 'diag_trip_probe'
  }).select();
  console.log('Insert id result:', { data, error });
  if (data && data[0]) {
    console.log('TRIPS COLUMNS:', Object.keys(data[0]));
    await supabase.from('trips').delete().eq('id', 'diag_trip_probe');
  }
}

async function run() {
  await testProfiles();
  await testTrips();
}

run().catch(console.error);
