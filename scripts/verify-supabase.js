import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runDiagnostics() {
  console.log('====================================================');
  console.log(' SUPABASE DATABASE & REALTIME DIAGNOSTIC SUITE');
  console.log(' Target URL:', SUPABASE_URL);
  console.log('====================================================\n');

  const report = {
    connectivity: false,
    tables: {},
    realtime: false,
    issues: [],
    recommendations: []
  };

  // 1. Basic Health & Connectivity
  const startTime = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    const pingMs = Date.now() - startTime;
    if (res.ok) {
      report.connectivity = true;
      console.log(`[PASS] Supabase REST API reached successfully (${pingMs}ms latency)`);
    } else {
      console.log(`[WARN] Supabase REST API returned HTTP ${res.status}`);
      report.issues.push(`REST endpoint returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[FAIL] Connectivity failed:`, err.message);
    report.issues.push(`Network connectivity failed: ${err.message}`);
  }

  // 2. Table Verifications: trips, profiles, drivers, notifications
  const criticalTables = ['trips', 'profiles', 'drivers', 'notifications'];

  for (const table of criticalTables) {
    console.log(`\n--- Inspecting Table: "${table}" ---`);
    const tableStatus = {
      exists: false,
      canSelect: false,
      canInsert: false,
      canUpdate: false,
      canDelete: false,
      rowCount: 0,
      columns: [],
      error: null
    };

    // A. SELECT test
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        tableStatus.error = error.message;
        console.log(`[FAIL] SELECT on "${table}":`, error.message);
        report.issues.push(`Table "${table}" SELECT error: ${error.message}`);
      } else {
        tableStatus.exists = true;
        tableStatus.canSelect = true;
        tableStatus.rowCount = count || (data ? data.length : 0);
        if (data && data.length > 0) {
          tableStatus.columns = Object.keys(data[0]);
        }
        console.log(`[PASS] SELECT on "${table}": OK (${tableStatus.rowCount} existing records)`);
        if (tableStatus.columns.length > 0) {
          console.log(`       Columns detected from sample row:`, tableStatus.columns.join(', '));
        }
      }
    } catch (e) {
      console.error(`[FAIL] SELECT exception on "${table}":`, e.message);
      tableStatus.error = e.message;
    }

    // B. CRUD & RLS test with dummy record
    if (tableStatus.exists) {
      const testId = `diag_test_${Date.now()}`;
      let dummyPayload = {};

      if (table === 'trips') {
        dummyPayload = {
          id: testId,
          user_id: 'test_user_diag',
          driver_id: null,
          pickup: 'Diagnostic Pickup Loc',
          drop_loc: 'Diagnostic Drop Loc',
          fare: 500,
          advance: 150,
          status: 'pending',
          created_at: new Date().toISOString()
        };
      } else if (table === 'profiles') {
        dummyPayload = {
          id: testId,
          name: 'Diagnostic Test User',
          phone: '+919999999999',
          wallet_balance: 100,
          created_at: new Date().toISOString()
        };
      } else if (table === 'drivers') {
        dummyPayload = {
          id: testId,
          name: 'Diagnostic Test Driver',
          phone: '+918888888888',
          status: 'approved',
          online: false,
          created_at: new Date().toISOString()
        };
      } else if (table === 'notifications') {
        dummyPayload = {
          id: testId,
          title: 'Diagnostic Test Notification',
          message: 'System test message',
          created_at: new Date().toISOString()
        };
      }

      // Test INSERT
      const { error: insErr } = await supabase.from(table).insert(dummyPayload);
      if (insErr) {
        console.log(`[WARN] INSERT on "${table}":`, insErr.message);
        report.issues.push(`RLS or Column error on INSERT "${table}": ${insErr.message}`);
      } else {
        tableStatus.canInsert = true;
        console.log(`[PASS] INSERT on "${table}": OK (RLS allows anon writes)`);

        // Test UPDATE
        const { error: updErr } = await supabase
          .from(table)
          .update({ updated_at: new Date().toISOString() })
          .eq('id', testId);
        
        if (updErr) {
          // If updated_at column doesn't exist, try updating title or name
          const altUpdate = table === 'notifications' ? { title: 'Updated Diag' } : { status: 'testing' };
          const { error: updErr2 } = await supabase.from(table).update(altUpdate).eq('id', testId);
          if (updErr2) {
            console.log(`[WARN] UPDATE on "${table}":`, updErr2.message);
            report.issues.push(`RLS or Column error on UPDATE "${table}": ${updErr2.message}`);
          } else {
            tableStatus.canUpdate = true;
            console.log(`[PASS] UPDATE on "${table}": OK`);
          }
        } else {
          tableStatus.canUpdate = true;
          console.log(`[PASS] UPDATE on "${table}": OK`);
        }

        // Test DELETE (clean up dummy)
        const { error: delErr } = await supabase.from(table).delete().eq('id', testId);
        if (delErr) {
          console.log(`[WARN] DELETE on "${table}":`, delErr.message);
          report.issues.push(`RLS error on DELETE "${table}": ${delErr.message}`);
        } else {
          tableStatus.canDelete = true;
          console.log(`[PASS] DELETE on "${table}": Cleaned up test record successfully`);
        }
      }
    }

    report.tables[table] = tableStatus;
  }

  // 3. Test Realtime WebSocket Channel
  console.log('\n--- Testing Supabase Realtime WebSocket ---');
  try {
    const channel = supabase.channel('diag_channel_' + Date.now(), {
      config: { broadcast: { ack: true } }
    });

    const subPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ status: 'TIMEOUT' });
      }, 7000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve({ status: 'SUBSCRIBED' });
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          resolve({ status: 'CHANNEL_ERROR' });
        }
      });
    });

    const result = await subPromise;
    if (result.status === 'SUBSCRIBED') {
      report.realtime = true;
      console.log('[PASS] Realtime WebSocket connected and SUBSCRIBED successfully');
    } else {
      console.log(`[WARN] Realtime connection state: ${result.status}`);
      report.issues.push(`Realtime subscription returned: ${result.status}`);
    }
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('[FAIL] Realtime test failed:', err.message);
    report.issues.push(`Realtime error: ${err.message}`);
  }

  // 4. Test Storage Buckets
  console.log('\n--- Inspecting Supabase Storage Buckets ---');
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.log('[WARN] Storage listBuckets error:', bError.message);
      report.issues.push(`Storage buckets query error: ${bError.message}`);
    } else {
      console.log(`[PASS] Found ${buckets?.length || 0} Storage Buckets:`);
      (buckets || []).forEach(b => {
        console.log(`       - "${b.name}" (Public: ${b.public})`);
      });
    }
  } catch (err) {
    console.log('[WARN] Storage check failed:', err.message);
  }

  console.log('\n====================================================');
  console.log(' DIAGNOSTIC SUMMARY');
  console.log('====================================================');
  console.log('Total issues found:', report.issues.length);
  if (report.issues.length > 0) {
    report.issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));
  } else {
    console.log('All core databases and services are 100% operational!');
  }
}

runDiagnostics().catch(console.error);
