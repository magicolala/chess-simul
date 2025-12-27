// scripts/test-supabase.mjs
import { SupabaseClientService } from '../apps/web/src/services/supabase-client.service.js';
import { SupabaseSimulService } from '../apps/web/src/services/supabase-simul.service.js';

// --- !!! IMPORTANT !!! ---
// Replace with your test user credentials
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password';

async function main() {
  console.log('--- Starting Supabase Test Script ---');

  // 1. Initialize Services
  // NOTE: This is a simplified manual instantiation for a script.
  // In a real Angular app, this is handled by dependency injection.
  const supabaseClientService = new SupabaseClientService();
  const supabaseSimulService = new SupabaseSimulService(supabaseClientService);

  // 2. Authenticate
  console.log(`Attempting to sign in as ${TEST_USER_EMAIL}...`);
  const { data: authData, error: authError } = await supabaseClientService.signIn(TEST_USER_EMAIL, TEST_USER_PASSWORD);

  if (authError || !authData.session) {
    console.error('Authentication failed:', authError?.message || 'No session received.');
    console.log('Please check your test credentials and Supabase connection.');
    return;
  }

  const hostUser = authData.user;
  console.log(`Successfully signed in as ${hostUser.email}`);

  // 3. Run Test Scenario based on MANUAL_TESTS.md
  try {
    // === Test 1: Create Simul ===
    console.log('\n--- Test 1: Creating a new simul ---');
    const simulName = `Test Simul ${new Date().toLocaleTimeString()}`;
    const tablesCount = 3;
    const newSimul = await supabaseSimulService.createSimul(simulName, tablesCount);
    console.log(`Simul created successfully! ID: ${newSimul.id}, Name: ${newSimul.name}`);
    await supabaseSimulService.fetchSimul(newSimul.id);
    const activeSimul = supabaseSimulService.activeSimul();
    if (activeSimul.simul_tables.length !== tablesCount) {
        throw new Error(`Expected ${tablesCount} tables, but got ${activeSimul.simul_tables.length}`);
    }
    console.log('Simul creation and table count verified.');

    // === Test 2: Guest joins simul (requires a second user) ===
    // This part is more complex as it requires another user account.
    // For now, we will skip the join part in this automated script.
    console.log('\n--- Test 2: Joining simul (Skipped) ---');
    console.log('Skipping join test as it requires a second authenticated user.');


    // === Test 3: Host starts a table (as a placeholder for starting a game) ===
    // This test would require a table to be in a 'reserved' state, which we skipped.
    // We will call fetchTableGame just to see if we can get a table.
    console.log('\n--- Test 3: Starting a game (Skipped, but fetching table) ---');
    const firstTable = activeSimul.simul_tables[0];
    if (firstTable) {
        console.log(`Fetching game for table ${firstTable.id}...`);
        const game = await supabaseSimulService.fetchTableGame(firstTable.id);
        if (game) {
            console.log('Game found:', game);
        } else {
            console.log('No game found for this table, which is expected as it has not been started.');
        }
    } else {
        console.log('No tables found to test game start.');
    }


    console.log('\n--- All tests completed successfully! ---');
  } catch (e) {
    console.error('\n--- A test failed ---');
    console.error('Error:', e.message);
  } finally {
    // 4. Sign out
    console.log('\nSigning out...');
    await supabaseClientService.signOut();
    console.log('Signed out.');
  }

  console.log('\n--- Supabase Test Script Finished ---');
}

main().catch(console.error);
