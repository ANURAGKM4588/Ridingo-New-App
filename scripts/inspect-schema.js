import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectSchema() {
  console.log('--- Inspecting trips table schema ---');
  const { data: tripData, error: tripErr } = await supabase.from('trips').select('*').limit(1);
  if (tripErr) console.log('trips select error:', tripErr);
  else console.log('trips sample data:', tripData);

  console.log('--- Inspecting profiles table schema ---');
  const { data: profData, error: profErr } = await supabase.from('profiles').select('*').limit(1);
  if (profErr) console.log('profiles select error:', profErr);
  else console.log('profiles sample data:', profData);

  // Check with OpenAPI definition to see all table columns
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/openapi+json'
      }
    });
    const spec = await res.json();
    console.log('\n--- OpenAPI Definitions Found in Supabase ---');
    if (spec.definitions) {
      for (const [name, def] of Object.entries(spec.definitions)) {
        console.log(`\nTable: "${name}"`);
        console.log('Columns:');
        for (const [colName, colProps] of Object.entries(def.properties || {})) {
          console.log(`  - ${colName} (${colProps.type || colProps.format || 'unknown'})`);
        }
      }
    } else {
      console.log('Spec keys:', Object.keys(spec), spec.message || '');
    }
  } catch (e) {
    console.error('Failed to fetch OpenAPI spec:', e.message);
  }
}

inspectSchema().catch(console.error);
