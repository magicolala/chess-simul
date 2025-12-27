# Manual simul scenarios

1. **Create simul as host**
   - Authenticate as host user in Supabase Studio or via the Angular app.
   - Call the `create_simul` RPC with `{ p_host_id: <host_id>, p_name: 'Demo', p_tables_count: 3 }`.
   - Verify `simuls.status = 'open'` and three rows in `simul_tables` with status `free`.

2. **Guest joins an open seat**
   - Authenticate as a guest user and call `join_simul` with the simul ID.
   - Confirm a single `simul_tables` row switches to `reserved` with the guest ID. A second join attempt should return the same seat; extra guests should receive a `no seat available` error once all seats are reserved.

3. **Host starts a table**
   - As the host, call `start_simul_game` with the reserved table ID.
   - A `games` row is created with `status = 'waiting'`, `simul_tables.status` becomes `playing`, and the parent `simuls.status` updates to `running`.

4. **Angular flows**
   - Load `SimulJoinComponent` with a simul ID: button is enabled only when `simul.status === 'open'`; joining updates the reserved seat indicator.
   - Load `SimulLobbyComponent` with the same simul ID as the host: tables marked `reserved` show an enabled “Lancer la partie” button; clicking it triggers `start_simul_game` and surfaces backend errors.
   - Load `SimulBoardComponent` with a table ID: if a game exists it shows the game ID/status/FEN; otherwise it indicates the game has not been created.
