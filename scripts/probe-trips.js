import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function probeTrips(payload = { id: 'diag_trip_probe', cat: 'hourly' }) {
  const { data, error } = await supabase.from('trips').insert(payload).select();
  if (error) {
    console.log('Error inserting:', error.message);
    // Parse missing column if not-null constraint
    const match = error.message.match(/null value in column "([^"]+)"/);
    if (match) {
      const nextCol = match[1];
      console.log(`Adding missing not-null column: ${nextCol}`);
      if (nextCol === 'when_ts') {
        payload[nextCol] = Date.now();
      } else if (nextCol.includes('at') || nextCol.includes('date')) {
        payload[nextCol] = new Date().toISOString();
      } else if (nextCol.includes('fare') || nextCol.includes('num') || nextCol.includes('advance') || nextCol.includes('km') || nextCol.includes('hrs') || nextCol.includes('ts')) {
        payload[nextCol] = 100;
      } else {
        payload[nextCol] = 'sample';
      }
      await probeTrips(payload);
    }
  } else {
    console.log('SUCCESS! TRIPS COLUMNS ARE:');
    console.log(Object.keys(data[0]));
    await supabase.from('trips').delete().eq('id', 'diag_trip_probe');
  }
}

probeTrips().catch(console.error);
