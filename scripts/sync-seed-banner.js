import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const key = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';
const sb = createClient(url, key);

async function run() {
  const { data, error } = await sb.from('profiles').select('preferences').eq('name', 'RIDINGO_OFFER_BANNERS');
  if (error || !data?.[0]?.preferences?.banners) {
    console.error('Failed to fetch from Supabase:', error);
    process.exit(1);
  }

  const liveBanners = data[0].preferences.banners;
  console.log(`Fetched ${liveBanners.length} banners from Supabase. Top ID: ${liveBanners[0]?.id}`);

  let code = fs.readFileSync('src/services/bannerService.js', 'utf8');

  // Update LOCAL_BANNERS_KEY to v3
  code = code.replace(/export const LOCAL_BANNERS_KEY = '[^']+';/, "export const LOCAL_BANNERS_KEY = 'ridingo_offer_banners_v3';");

  // Update DEFAULT_SEED_BANNERS
  const seedString = 'export const DEFAULT_SEED_BANNERS = ' + JSON.stringify(liveBanners, null, 2) + ';';
  code = code.replace(/export const DEFAULT_SEED_BANNERS = \[[^;]+\];/s, seedString);

  fs.writeFileSync('src/services/bannerService.js', code, 'utf8');
  console.log('✅ Successfully embedded live Supabase banner as DEFAULT_SEED_BANNERS in bannerService.js');
}

run();
