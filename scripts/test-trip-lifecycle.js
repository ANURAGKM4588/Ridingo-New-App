import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testTripLifecycle() {
  const tripId = 'TRP_LIFE_' + Date.now();
  // 1. Insert
  const { error: insErr } = await supabase.from('trips').insert({
    id: tripId,
    cat: 'hourly',
    pickup: 'MG Road Kochi',
    drop_loc: 'Airport',
    when_ts: Date.now(),
    fare: 1200,
    advance: 360,
    status: 'requested',
    driver: null,
    car: { brand: 'Honda', model: 'City' },
    rider: { name: 'Alice', phone: '+919876543210' }
  });
  console.log('1. Insert requested:', insErr ? insErr.message : 'OK');

  // 2. Driver Accepts
  const { error: updErr1 } = await supabase.from('trips').update({
    status: 'accepted',
    driver: { id: 'ravi_1', name: 'Ravi Kumar', phone: '+919840122222' },
    updated_at: new Date().toISOString()
  }).eq('id', tripId);
  console.log('2. Update accepted:', updErr1 ? updErr1.message : 'OK');

  // 3. Driver Arrives
  const { error: updErr2 } = await supabase.from('trips').update({
    status: 'pickup_arrived',
    updated_at: new Date().toISOString()
  }).eq('id', tripId);
  console.log('3. Update pickup_arrived:', updErr2 ? updErr2.message : 'OK');

  // 4. Trip In Progress
  const { error: updErr3 } = await supabase.from('trips').update({
    status: 'inprogress',
    updated_at: new Date().toISOString()
  }).eq('id', tripId);
  console.log('4. Update inprogress:', updErr3 ? updErr3.message : 'OK');

  // 5. Trip Completed
  const { error: updErr4 } = await supabase.from('trips').update({
    status: 'completed',
    done_ts: Date.now(),
    updated_at: new Date().toISOString()
  }).eq('id', tripId);
  console.log('5. Update completed:', updErr4 ? updErr4.message : 'OK');

  // Cleanup
  await supabase.from('trips').delete().eq('id', tripId);
  console.log('6. Cleanup:', 'OK');
}

testTripLifecycle().catch(console.error);
